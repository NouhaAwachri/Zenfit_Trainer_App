# services/handlers/followup_handler.py

from models.workout_program import WorkoutProgram
from services.coach import AIFitnessCoach
from models.db import db

coach = AIFitnessCoach()

def follow_up_workout(data):
    uid = data.get("firebase_uid")
    feedback = data.get("feedback")

    if not uid or not feedback:
        return {"error": "Missing firebase_uid or feedback"}, 400

    last_program = WorkoutProgram.query.filter_by(user_id=uid).order_by(WorkoutProgram.id.desc()).first()
    if not last_program:
        return {"error": "No previous program found"}, 404

    messages = coach.run_followup(user_id=uid, current_plan=last_program.program_text, feedback=feedback)

    adjusted_plan = next(
        (msg.content.strip() for msg in reversed(messages)
         if hasattr(msg, "content") and isinstance(msg.content, str) and msg.content.strip()),
        None
    )

    if not adjusted_plan:
        return {"error": "Failed to adjust workout plan."}, 500

    updated_program = WorkoutProgram(user_id=uid, program_text=adjusted_plan)
    db.session.add(updated_program)
    db.session.commit()

    return {"adjusted_program": adjusted_plan}, 200
