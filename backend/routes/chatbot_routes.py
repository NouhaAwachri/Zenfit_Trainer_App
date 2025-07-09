#chatbot_routes.py
from flask import Blueprint, request, jsonify

chatbot_bp = Blueprint('chatbot', __name__)

@chatbot_bp.route('/', methods=["POST"])
def generate_workout():
    user_input = request.json.get("message", "")
    # Placeholder for LLM integration
    return jsonify({"response": f"Received: {user_input}"})
