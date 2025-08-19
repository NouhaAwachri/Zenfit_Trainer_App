#workout_prigram.py
from models.db import db

class WorkoutProgram(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False)
    program_text = db.Column(db.Text)
    created_at = db.Column(db.DateTime, nullable=False, default=db.func.now())  # Add this

