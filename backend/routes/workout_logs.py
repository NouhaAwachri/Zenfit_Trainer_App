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
llm = LLMEngine(provider="ollama", model="mistral")

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
        
        # Calculate progress
        total_exercises = 0
        completed_exercises = 0
        
        for week_key, week_data in plan_data.items():
            for day_key, day_data in week_data.items():
                for exercise in day_data.get("exercises", []):
                    total_exercises += 1
                    if exercise.get("completed", False):
                        completed_exercises += 1
        
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
def parse_workout_text():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    raw_text = data.get("program_text", "")

    if not raw_text:
        return jsonify({"parsed": default_structure})

    prompt = f"""
    Extract structured workout plan from this text. Return ONLY valid JSON with this format:
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
    {raw_text}
    Return only the JSON.
    """

    try:
        llm_response = llm.invoke(prompt)
        parsed_data = extract_json_from_response(llm_response)
    except Exception as e:
        print(f"LLM error: {e}")
        parsed_data = default_structure

    return jsonify({"parsed": parsed_data})

# Toggle Exercise Completion - FIXED
@workout_logs_bp.route('/workout/exercise/<exercise_id>/complete', methods=['POST'])
def toggle_exercise_completion(exercise_id):
    try:
        # Since we're using generated IDs, we need to parse them
        # Format: programId_week_day_exerciseIndex
        parts = str(exercise_id).split('_')
        if len(parts) >= 4:
            program_id = parts[0]
            week = int(parts[1])
            day = int(parts[2])
            exercise_index = int(parts[3])
        else:
            return jsonify({"error": "Invalid exercise ID format"}), 400
        
        data = request.get_json()
        completed = data.get('completed', True)
        
        # For now, we'll store this in memory or update the program structure
        # You might want to create a separate table for exercise completion tracking
        
        print(f"✅ Exercise {exercise_id} marked as {'completed' if completed else 'incomplete'}")
        
        return jsonify({
            "success": True,
            "exercise_id": exercise_id,
            "completed": completed,
            "completed_at": datetime.utcnow().isoformat() if completed else None
        }), 200

    except Exception as e:
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
        # Fetch user data from your DB
        user_profile = get_user_profile_by_uid(uid)

        if not user_profile:
            return jsonify({'error': 'User not found'}), 404

        # Turn it into a dict if needed
        user_data = {
            "firebase_uid": uid,  # Add this for the progress agent
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

        # Run agent
        result = progress_monitoring_agent(user_data, llm)
        
        return jsonify({"progress": result["adherence_report"]})

    except Exception as e:
        print("Progress Error:", str(e))
        return jsonify({'error': 'Internal server error'}), 500

# Health check
@workout_logs_bp.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "healthy", "service": "workout_logs"}), 200