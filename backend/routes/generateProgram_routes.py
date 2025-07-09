# routes/generateProgram_routes.py

from flask import Blueprint, request, jsonify
from dotenv import load_dotenv
from models.db import db
from models.user_profile import UserProfile
from models.workout_program import WorkoutProgram
from services.coach import AIFitnessCoach

load_dotenv()
generate_bp = Blueprint('generate', __name__)

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

    # 🧠 1. Generate personalized plan using DeepSeek + RAG
    coach = AIFitnessCoach()
    user_input = {
    "goal": data["goal"],
    "experience_level": data["experience"],
    "days_per_week": data["days_per_week"],
    "equipment": data["equipment"],
    "style": data["style"],
    "constraints": data.get("constraints", ""),
    "gender": data["gender"],
    "age": data["age"],
    "firebase_uid": data["firebase_uid"]
}
    messages = coach.run(user_input)

    # Extract the generated plan from the last AI message
    fitness_plan = ""
    for msg in reversed(messages):
        if hasattr(msg, "type") and msg.type == "ai" and not msg.content.strip().startswith("```json"):
            fitness_plan = msg.content.strip()
            break

    if not fitness_plan:
        return jsonify({"error": "Failed to generate workout plan."}), 500

    # 📝 2. Save or update user profile
    profile = UserProfile.query.filter_by(firebase_uid=uid).first()
    if profile:
        profile.gender = data['gender']
        profile.age = data['age']
        profile.goal = data['goal']
        profile.experience = data['experience']
        profile.days_per_week = data['days_per_week']
        profile.equipment = data['equipment']
        profile.style = data['style']
    else:
        profile = UserProfile(
            firebase_uid=uid,
            gender=data['gender'],
            age=data['age'],
            goal=data['goal'],
            experience=data['experience'],
            days_per_week=data['days_per_week'],
            equipment=data['equipment'],
            style=data['style'],
        )
        db.session.add(profile)

    # 💾 3. Save generated workout program
    new_program = WorkoutProgram(
        user_id=uid,
        program_text=fitness_plan
    )
    db.session.add(new_program)

    # ✅ Commit changes
    db.session.commit()

    return jsonify({"program": fitness_plan}), 200
