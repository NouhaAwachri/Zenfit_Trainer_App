from app import app, db
from models.user_profile import UserProfile
from models.workout_program import WorkoutProgram
from models.workoutLog_model import WorkoutLog

with app.app_context():
    db.create_all()
    print("✅ Tables created.")
