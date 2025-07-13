# routes/generateProgram_routes.py

from flask import Blueprint, request, jsonify
from services.handlers.generator_handler import generate_workout
from services.handlers.followup_handler import follow_up_workout
from services.handlers.check_handler import check_existing_program

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
