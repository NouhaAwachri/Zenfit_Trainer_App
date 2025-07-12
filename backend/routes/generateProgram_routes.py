# routes/generateProgram_routes.py

from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from models.db import db
from models.user_profile import UserProfile
from models.workout_program import WorkoutProgram
from services.coach import AIFitnessCoach

load_dotenv()
generate_bp = Blueprint('generate', __name__)
coach = AIFitnessCoach()


# 🧠 1. Initial plan generation
@generate_bp.route('/generate-workout', methods=['POST'])
def generate_program():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No input data provided"}), 400

    required_keys = ["firebase_uid", "gender", "age", "goal", "experience", "days_per_week", "equipment", "style"]
    missing_keys = [key for key in required_keys if key not in data]
    if missing_keys:
        return jsonify({"error": f"Missing fields: {', '.join(missing_keys)}"}), 400

    uid = data['firebase_uid']

    user_input = {
        "gender": data["gender"],
        "age": data["age"],
        "goal": data["goal"],
        "experience": data["experience"],
        "days_per_week": data["days_per_week"],
        "equipment": data["equipment"],
        "style": data["style"], 
        "firebase_uid": uid
    }

    messages = coach.run_initial(user_input)

        # Extract final plan
        # Only return the main workout content (not motivation/feedback)
    fitness_plan = next(
        (msg.content.strip() for msg in reversed(messages)
        if "Day" in msg.content or "Workout Plan" in msg.content or "Exercise" in msg.content),
        None
    )


    if not fitness_plan:
        return jsonify({"error": "Failed to generate workout plan."}), 500

    # Save or update user profile
    profile = UserProfile.query.filter_by(firebase_uid=uid).first()
    if profile:
        for key in user_input:
            if hasattr(profile, key):
                setattr(profile, key, user_input[key])
    else:
        profile = UserProfile(**user_input)
        db.session.add(profile)

    # Save new program
    new_program = WorkoutProgram(user_id=uid, program_text=fitness_plan)
    db.session.add(new_program)
    db.session.commit()

    return jsonify({"program": fitness_plan}), 200

# 🔁 2. Chat-based plan refinement
@generate_bp.route('/chat-follow-up', methods=['POST'])
def follow_up_program():
    data = request.get_json()
    uid = data.get("firebase_uid")
    feedback = data.get("feedback")

    if not uid or not feedback:
        return jsonify({"error": "Missing firebase_uid or feedback"}), 400

    last_program = WorkoutProgram.query.filter_by(user_id=uid).order_by(WorkoutProgram.id.desc()).first()
    if not last_program:
        return jsonify({"error": "No previous program found"}), 404

    messages = coach.run_followup(user_id=uid, current_plan=last_program.program_text, feedback=feedback)

    adjusted_plan = next(
        (msg.content.strip() for msg in reversed(messages)
         if hasattr(msg, "content") and isinstance(msg.content, str) and msg.content.strip()),
        None
    )

    if not adjusted_plan:
        return jsonify({"error": "Failed to adjust workout plan."}), 500

    # Save adjusted plan
    updated_program = WorkoutProgram(user_id=uid, program_text=adjusted_plan)
    db.session.add(updated_program)
    db.session.commit()

    return jsonify({"adjusted_program": adjusted_plan}), 200

@generate_bp.route('/check-existing', methods=['POST'])
def check_existing_program():
    uid = request.json.get("firebase_uid")
    existing = WorkoutProgram.query.filter_by(user_id=uid).order_by(WorkoutProgram.id.desc()).first()
    if existing:
        return jsonify({
            "exists": True,
            "latest_program": existing.program_text
        })
    return jsonify({"exists": False})
