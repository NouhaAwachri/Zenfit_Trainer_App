# services/handlers/generator_handler.py

from models.user_profile import UserProfile
from models.workout_program import WorkoutProgram
from services.coach import AIFitnessCoach
from models.db import db

coach = AIFitnessCoach()

def generate_workout(data):
    required_keys = ["firebase_uid", "gender", "age", "goal", "experience", "days_per_week", "equipment", "style"]
    missing_keys = [key for key in required_keys if key not in data]
    if missing_keys:
        return {"error": f"Missing fields: {', '.join(missing_keys)}"}, 400

    uid = data['firebase_uid']

    user_input = {
        "gender": data["gender"],
        "age": data["age"],
        "goal": data["goal"],
        "height": data.get("height", "N/A"),
        "weight": data.get("weight", "N/A"),
        "experience": data["experience"],
        "days_per_week": data["days_per_week"],
        "equipment": data["equipment"],
        "style": data["style"],
        "firebase_uid": uid
    }

    result = coach.run_initial(user_input)
    fitness_plan = result.get("fitness_plan")

    if not fitness_plan:
        return {"error": "Failed to generate workout plan."}, 500

    # Save or update profile
    profile = UserProfile.query.filter_by(firebase_uid=uid).first()
    if profile:
        for key, value in user_input.items():
            if hasattr(profile, key):
                setattr(profile, key, value)
    else:
        profile = UserProfile(**user_input)
        db.session.add(profile)

    # Save workout program
    new_program = WorkoutProgram(user_id=uid, program_text=fitness_plan)
    db.session.add(new_program)
    db.session.commit()

    return {"program": fitness_plan}, 200
