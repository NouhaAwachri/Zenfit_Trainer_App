# app.py
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

from models.db import db  

load_dotenv()

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'mysql+pymysql://root:yourpassword@localhost/ai_fitness')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)  

# ✅ Blueprint imports AFTER db.init_app
from routes.auth_routes import auth_bp
from routes.chatbot_routes import chatbot_bp
from routes.workout_logs import workout_logs_bp
from routes.workout_logs import parser_bp
#from routes.report_routes import report_bp
#from routes.progress_routes import progress_bp
from routes.generateProgram_routes import generate_bp
app.register_blueprint(chatbot_bp, url_prefix="/chatbot")
#app.register_blueprint(report_bp, url_prefix="/report")
#app.register_blueprint(progress_bp, url_prefix="/progress")
app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(generate_bp, url_prefix="/generate")
app.register_blueprint(workout_logs_bp)
app.register_blueprint(parser_bp)

@app.route('/')
def index():
    return "Welcome to the API"

if __name__ == "__main__":
    with app.app_context():  # ✅ Needed for models to access context
        db.create_all()
    app.run(host='0.0.0.0', debug=True, port=5000)
