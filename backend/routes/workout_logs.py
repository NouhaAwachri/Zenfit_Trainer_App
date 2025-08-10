# backend/routes/workout_logs.py - FIXED VERSION

from flask import Blueprint, request, jsonify
from models.workoutLog_model import WorkoutLog, WorkoutExercise
from models.workout_program import WorkoutProgram
from services.llm_engine import LLMEngine
from models.db import db
from datetime import datetime, timedelta
import json, re
from services.agents.progress_monitoring import progress_monitoring_agent
from models.user_profile import UserProfile
from utils.json_parser import extract_json_from_response
from services.workout_parser import  parse_workout_text_enhanced

workout_logs_bp = Blueprint("workout_logs", __name__)
parser_bp = Blueprint("parser", __name__)

# Fallback structure if LLM fails
default_structure = {
    "weeks": [
        {
            "week": 1,
            "days": [
                {
                    "day": 1,
                    "label": "Full Body",
                    "exercises": [{"name": "Push Ups", "sets": 3, "reps": 10, "id": 1, "completed": False}]
                }
            ]
        }
    ]
}

# Initialize LLM Engine
llm = LLMEngine(provider="openrouter", model="deepseek")
def save_parsed_workout_to_db(parsed_data, program_id):
    try:
        for week_key, week_data in parsed_data.items():   # <-- iterate over Week 1, Week 2, ...
            # Extract week number from "Week 1"
            week_num = int(week_key.replace("Week ", ""))

            for day_key, day_data in week_data.items():
                day_num = int(day_key.replace("Day ", ""))
                day_label = day_data.get("label", f"Day {day_num}")

                for ex in day_data["exercises"]:
                    new_exercise = WorkoutExercise(
                        program_id=program_id,
                        week=week_num,
                        day=day_num,
                        day_label=day_label,
                        name=ex["name"],
                        sets=ex.get("sets"),
                        reps=ex.get("reps"),
                        rest_seconds=ex.get("rest_seconds"),
                        completed=False
                    )
                    db.session.add(new_exercise)

        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        print(f"Error saving workout to DB: {e}")
        return False


def parse_program_text_to_structure(program_text, program_id):
    """
    Parse program text and return structured data compatible with frontend
    """
    try:
        # First, try to parse as existing JSON
        try:
            existing_data = json.loads(program_text)
            # If it's already structured, transform it to match frontend expectations
            return transform_to_frontend_structure(existing_data, program_id)
        except json.JSONDecodeError:
            pass
        
        # Use LLM to parse text into structured format
        prompt = f"""
        Extract structured workout plan from this text. Return ONLY valid JSON with this exact format:
        {{
          "weeks": [
            {{
              "week": 1,
              "days": [
                {{
                  "day": 1,
                  "label": "Push Day",
                  "exercises": [
                    {{"name": "Bench Press", "sets": 3, "reps": 10, "rest_seconds": 60}},
                    {{"name": "Shoulder Press", "sets": 3, "reps": 8, "rest_seconds": 90}}
                  ]
                }}
              ]
            }}
          ]
        }}
        
        Text to parse:
        {program_text}
        
        Return only the JSON, no explanations.
        """
        
        llm_response = llm.invoke(prompt)
        parsed_data = extract_json_from_response(llm_response)
        return transform_to_frontend_structure(parsed_data, program_id)
        
    except Exception as e:
        print(f"❌ Error parsing program text: {str(e)}")
        return transform_to_frontend_structure(default_structure, program_id)

