# backend/routes/workout_logs.py - ENHANCED WITH AUTO WEEK GENERATION

from flask import Blueprint, app, request, jsonify
from models.workoutLog_model import WorkoutLog, WorkoutExercise
from models.workout_program import WorkoutProgram
from services.llm_engine import LLMEngine
from models.db import db
from datetime import datetime, timedelta
from sqlalchemy import desc
import json, re
from services.agents.progress_monitoring import progress_monitoring_agent
from models.user_profile import UserProfile
from utils.json_parser import extract_json_from_response
from services.workout_parser import parse_workout_text_enhanced
from services.workout_parser_enhanced import parse_crossfit_workout_text

workout_logs_bp = Blueprint("workout_logs", __name__)
parser_bp = Blueprint("parser", __name__)

# Initialize LLM Engine
llm = LLMEngine(provider="ollama", model="qwen2.5:3b-instruct", timeout=180)

def get_latest_active_workout(user_id):
    """Get the user's most recent workout program"""
    try:
        print(f"🔍 Looking for latest workout for user: {user_id}")
        
        # Try using created_at first (if it exists)
        try:
            latest_plan = (
                WorkoutProgram.query
                .filter_by(user_id=user_id)
                .order_by(desc(WorkoutProgram.created_at))
                .first()
            )
            if latest_plan:
                print(f"✅ Found plan by created_at: {latest_plan.id}")
                return latest_plan
        except Exception as e:
            print(f"⚠️ created_at field not available: {str(e)}")
        
        # Fallback to ID (most recent ID = most recent program)
        latest_plan = (
            WorkoutProgram.query
            .filter_by(user_id=user_id)
            .order_by(desc(WorkoutProgram.id))
            .first()
        )
        if latest_plan:
            print(f"✅ Found plan by ID: {latest_plan.id}")
            return latest_plan
            
        print("❌ No workout program found")
        return None
        
    except Exception as e:
        print(f"❌ Error getting latest workout: {str(e)}")
        return None

def save_parsed_workout_to_db(parsed_data, program_id):
    """Save parsed workout data to WorkoutExercise table"""
    try:
        print(f"💾 Saving workout data for program {program_id}")
        print(f"📊 Data structure: {type(parsed_data)}")
        
        # Clear existing exercises for this program to avoid duplicates
        existing_exercises = WorkoutExercise.query.filter_by(program_id=program_id).all()
        for exercise in existing_exercises:
            db.session.delete(exercise)
        
        saved_count = 0
        
        # Handle the frontend structure: {"Week 1": {"Day 1": {...}}}
        for week_key, week_data in parsed_data.items():
            if not week_key.startswith("Week "):
                continue
                
            try:
                week_num = int(week_key.replace("Week ", ""))
            except ValueError:
                print(f"⚠️ Invalid week key: {week_key}")
                continue

            for day_key, day_data in week_data.items():
                if not day_key.startswith("Day "):
                    continue
                    
                try:
                    day_num = int(day_key.replace("Day ", ""))
                except ValueError:
                    print(f"⚠️ Invalid day key: {day_key}")
                    continue
                
                day_label = day_data.get("label", f"Day {day_num}")
                exercises = day_data.get("exercises", [])
                
                print(f"📝 Processing Week {week_num}, Day {day_num}: {len(exercises)} exercises")
                
                for exercise in exercises:
                    try:
                        new_exercise = WorkoutExercise(
                            program_id=program_id,
                            week=week_num,
                            day=day_num,
                            day_label=day_label,
                            name=exercise.get("name", "Unknown Exercise"),
                            sets=exercise.get("sets", 3),
                            reps=exercise.get("reps", 10),
                            rest_seconds=exercise.get("rest_seconds", 60),
                            completed=False
                        )
                        db.session.add(new_exercise)
                        saved_count += 1
                        print(f"✅ Added exercise: {new_exercise.name} ({new_exercise.sets}x{new_exercise.reps})")
                        
                    except Exception as ex_error:
                        print(f"❌ Error adding exercise {exercise.get('name', 'Unknown')}: {ex_error}")
                        continue

        db.session.commit()
        print(f"✅ Successfully saved {saved_count} exercises to database")
        return True
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error saving workout to DB: {e}")
        import traceback
        traceback.print_exc()
        return False

