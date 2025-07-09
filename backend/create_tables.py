from app import app, db
from models.user_profile import UserProfile
from models.workout_program import WorkoutProgram

with app.app_context():
    db.create_all()
    print("✅ Tables created.")
