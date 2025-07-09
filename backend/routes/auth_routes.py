from flask import Blueprint, request, jsonify
from services.auth_service import login_user, register_user  # import from service only
import firebase_admin
from firebase_admin import auth, credentials
import os 
cred_path = os.path.join(os.path.dirname(__file__), "..", "aitrainerfirebaseath-firebase-adminsdk-fbsvc-387dfb0ac6.json")
cred_path = os.path.abspath(cred_path) 
cred = credentials.Certificate(cred_path)

firebase_admin.initialize_app(cred)

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    result = login_user(data['username'], data['password'])
    return jsonify(result), 200 if result['status'] == 'success' else 401

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    result = register_user(data['username'], data['email'], data['password'])
    return jsonify(result), 201 if result['status'] == 'success' else 400
@auth_bp.route('/verify', methods=['POST'])
def verify_token():
    token = request.json.get('idToken')
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        return jsonify({"status": "success", "uid": uid}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 401