def merge_completion_status(plan_data, program_id):
    """Merge completion status from database into plan data"""
    try:
        # Get all exercises for this program from DB
        db_exercises = WorkoutExercise.query.filter_by(program_id=program_id).order_by(
            WorkoutExercise.week, WorkoutExercise.day, WorkoutExercise.id
        ).all()

        # Create a lookup: (week, day, exercise_index) -> completed
        completed_lookup = {}
        from collections import defaultdict
        grouped = defaultdict(list)
        
        for ex in db_exercises:
            grouped[(ex.week, ex.day)].append(ex)

        for (week, day), ex_list in grouped.items():
            for idx, ex in enumerate(ex_list):
                completed_lookup[(week, day, idx)] = ex.completed

        # Merge into plan_data
        for week_key, week_data in plan_data.items():
            try:
                week_num = int(week_key.replace("Week ", ""))
            except ValueError:
                continue
                
            for day_key, day_data in week_data.items():
                try:
                    day_num = int(day_key.replace("Day ", ""))
                except ValueError:
                    continue
                    
                exercises = day_data.get("exercises", [])
                for idx, exercise in enumerate(exercises):
                    exercise["completed"] = completed_lookup.get((week_num, day_num, idx), False)

        return plan_data
        
    except Exception as e:
        print(f"❌ Error merging completion status: {e}")
        return plan_data

# =============== NEW WEEK GENERATION FUNCTIONS ===============

def is_week_completed(program_id, week_number):
    """Check if all exercises in a specific week are completed"""
    try:
        week_exercises = WorkoutExercise.query.filter_by(
            program_id=program_id, 
            week=week_number
        ).all()
        
        if not week_exercises:
            print(f"❌ No exercises found for Week {week_number}")
            return False
        
        completed_exercises = [ex for ex in week_exercises if ex.completed]
        completion_rate = len(completed_exercises) / len(week_exercises)
        
        print(f"📊 Week {week_number}: {len(completed_exercises)}/{len(week_exercises)} completed ({completion_rate:.1%})")
        
        return completion_rate == 1.0  # 100% completion
        
    except Exception as e:
        print(f"❌ Error checking week completion: {e}")
        return False

def get_week_structure(program_id, week_number):
    """Get the structure of a specific week for cloning"""
    try:
        week_exercises = WorkoutExercise.query.filter_by(
            program_id=program_id, 
            week=week_number
        ).order_by(WorkoutExercise.day, WorkoutExercise.id).all()
        
        if not week_exercises:
            return None
        
        # Group by day
        from collections import defaultdict
        week_structure = defaultdict(list)
        
        for exercise in week_exercises:
            week_structure[exercise.day].append({
                "name": exercise.name,
                "sets": exercise.sets,
                "reps": exercise.reps,
                "rest_seconds": exercise.rest_seconds,
                "day_label": exercise.day_label
            })
        
        return dict(week_structure)
        
    except Exception as e:
        print(f"❌ Error getting week structure: {e}")
        return None

