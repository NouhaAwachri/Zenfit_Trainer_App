# db_service.py
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def init_db(app):
    app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://localhost:Data-Base123@localhost/AI_Trainer_DB'
    db.init_app(app)
