from models.db import db

class WorkoutLog(db.Model):
    __tablename__ = 'workout_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255))
    date = db.Column(db.Date)
    exercises = db.Column(db.Text)   # Stored as JSON or string
    notes = db.Column(db.Text)
    duration = db.Column(db.Integer)
    program_id = db.Column(db.Integer, db.ForeignKey("workout_program.id"))
    week = db.Column(db.Integer)  # Which week of program
    day = db.Column(db.Integer)   # Which day of week


    
class WorkoutExercise(db.Model):
    __tablename__ = 'workout_exercise' 
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey("workout_program.id"), nullable=False)
    
    week = db.Column(db.Integer, nullable=False)
    day = db.Column(db.Integer, nullable=False)

    name = db.Column(db.String(255), nullable=False)
    sets = db.Column(db.Integer)
    reps = db.Column(db.Integer)
    rest_seconds = db.Column(db.Integer)
    notes = db.Column(db.Text)

    # Log status
    completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime)
    day_label = db.Column(db.String(100))  # "Push Day", "Pull Day", etc.
    actual_sets = db.Column(db.Integer)    # What user actually completed
    actual_reps = db.Column(db.Integer)    # What user actually completed  
    weight_used = db.Column(db.Float)      # Weight used for exercise

    workout_program = db.relationship("WorkoutProgram", backref="exercises")

class ExerciseLibrary(db.Model):
    __tablename__ = 'exercise_library'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100))  # "Push", "Pull", "Legs", etc.
    muscle_groups = db.Column(db.Text)    # JSON array
    equipment_needed = db.Column(db.String(255))
    instructions = db.Column(db.Text)
    difficulty_level = db.Column(db.String(50))

class WorkoutTemplate(db.Model):
    __tablename__ = 'workout_template'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    target_goal = db.Column(db.String(100))  # "strength", "muscle_gain", etc.
    experience_level = db.Column(db.String(50))
    weeks_duration = db.Column(db.Integer)
    days_per_week = db.Column(db.Integer)
    created_by = db.Column(db.String(255))  # user_id or "system"
    
class ProgressMeasurement(db.Model):
    __tablename__ = 'progress_measurement'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False)
    measurement_type = db.Column(db.String(50))  # "weight", "body_fat", "measurement"
    value = db.Column(db.Float)
    unit = db.Column(db.String(20))
    body_part = db.Column(db.String(50))  # For measurements like "chest", "waist"
    date = db.Column(db.Date, nullable=False)
    notes = db.Column(db.Text)    

class NutritionLog(db.Model):
    __tablename__ = 'nutrition_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(255), nullable=False)
    date = db.Column(db.Date, nullable=False)
    meal_type = db.Column(db.String(50))  # "breakfast", "lunch", etc.
    food_item = db.Column(db.String(255))
    calories = db.Column(db.Integer)
    protein = db.Column(db.Float)
    carbs = db.Column(db.Float)
    fat = db.Column(db.Float)
    notes = db.Column(db.Text)    