def apply_progression_logic(exercise_data, week_number):
    """Apply progression logic to exercises for the new week"""
    try:
        # Clone the exercise data
        new_exercise = exercise_data.copy()
        
        # Progressive overload logic
        progression_factor = (week_number - 1) * 0.1  # 10% increase per week
        
        # Increase reps slightly (1-2 reps per week)
        if isinstance(new_exercise["reps"], (int, str)):
            try:
                current_reps = int(new_exercise["reps"])
                # Add 1-2 reps every 2 weeks
                additional_reps = max(1, (week_number - 1) // 2)
                new_exercise["reps"] = current_reps + additional_reps
            except ValueError:
                pass  # Keep original reps if not numeric
        
        # Optionally increase sets after week 3
        if week_number > 3 and isinstance(new_exercise["sets"], (int, str)):
            try:
                current_sets = int(new_exercise["sets"])
                if current_sets < 5:  # Cap at 5 sets
                    new_exercise["sets"] = current_sets + ((week_number - 1) // 3)
            except ValueError:
                pass
        
        # Reduce rest time slightly for conditioning
        if new_exercise["rest_seconds"] > 30:
            rest_reduction = min(10, (week_number - 1) * 5)  # Reduce by 5s per week, max 10s
            new_exercise["rest_seconds"] = max(30, new_exercise["rest_seconds"] - rest_reduction)
        
        print(f"📈 Applied progression: {new_exercise['name']} -> {new_exercise['sets']}x{new_exercise['reps']} (rest: {new_exercise['rest_seconds']}s)")
        
        return new_exercise
        
    except Exception as e:
        print(f"❌ Error applying progression: {e}")
        return exercise_data

def generate_next_week(program_id, new_week_number, base_week_number=None):
    """Generate the next week based on a previous week structure"""
    try:
        print(f"🏗️ Generating Week {new_week_number} for program {program_id}")
        
        # Determine base week (default to week 1 or previous week)
        if base_week_number is None:
            base_week_number = max(1, new_week_number - 1)
        
        # Check if the new week already exists
        existing_week = WorkoutExercise.query.filter_by(
            program_id=program_id, 
            week=new_week_number
        ).first()
        
        if existing_week:
            print(f"⚠️ Week {new_week_number} already exists, skipping generation")
            return False
        
        # Get the structure from the base week
        base_week_structure = get_week_structure(program_id, base_week_number)
        
        if not base_week_structure:
            print(f"❌ Could not get base week {base_week_number} structure")
            return False
        
        print(f"📋 Base week {base_week_number} has {len(base_week_structure)} days")
        
        # Generate new week with progression
        new_exercises_count = 0
        
        for day_number, day_exercises in base_week_structure.items():
            for exercise_data in day_exercises:
                # Apply progression
                progressed_exercise = apply_progression_logic(exercise_data, new_week_number)
                
                # Create new exercise entry
                new_exercise = WorkoutExercise(
                    program_id=program_id,
                    week=new_week_number,
                    day=day_number,
                    day_label=progressed_exercise["day_label"],
                    name=progressed_exercise["name"],
                    sets=progressed_exercise["sets"],
                    reps=progressed_exercise["reps"],
                    rest_seconds=progressed_exercise["rest_seconds"],
                    completed=False
                )
                
                db.session.add(new_exercise)
                new_exercises_count += 1
        
        db.session.commit()
        print(f"✅ Generated Week {new_week_number} with {new_exercises_count} exercises")
        
        return True
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error generating Week {new_week_number}: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_and_auto_generate_weeks(program_id):
    """Check for completed weeks and auto-generate next weeks"""
    try:
        print(f"🔍 Checking for auto-generation opportunities for program {program_id}")
        
        # Get all existing weeks for this program
        existing_weeks = db.session.query(WorkoutExercise.week).filter_by(
            program_id=program_id
        ).distinct().order_by(WorkoutExercise.week).all()
        
        existing_week_numbers = [w[0] for w in existing_weeks]
        
        if not existing_week_numbers:
            print("❌ No weeks found for auto-generation")
            return False
        
        print(f"📊 Existing weeks: {existing_week_numbers}")
        
        # Check each week for completion and generate next if needed
        weeks_generated = 0
        
        for week_num in existing_week_numbers:
            if is_week_completed(program_id, week_num):
                next_week = week_num + 1
                
                # Check if next week already exists
                next_week_exists = next_week in existing_week_numbers
                
                if not next_week_exists:
                    print(f"🚀 Week {week_num} completed, generating Week {next_week}")
                    
                    if generate_next_week(program_id, next_week, week_num):
                        weeks_generated += 1
                        existing_week_numbers.append(next_week)  # Update list for next iteration
                        print(f"✅ Week {next_week} auto-generated successfully")
                    else:
                        print(f"❌ Failed to generate Week {next_week}")
                else:
                    print(f"ℹ️ Week {week_num} completed, but Week {next_week} already exists")
        
        if weeks_generated > 0:
            print(f"🎉 Auto-generated {weeks_generated} new week(s)")
            return True
        else:
            print("ℹ️ No new weeks needed")
            return False
            
    except Exception as e:
        print(f"❌ Error in auto-generation check: {e}")
        return False

# =============== ENHANCED ROUTES ===============

@workout_logs_bp.route("/workout/current/<user_id>", methods=["GET"])
def get_current_workout(user_id):
    try:
        print(f"🔍 Fetching workout for user: {user_id}")
        
        # Get the most recent workout program
        plan = get_latest_active_workout(user_id)
        
        if not plan:
            print("❌ No workout plan found")
            return jsonify({"error": "No workout plan found"}), 404
        
        print(f"✅ Found plan: {plan.id}")
        
        # 🚀 NEW: Auto-generate weeks if needed
        check_and_auto_generate_weeks(plan.id)
        
        # Check if exercises are already in database
        existing_exercises = WorkoutExercise.query.filter_by(program_id=plan.id).first()
        
        if not existing_exercises:
            print("🔄 No exercises in DB, parsing program text...")
            
            # Parse the program text
            try:
                plan_data = parse_crossfit_workout_text(plan.program_text, plan.id, llm)
                print(f"✅ Enhanced parsing successful - found {len(plan_data)} weeks")
            except Exception as parsing_error:
                print(f"⚠️ Enhanced parsing failed: {parsing_error}")
                try:
                    plan_data = parse_workout_text_enhanced(plan.program_text, plan.id, llm)
                    print(f"✅ Standard parsing successful")
                except Exception as fallback_error:
                    print(f"❌ All parsing failed: {fallback_error}")
                    return jsonify({"error": f"Failed to parse workout: {fallback_error}"}), 500
            
            # Save parsed data to database
            if save_parsed_workout_to_db(plan_data, plan.id):
                print("✅ Successfully saved exercises to database")
            else:
                print("⚠️ Failed to save exercises, but continuing with parsed data")
        else:
            print("✅ Exercises already in DB, reconstructing from database...")
            
            # Reconstruct plan data from database
            db_exercises = WorkoutExercise.query.filter_by(program_id=plan.id).order_by(
                WorkoutExercise.week, WorkoutExercise.day, WorkoutExercise.id
            ).all()
            
            plan_data = {}
            
            from collections import defaultdict
            grouped = defaultdict(lambda: defaultdict(list))
            
            for ex in db_exercises:
                grouped[f"Week {ex.week}"][f"Day {ex.day}"].append({
                    "id": f"{plan.id}_{ex.week}_{ex.day}_{len(grouped[f'Week {ex.week}'][f'Day {ex.day}'])}",
                    "name": ex.name,
                    "sets": ex.sets,
                    "reps": ex.reps,
                    "rest_seconds": ex.rest_seconds,
                    "completed": ex.completed,
                    "notes": ""
                })
            
            for week_key, week_data in grouped.items():
                plan_data[week_key] = {}
                for day_key, exercises in week_data.items():
                    # Get day label from first exercise or create default
                    day_label = "Full Body"
                    if exercises:
                        first_ex = WorkoutExercise.query.filter_by(
                            program_id=plan.id, 
                            week=int(week_key.replace("Week ", "")), 
                            day=int(day_key.replace("Day ", ""))
                        ).first()
                        if first_ex and first_ex.day_label:
                            day_label = first_ex.day_label
                    
                    plan_data[week_key][day_key] = {
                        "label": day_label,
                        "exercises": exercises
                    }

        # Ensure completion status is up to date
        plan_data = merge_completion_status(plan_data, plan.id)

        # Calculate progress statistics
        total_exercises = sum(
            len(day_data.get("exercises", []))
            for week_data in plan_data.values()
            for day_data in week_data.values()
        )
        
        completed_exercises = sum(
            1
            for week_data in plan_data.values()
            for day_data in week_data.values()
            for exercise in day_data.get("exercises", [])
            if exercise.get("completed", False)
        )

        completion_percentage = (completed_exercises / total_exercises) * 100 if total_exercises > 0 else 0
        
        # Build response
        response_data = {
            "user_id": plan.user_id,
            "program_id": plan.id,
            "program_name": getattr(plan, "name", "Workout Plan"),
            "plan": plan_data,
            "completion_percentage": round(completion_percentage, 1),
            "is_latest": True,
            "total_exercises": total_exercises,
            "completed_exercises": completed_exercises,
            "total_days": sum(len(week_data) for week_data in plan_data.values()),
            "plan_version": int(datetime.utcnow().timestamp())  # 🚀 NEW: Version tracking
        }
        
        # Add created_at if it exists
        if hasattr(plan, 'created_at') and plan.created_at:
            response_data["created_at"] = plan.created_at.isoformat()
        
        print(f"✅ Returning workout data: {total_exercises} exercises, {completion_percentage:.1f}% complete")
        return jsonify(response_data), 200

    except Exception as e:
        print(f"❌ Error in get_current_workout: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# 🚀 NEW ROUTE: Manual Week Generation
@workout_logs_bp.route("/workout/generate-next-week", methods=["POST"])
def generate_next_week_route():
    """Manually generate the next week for a user's workout program"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        week_number = data.get('week_number')
        base_week_number = data.get('base_week_number')
        
        if not all([user_id, week_number]):
            return jsonify({"error": "Missing required fields: user_id, week_number"}), 400
        
        # Get the user's current program
        program = get_latest_active_workout(user_id)
        if not program:
            return jsonify({"error": "No workout program found for user"}), 404
        
        # Generate the week
        success = generate_next_week(program.id, week_number, base_week_number)
        
        if success:
            # Get the generated week data
            week_structure = get_week_structure(program.id, week_number)
            
            return jsonify({
                "success": True,
                "week_number": week_number,
                "week_data": week_structure,
                "message": f"Week {week_number} generated successfully"
            }), 200
        else:
            return jsonify({
                "success": False,
                "error": f"Failed to generate Week {week_number}"
            }), 500
    
    except Exception as e:
        print(f"❌ Error in generate_next_week_route: {str(e)}")
        return jsonify({"error": str(e)}), 500

@workout_logs_bp.route("/workout/create-from-conversation", methods=["POST"])
def create_workout_from_conversation():
    """Called when AI chatbot generates a new workout program"""
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        program_text = data.get('program_text')
        program_name = data.get('program_name', 'AI Generated Workout')
        
        if not all([user_id, program_text]):
            return jsonify({"error": "Missing required fields"}), 400
        
        # Create new program
        new_program_data = {
            'user_id': user_id,
            'program_text': program_text
        }
        
        # Add optional fields if supported
        if hasattr(WorkoutProgram, 'name'):
            new_program_data['name'] = program_name
        
        if hasattr(WorkoutProgram, 'created_at'):
            new_program_data['created_at'] = datetime.utcnow()
        
        new_program = WorkoutProgram(**new_program_data)
        db.session.add(new_program)
        db.session.commit()
        
        print(f"✅ Created new workout program: {new_program.id}")
        
        # Immediately parse and save exercises
        try:
            plan_data = parse_crossfit_workout_text(program_text, new_program.id, llm)
            if save_parsed_workout_to_db(plan_data, new_program.id):
                print(f"✅ Exercises saved for new program {new_program.id}")
        except Exception as parse_error:
            print(f"⚠️ Failed to parse new program exercises: {parse_error}")
        
        return jsonify({
            "success": True,
            "program_id": new_program.id,
            "message": "New workout program created from conversation"
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error creating workout from conversation: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Toggle Exercise Completion (Enhanced with auto-generation trigger)
@workout_logs_bp.route('/workout/exercise/<exercise_id>/complete', methods=['POST'])
def toggle_exercise_completion(exercise_id):
    try:
        print(f"🔄 Toggling exercise completion: {exercise_id}")
        
        # Parse exercise ID format: program_id_week_day_index
        parts = str(exercise_id).split('_')
        if len(parts) != 4:
            return jsonify({"error": "Invalid exercise ID format"}), 400

        program_id = int(parts[0])
        week = int(parts[1])
        day = int(parts[2])
        exercise_index = int(parts[3])

        data = request.get_json()
        completed = data.get('completed', True)

        # Fetch the exercise from DB using index
        exercises = WorkoutExercise.query.filter_by(
            program_id=program_id, week=week, day=day
        ).order_by(WorkoutExercise.id).all()

        if exercise_index >= len(exercises):
            return jsonify({"error": "Exercise index out of range"}), 404

        exercise = exercises[exercise_index]
        exercise.completed = completed
        db.session.commit()

        print(f"✅ Exercise {exercise.name} marked as {'completed' if completed else 'incomplete'}")

        # 🚀 NEW: Check for week completion and auto-generate if needed
        if completed:
            print("🔍 Checking if week completion triggers auto-generation...")
            check_and_auto_generate_weeks(program_id)

        return jsonify({
            "success": True,
            "exercise_id": exercise_id,
            "completed": completed,
            "exercise_name": exercise.name,
            "completed_at": datetime.utcnow().isoformat() if completed else None
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error toggling exercise: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Rest of the routes remain the same...
@workout_logs_bp.route('/workout/day/complete', methods=['POST'])
def complete_workout_day():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        week = data.get('week')
        day = data.get('day')
        duration = data.get('duration', 0)
        notes = data.get('notes', '')
        exercises_data = data.get('exercises', [])

        if not all([user_id, week is not None, day is not None]):
            return jsonify({"error": "Missing required fields"}), 400

        program = WorkoutProgram.query.filter_by(user_id=user_id).order_by(WorkoutProgram.id.desc()).first()
        if not program:
            return jsonify({"error": "No workout program found"}), 404

        workout_log = WorkoutLog(
            user_id=user_id,
            program_id=program.id,
            week=week,
            day=day,
            date=datetime.utcnow().date(),
            duration=duration,
            notes=notes,
            exercises=json.dumps(exercises_data)
        )

        db.session.add(workout_log)
        db.session.commit()
        
        # Sync exercise completion flags
        try:
            day_exercises = WorkoutExercise.query.filter_by(
                program_id=program.id, week=week, day=day
            ).order_by(WorkoutExercise.id).all()

            for idx, ex in enumerate(day_exercises):
                submitted = exercises_data[idx] if idx < len(exercises_data) else {}
                ex.completed = bool(submitted.get('completed', False))

            db.session.commit()
            
            # 🚀 NEW: Check for auto-generation after completing a day
            print("🔍 Day completed, checking for auto-generation...")
            check_and_auto_generate_weeks(program.id)
            
        except Exception as sync_err:
            print(f"⚠️ Could not sync exercise completion flags: {sync_err}")

        return jsonify({
            "success": True,
            "log_id": workout_log.id,
            "message": f"Week {week}, Day {day} workout completed!"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# 🚀 NEW ROUTE: Get User Progress Stats
@workout_logs_bp.route("/workout/progress/<user_id>", methods=["GET"])
def get_workout_progress(user_id):
    """Get comprehensive workout progress statistics for a user"""
    try:
        print(f"📊 Fetching progress stats for user: {user_id}")
        
        # Get the user's current program
        program = get_latest_active_workout(user_id)
        if not program:
            return jsonify({"error": "No workout program found"}), 404
        
        # Get all exercises for this program
        all_exercises = WorkoutExercise.query.filter_by(program_id=program.id).all()
        
        if not all_exercises:
            return jsonify({
                "progress": {
                    "completion_percentage": 0,
                    "total_workouts": 0,
                    "current_streak": 0,
                    "total_time": 0,
                    "total_exercises": 0,
                    "completed_exercises": 0
                }
            }), 200
        
        # Calculate basic stats
        total_exercises = len(all_exercises)
        completed_exercises = len([ex for ex in all_exercises if ex.completed])
        completion_percentage = (completed_exercises / total_exercises) * 100 if total_exercises > 0 else 0
        
        # Get workout logs for this program
        workout_logs = WorkoutLog.query.filter_by(
            user_id=user_id, 
            program_id=program.id
        ).order_by(WorkoutLog.date.desc()).all()
        
        total_workouts_from_logs = len(workout_logs)
        total_time_from_logs = sum(log.duration for log in workout_logs if log.duration)  # in minutes
        
        # 🚀 NEW: Calculate "workouts" from completed exercises
        # Group completed exercises by day and count days with at least 1 completed exercise
        completed_exercise_days = set()
        for ex in all_exercises:
            if ex.completed:
                completed_exercise_days.add((ex.week, ex.day))
        
        workouts_from_exercises = len(completed_exercise_days)
        
        # Use the higher count between logs and exercise-based calculation
        total_workouts = max(total_workouts_from_logs, workouts_from_exercises)
        
        # 🚀 NEW: Estimate time from completed exercises if no logs
        estimated_time = 0
        if total_time_from_logs == 0 and completed_exercises > 0:
            # Estimate 2-3 minutes per exercise on average
            estimated_time = completed_exercises * 2.5  # 2.5 minutes per exercise
        
        total_time = max(total_time_from_logs, estimated_time)
        
        # Calculate current streak (consecutive days with workouts)
        current_streak = calculate_workout_streak_enhanced(workout_logs, all_exercises)
        
        # Get current week number
        current_week = get_current_week_number(program.id)
        
        progress_data = {
            "completion_percentage": round(completion_percentage, 1),
            "total_workouts": int(total_workouts),
            "current_streak": current_streak,
            "total_time": int(total_time),  # in minutes
            "total_exercises": total_exercises,
            "completed_exercises": completed_exercises,
            "current_week": current_week,
            "program_id": program.id,
            "workouts_from_logs": total_workouts_from_logs,
            "workouts_from_exercises": workouts_from_exercises
        }
        
        print(f"✅ Progress stats calculated: {progress_data}")
        
        return jsonify({"progress": progress_data}), 200
        
    except Exception as e:
        print(f"❌ Error getting progress stats: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

def calculate_workout_streak_enhanced(workout_logs, all_exercises):
    """Calculate streak considering both workout logs and completed exercises"""
    try:
        # Get unique dates with completed exercises
        completed_dates = set()
        
        # Add dates from workout logs
        for log in workout_logs:
            completed_dates.add(log.date)
        
        # Add estimated dates from completed exercises (assume recent completions)
        completed_exercise_count = len([ex for ex in all_exercises if ex.completed])
        if completed_exercise_count > 0 and len(workout_logs) == 0:
            # If no logs but exercises completed, assume they were done recently
            from datetime import datetime, timedelta
            today = datetime.utcnow().date()
            
            # Group exercises by day
            from collections import defaultdict
            exercises_by_day = defaultdict(list)
            for ex in all_exercises:
                if ex.completed:
                    exercises_by_day[(ex.week, ex.day)].append(ex)
            
            # Assume one day per unique (week, day) combination
            unique_days = len(exercises_by_day)
            for i in range(unique_days):
                completed_dates.add(today - timedelta(days=i))
        
        if not completed_dates:
            return 0
        
        # Calculate streak from most recent date
        sorted_dates = sorted(completed_dates, reverse=True)
        streak = 0
        current_date = datetime.utcnow().date()
        
        for date in sorted_dates:
            days_diff = (current_date - date).days
            
            if days_diff == streak or days_diff == streak + 1:
                streak += 1
            else:
                break
        
        return streak
        
    except Exception as e:
        print(f"❌ Error calculating enhanced streak: {e}")
        return 0
def calculate_workout_streak(workout_logs):
    """Calculate consecutive workout days streak"""
    try:
        if not workout_logs:
            return 0
        
        # Sort by date descending (most recent first)
        sorted_logs = sorted(workout_logs, key=lambda x: x.date, reverse=True)
        
        streak = 0
        current_date = datetime.utcnow().date()
        
        # Check if there's a workout today or yesterday (to account for different time zones)
        for log in sorted_logs:
            days_diff = (current_date - log.date).days
            
            if days_diff == streak:
                # Consecutive day
                streak += 1
            elif days_diff == streak + 1:
                # Allow for one day gap (rest day)
                continue
            else:
                # Gap too large, streak broken
                break
        
        return streak
        
    except Exception as e:
        print(f"❌ Error calculating streak: {e}")
        return 0

def get_current_week_number(program_id):
    """Get the current active week number for a program"""
    try:
        # Get all weeks for this program
        weeks = db.session.query(WorkoutExercise.week).filter_by(
            program_id=program_id
        ).distinct().order_by(WorkoutExercise.week).all()
        
        week_numbers = [w[0] for w in weeks]
        
        if not week_numbers:
            return 1
        
        # Find first incomplete week
        for week_num in week_numbers:
            if not is_week_completed(program_id, week_num):
                return week_num
        
        # All weeks completed, return next week
        return max(week_numbers) + 1
        
    except Exception as e:
        print(f"❌ Error getting current week: {e}")
        return 1

# ======== ACHIEVEMENTS (computed-only; no new tables) ========
from collections import Counter

# Frontend XP categories should remain:
# 'workout', 'consistency', 'milestone', 'streak', 'improvement', 'challenge'

def _dates_from_logs_sorted(logs):
    return sorted({l.date for l in logs if getattr(l, "date", None)})

def _longest_streak_consecutive_days(dates_sorted):
    if not dates_sorted:
        return 0
    best = cur = 1
    for i in range(1, len(dates_sorted)):
        if (dates_sorted[i] - dates_sorted[i-1]).days == 1:
            cur += 1
            best = max(best, cur)
        elif (dates_sorted[i] - dates_sorted[i-1]).days > 1:
            cur = 1
    return best

def _unique_completed_days(program_id):
    """Unique (week, day) pairs with any completed exercise (no dates there)."""
    exs = WorkoutExercise.query.filter_by(program_id=program_id).all()
    return {(ex.week, ex.day) for ex in exs if ex.completed}

def build_achievements(user_id, program_id):
    """
    Create achievements from WorkoutLog + WorkoutExercise.completed only.
    Returns [{title, description, category, icon, unlocked_at?, meta?}]
    """
    achievements = []
    def add(title, description, category, icon, unlocked_at=None, meta=None):
        achievements.append({
            "title": title,
            "description": description,
            "category": category,
            "icon": icon,
            "unlocked_at": unlocked_at,
            "meta": meta or {}
        })

    logs = WorkoutLog.query.filter_by(user_id=user_id, program_id=program_id)\
                           .order_by(WorkoutLog.date.asc()).all()
    dates_sorted = _dates_from_logs_sorted(logs)
    durations = [int(l.duration or 0) for l in logs]
    workouts_by_week = Counter([d.isocalendar()[:2] for d in dates_sorted])

    # Also consider completed exercise days (no true dates available)
    completed_pairs = _unique_completed_days(program_id)

    # ---- Milestones by total workouts (prefer logs, fallback to completed (week,day)) ----
    total_from_logs = len(dates_sorted)
    total_estimate = max(total_from_logs, len(completed_pairs))
    for t, label, icon in [(1,"First Workout","🎉"), (5,"5 Workouts","🏅"),
                           (10,"10 Workouts","🥈"), (25,"25 Workouts","🥇"),
                           (50,"50 Workouts","🏆")]:
        if total_estimate >= t:
            unlocked_at = dates_sorted[t-1].isoformat() if total_from_logs >= t else None
            add(label, f"You've completed {t} workout{'s' if t>1 else ''}!",
                "milestone", icon, unlocked_at=unlocked_at)

    # ---- Streaks (3, 7 days) from real log dates ----
    longest = _longest_streak_consecutive_days(dates_sorted)
    if longest >= 3:
        add("3-Day Streak", "Three days in a row—nice momentum!", "streak", "🔥",
            unlocked_at=(dates_sorted[2].isoformat() if len(dates_sorted) >= 3 else None))
    if longest >= 7:
        add("7-Day Streak", "A full week of consecutive workouts!", "streak", "⚡",
            unlocked_at=(dates_sorted[6].isoformat() if len(dates_sorted) >= 7 else None))

    # ---- Completed weeks (every exercise completed) ----
    weeks = db.session.query(WorkoutExercise.week).filter_by(program_id=program_id)\
            .distinct().order_by(WorkoutExercise.week).all()
    for w in [w[0] for w in weeks]:
        if is_week_completed(program_id, w):
            add(f"Week {w} Completed",
                "You finished every exercise for the week.",
                "milestone", "✅", meta={"week": w})

    # ---- Consistency: any ISO week with 3+ workouts ----
    if any(v >= 3 for v in workouts_by_week.values()):
        add("Consistent Week", "3+ workouts in one week—keep rolling!", "consistency", "📅")

    # ---- Endurance: long sessions ----
    if any(d >= 45 for d in durations):
        i = next((idx for idx, d in enumerate(durations) if d >= 45), None)
        add("Endurance I", "Completed a 45+ minute session.", "challenge", "⏳",
            unlocked_at=(logs[i].date.isoformat() if i is not None else None))
    if any(d >= 60 for d in durations):
        i = next((idx for idx, d in enumerate(durations) if d >= 60), None)
        add("Endurance II", "Completed a 60+ minute session.", "challenge", "⌛",
            unlocked_at=(logs[i].date.isoformat() if i is not None else None))

    # ---- Comeback: ≥7-day gap, then resume ----
    if len(dates_sorted) >= 2:
        for i in range(1, len(dates_sorted)):
            if (dates_sorted[i] - dates_sorted[i-1]).days >= 7:
                add("Comeback", "You paused for a week and came back stronger.",
                    "improvement", "💪", unlocked_at=dates_sorted[i].isoformat())
                break

    return achievements


@workout_logs_bp.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "workout_logs"}), 200
@workout_logs_bp.route("/update-streak", methods=["POST"])
def update_streak():
    data = request.json
    uid = data["uid"]
    streak = data["streak"]

    user = UserProfile.query.filter_by(firebase_uid=uid).first()
    if not user:
        return {"error": "User not found"}, 404

    user.streak = streak
    db.session.commit()
    return {"message": "Streak updated", "streak": streak}
