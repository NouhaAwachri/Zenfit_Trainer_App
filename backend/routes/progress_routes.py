# progress_routes.py
from flask import Blueprint, request, jsonify
from services.coach import AIFitnessCoach  # ✅ Use your coach agent

progress_bp = Blueprint('progress', __name__)

@progress_bp.route('/', methods=["POST"])
def chat():
    user_input = request.json.get("message", "")
    
    if not user_input:
        return jsonify({"error": "No message provided"}), 400

    coach = AIFitnessCoach()
    messages = coach.run({"goal": "General", "experience_level": "Beginner", "equipment": [], "constraints": "", "feedback": "", "question": user_input})

    # Extract only the last AI response
    ai_response = ""
    for msg in reversed(messages):
        if msg.type == "ai":
            ai_response = msg.content.strip()
            break

    if not ai_response:
        return jsonify({"error": "No AI response generated."}), 500

    return jsonify({"response": ai_response})
