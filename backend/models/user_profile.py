#user_profile;
from models.db import db

class UserProfile(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(255), unique=True, nullable=False)
    gender = db.Column(db.String(10))
    age = db.Column(db.Integer)
    goal = db.Column(db.String(255))
    experience = db.Column(db.String(50))
    days_per_week = db.Column(db.String(50))
    equipment = db.Column(db.String(255))
    style = db.Column(db.String(255))