def transform_to_frontend_structure(data, program_id):
    """
    Transform parsed data to match frontend expectations
    """
    try:
        result = {}
        
        for week_data in data.get("weeks", []):
            week_num = week_data.get("week", 1)
            week_key = f"Week {week_num}"
            result[week_key] = {}
            
            for day_data in week_data.get("days", []):
                day_num = day_data.get("day", 1)
                day_key = f"Day {day_num}"
                
                # Add unique IDs and completion status to exercises
                exercises = []
                for idx, exercise in enumerate(day_data.get("exercises", [])):
                    exercise_with_meta = {
                        "id": f"{program_id}_{week_num}_{day_num}_{idx}",
                        "name": exercise.get("name", "Unknown Exercise"),
                        "sets": exercise.get("sets", 3),
                        "reps": exercise.get("reps", 10),
                        "rest_seconds": exercise.get("rest_seconds", 60),
                        "completed": exercise.get("completed", False),
                        "notes": exercise.get("notes", "")
                    }
                    exercises.append(exercise_with_meta)
                
                result[week_key][day_key] = {
                    "label": day_data.get("label", f"Day {day_num}"),
                    "exercises": exercises
                }
        
        return result
        
    except Exception as e:
        print(f"❌ Error transforming structure: {str(e)}")
        # Return a safe fallback
        return {
            "Week 1": {
                "Day 1": {
                    "label": "Full Body",
                    "exercises": [{
                        "id": f"{program_id}_1_1_0",
                        "name": "Push Ups",
                        "sets": 3,
                        "reps": 10,
                        "rest_seconds": 60,
                        "completed": False,
                        "notes": ""
                    }]
                }
            }
        }

