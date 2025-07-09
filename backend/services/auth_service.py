#AUth_service
from models.user_model import find_user_by_email, create_user
from werkzeug.security import generate_password_hash
from dotenv import load_dotenv
from werkzeug.security import check_password_hash
from models.user_model import find_user_by_email
from models.user_model import find_user_by_username

load_dotenv()

from models.user_model import find_user_by_email, find_user_by_username, create_user

def login_user(username, password):
    user = find_user_by_username(username)
    if user and check_password_hash(user['password'], password):
        return {'status': 'success', 'user_id': user['id'], 'username': user['username']}
    return {'status': 'fail', 'message': 'Invalid credentials'}

def register_user(username, email, password):
    if find_user_by_email(email):
        return {'status': 'fail', 'message': 'Email already registered'}
    hashed_pw = generate_password_hash(password)
    create_user(username, email, hashed_pw)
    return {'status': 'success', 'message': 'User created'}

