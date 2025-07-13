# services/handlers/check_handler.py

from models.workout_program import WorkoutProgram

def check_existing_program(data):
    uid = data.get("firebase_uid")
    if not uid:
        return {"error": "Missing firebase_uid"}, 400

    existing = WorkoutProgram.query.filter_by(user_id=uid).order_by(WorkoutProgram.id.desc()).first()

    if existing:
        return {
            "exists": True,
            "latest_program": existing.program_text
        }, 200

    return {"exists": False}, 200
