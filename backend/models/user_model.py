# user_model.py
import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv()  # Load .env variables

def get_connection():
    return mysql.connector.connect(
        host='localhost',
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASS'),
        database='ai_fitness'
    )

def find_user_by_username(username):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    return user

def find_user_by_email(email):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    return user

def create_user(username, email, password):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO users (username, email, password) VALUES (%s, %s, %s)", (username, email, password))
    conn.commit()
    cursor.close()
    conn.close()