@workout_logs_bp.route("/workout/current/<user_id>", methods=["GET"])
def get_current_workout(user_id):
    try:
        print(f"🔍 Fetching workout for user: {user_id}")
        
        plan = WorkoutProgram.query.filter_by(user_id=user_id).order_by(WorkoutProgram.id.desc()).first()
        if not plan:
            print("❌ No workout plan found")
            return jsonify({"error": "No workout plan found"}), 404
        
        print(f"✅ Found plan: {plan.id}")
        
        # Parse the program text into structured format
        plan_data = parse_program_text_to_structure(plan.program_text, plan.id)
        
        # ✅ Save to DB if exercises table is empty
        if not WorkoutExercise.query.filter_by(program_id=plan.id).first():
            save_parsed_workout_to_db(plan_data, plan.id)

        # ✅ Pull real completion status from DB and merge
        db_exercises = WorkoutExercise.query.filter_by(program_id=plan.id).order_by(
            WorkoutExercise.week, WorkoutExercise.day, WorkoutExercise.id
        ).all()

        # Create a lookup: (week, day, index_in_day) -> completed
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
            week_num = int(week_key.replace("Week ", ""))
            for day_key, day_data in week_data.items():
                day_num = int(day_key.replace("Day ", ""))
                for idx, exercise in enumerate(day_data.get("exercises", [])):
                    exercise["completed"] = completed_lookup.get((week_num, day_num, idx), False)

        # Calculate progress based on merged data
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
        
        response_data = {
            "user_id": plan.user_id,
            "program_id": plan.id,
            "program_name": getattr(plan, "name", "Workout Plan"),
            "plan": plan_data,
            "completion_percentage": round(completion_percentage, 1)
        }
        
        print(f"✅ Returning data: {json.dumps(response_data, indent=2)[:500]}...")
        return jsonify(response_data), 200

    except Exception as e:
        print(f"❌ Error in get_current_workout: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# AI Parsing endpoint
@parser_bp.route('/parse-workout-text', methods=['POST', 'OPTIONS'])
def parse_program_text_to_structure(program_text, program_id):
    """Use enhanced parser"""
    return parse_workout_text_enhanced(program_text, program_id, llm)

# Toggle Exercise Completion - FIXED
@workout_logs_bp.route('/workout/exercise/<exercise_id>/complete', methods=['POST'])
def toggle_exercise_completion(exercise_id):
    try:
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

        return jsonify({
            "success": True,
            "exercise_id": exercise_id,
            "completed": completed,
            "completed_at": datetime.utcnow().isoformat() if completed else None
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"❌ Error toggling exercise: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Rest of your existing routes remain the same...
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

        return jsonify({
            "success": True,
            "log_id": workout_log.id,
            "message": f"Week {week}, Day {day} workout completed!"
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# Keep all your other existing routes...
@workout_logs_bp.route('/workout/logs/<user_id>', methods=['GET'])
def get_user_workout_logs(user_id):
    try:
        filter_period = request.args.get('filter', 'all')
        query = WorkoutLog.query.filter_by(user_id=user_id)

        if filter_period == 'week':
            query = query.filter(WorkoutLog.date >= datetime.utcnow() - timedelta(days=7))
            
        elif filter_period == 'month':
            query = query.filter(WorkoutLog.date >= datetime.utcnow() - timedelta(days=30))

        logs = query.order_by(WorkoutLog.date.desc()).all()

        result = []
        for log in logs:
            exercises = json.loads(log.exercises or "[]")
            result.append({
                "id": log.id,
                "date": log.date.isoformat(),
                "workoutType": f"Week {log.week}, Day {log.day}",
                "week": log.week,
                "day": log.day,
                "duration": log.duration,
                "notes": log.notes or "",
                "exercises": exercises,
                "completed_exercises": len([ex for ex in exercises if ex.get('completed')]),
                "total_exercises": len(exercises)
            })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Progress endpoint
def get_user_profile_by_uid(firebase_uid):
    return db.session.query(UserProfile).filter_by(firebase_uid=firebase_uid).first()

@workout_logs_bp.route('/workout/progress/<uid>', methods=['GET'])
def get_progress(uid):
    try:
        # Fetch user profile
        user_profile = get_user_profile_by_uid(uid)
        if not user_profile:
            return jsonify({'error': 'User not found'}), 404

        # --- 1) CALCULATE REAL DB STATS ---
        # Get all exercises for the latest program
        program = WorkoutProgram.query.filter_by(user_id=uid).order_by(WorkoutProgram.id.desc()).first()
        if not program:
            return jsonify({'error': 'No workout program found'}), 404

        exercises = WorkoutExercise.query.filter_by(program_id=program.id).all()
        total_exercises = len(exercises)
        completed_exercises = sum(1 for e in exercises if e.completed)
        completion_percentage = (completed_exercises / total_exercises) * 100 if total_exercises > 0 else 0

        # Count completed workout days from WorkoutLog
        completed_workouts = WorkoutLog.query.filter_by(user_id=uid).count()

        # Example streak calculation (replace with real logic if you have it)
        streak = 0
        last_date = None
        for log in WorkoutLog.query.filter_by(user_id=uid).order_by(WorkoutLog.date.desc()):
            if not last_date:
                streak = 1
            elif (last_date - log.date).days == 1:
                streak += 1
            else:
                break
            last_date = log.date

        # Total time invested
        total_time = sum(log.duration for log in WorkoutLog.query.filter_by(user_id=uid))

        # --- 2) RUN AI AGENT FOR EXTRA INSIGHTS ---
        user_data = {
            "firebase_uid": uid,
            "age": user_profile.age,
            "experience": user_profile.experience,
            "goal": user_profile.goal,
            "equipment": user_profile.equipment,
            "style": user_profile.style,
            "gender": user_profile.gender,
            "days_per_week": user_profile.days_per_week,
            "height": user_profile.height,
            "weight": user_profile.weight,
        }
        agent_result = progress_monitoring_agent(user_data, llm)

        # --- 3) COMBINE RESULTS ---
        return jsonify({
            "progress": {
                "completion_percentage": round(completion_percentage, 1),
                "total_workouts": completed_workouts,
                "current_streak": streak,
                "total_time": total_time,
                "ai_analysis": agent_result.get("adherence_report", {})
            }
        })

    except Exception as e:
        print("Progress Error:", str(e))
        return jsonify({'error': 'Internal server error'}), 500

# Health check
@workout_logs_bp.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "workout_logs"}), 200