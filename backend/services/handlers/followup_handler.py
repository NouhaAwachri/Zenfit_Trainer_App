# services/handlers/followup_handler.py

from models.workout_program import WorkoutProgram
from services.coach import AIFitnessCoach
from models.db import db
from models.conversation_model import Conversation, Message
coach = AIFitnessCoach()


def create_new_conversation(user_id, title="New Workout Plan"):
    conv = Conversation(user_id=user_id, title=title)
    db.session.add(conv)
    db.session.commit()
    return conv.id

def add_message(conversation_id, role, content):
    message = Message(conversation_id=conversation_id, role=role, content=content)
    db.session.add(message)
    db.session.commit()



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

      # 🔄 3. Save plan to WorkoutProgram
    updated_program = WorkoutProgram(user_id=uid, program_text=adjusted_plan)
    db.session.add(updated_program)
    db.session.commit()

    # 🗨️ 4. Save messages to chat history
    # ❗ You may later track conversation ID per user, or create one per session.
    conv_id = create_new_conversation(user_id=uid, title="Workout Plan Follow-up")

    add_message(conv_id, role="user", content=feedback)
    add_message(conv_id, role="ai", content=adjusted_plan)

    return {"adjusted_program": adjusted_plan}, 200
