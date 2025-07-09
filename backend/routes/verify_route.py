from flask import Flask, request, jsonify
import firebase_admin
from firebase_admin import credentials, auth
import os

app = Flask(__name__)

# ✅ Use your actual JSON file name here
# verify_route.py
cred_path = os.path.join(os.path.dirname(__file__), "..", "aitrainerfirebaseath-firebase-adminsdk-fbsvc-387dfb0ac6.json")
cred_path = os.path.abspath(cred_path)  # 👈 convert to full path

cred = credentials.Certificate(cred_path)

firebase_admin.initialize_app(cred)

@app.route('/verify', methods=['POST'])
def verify_token():
    data = request.get_json()
    id_token = data.get('idToken')

    if not id_token:
        return jsonify({"error": "Missing token"}), 400

    try:
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token['uid']
        email = decoded_token.get('email', '')
        return jsonify({"status": "success", "uid": uid, "email": email}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 401

if __name__ == "__main__":
    app.run(debug=True)
