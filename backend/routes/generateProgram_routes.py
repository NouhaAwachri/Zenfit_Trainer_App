# routes/generateProgram_routes.py

from flask import Blueprint, request, jsonify
from services.handlers.generator_handler import generate_workout
from services.handlers.followup_handler import follow_up_workout
from services.handlers.check_handler import check_existing_program
from models.conversation_model import Conversation, Message


generate_bp = Blueprint('generate', __name__)

@generate_bp.route('/generate-workout', methods=['POST'])
def generate_program():
    data = request.get_json()
    result, status_code = generate_workout(data)
    return jsonify(result), status_code

@generate_bp.route('/chat-follow-up', methods=['POST'])
def follow_up_program():
    data = request.get_json()
    result, status_code = follow_up_workout(data)
    return jsonify(result), status_code

@generate_bp.route('/check-existing', methods=['POST'])
def check_existing():
    data = request.get_json()
    result, status_code = check_existing_program(data)
    return jsonify(result), status_code


@generate_bp.route("/history/<user_id>", methods=["GET"])
def get_conversation_history(user_id):
    conversations = Conversation.query.filter_by(user_id=user_id).all()
    return jsonify([
        {
            "conversation_id": c.id,
            "title": c.title,
            "created_at": c.created_at.isoformat()
        } for c in conversations
    ])

@generate_bp.route("/messages/<conversation_id>", methods=["GET"])
def get_conversation_messages(conversation_id):
    messages = Message.query.filter_by(conversation_id=conversation_id).order_by(Message.timestamp).all()
    return jsonify([
        {
            "role": m.role.value,
            "content": m.content,
            "timestamp": m.timestamp.isoformat()
        } for m in messages
    ])