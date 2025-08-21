# 🏋️‍♂️ ZenFit – AI-Powered Fitness App

ZenFit is an **AI-driven fitness assistant** designed to deliver **personalized workout experiences** using **Retrieval-Augmented Generation (RAG)** with Ollama and a smart fallback system.  
It integrates **Firebase authentication, AI coaching, monitoring, KPIs, and gamification dashboards** to keep users motivated and progressing.

---

## 📌 Project Overview
Most fitness apps provide static routines. ZenFit goes further by using **AI + RAG** to dynamically generate workouts and track progress.  
The system leverages:
- **Firebase** for secure authentication 🔐  
- **Ollama-powered RAG pipeline** for workout and nutrition guidance 🤖  
- **Regex-based fallback LLM** to ensure reliability even when AI misses patterns  
- **Continuous follow-ups** with conversational AI to adapt plans based on user progress  
- **Logging & Monitoring module** with KPIs for insights and transparency 📊  
- **Gamification Dashboard** to keep users engaged through challenges, badges, and rewards 🎮  

---

## ✨ Features
- 🔐 **Firebase Authentication** – signup, login, and secure session handling  
- 🧠 **AI Workout Generation (RAG + Ollama)** – retrieves fitness knowledge base + generates adaptive plans  
- 🛡️ **Fallback LLM with Regex** – ensures graceful handling of unexpected inputs  
- 💬 **Follow-up Coaching Agent** – conversational check-ins with LLM (Ollama)  
- 📊 **Logging & Monitoring Module** – tracks workouts, calories, and KPIs  
- 🎮 **Gamification Dashboard** – achievements, leaderboards, and streaks to boost motivation  

---

## 🏗️ System Architecture
Mobile App (React Native + Firebase Auth)
↓
Backend API (Flask)
↓
RAG Engine (Ollama + Embeddings Store)
↓
Fallback Regex-based LLM (for edge cases)
↓
Monitoring & Logging Module (KPIs, User Progress)
↓
Dashboard Module (Gamification, Insights, Charts)

---
## ⚙️ Tech Stack
- **Frontend:** React Native (Expo)  
- **Authentication:** Firebase Auth  
- **Backend:** Flask (Python)  
- **AI Models:** Ollama (RAG for embeddings + generation)  
- **Fallback Logic:** Regex-based lightweight LLM handling  
- **Database:** Firestore / MySQLWorkbench  
- **Monitoring:** Custom KPIs, Logs Module  
- **Dashboard:** Gamification + Visualization (charts, badges, leaderboards)  

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/NouhaAwachri/ZenFit_Trainer_App
cd AI_TRAINER_APP

2️⃣ Backend Setup
cd backend
pip install -r requirements.txt
flask run

3️⃣ Frontend Setup
cd frontend
npm install
npx expo start

📊 Roadmap

 Firebase authentication

 RAG with Ollama for workout generation

 Regex fallback LLM

 AI follow-up with Ollama

 Logging + KPI tracking

 Gamification dashboard (achievements, streaks, leaderboard)

## 📸 Screenshots

### 🔐 Welcome
![Welcome](https://github.com/user-attachments/assets/2596884d-5cad-49f6-9a80-79f9c6c064e9)

### Authentication
![Signup](https://github.com/user-attachments/assets/38c47607-b6d1-46f4-a722-68077a66eaf8)
![Signin](https://github.com/user-attachments/assets/fb52be25-5cee-45bd-976f-0c51a3057631)

### Workout Generation
![Questionnaire](https://github.com/user-attachments/assets/c72202e9-ddf1-4499-80aa-20f7986b9bda)
![Generate Workout](https://github.com/user-attachments/assets/42e00565-5529-4f64-85d5-6d05c7aaa2e8)

### 🏋️ Workout Follow-Up
![Follow](https://github.com/user-attachments/assets/cdefc091-3c51-48d0-9a3b-b79494c57553)

### Logging
![Logs](https://github.com/user-attachments/assets/89cd6913-796f-4a4a-b7e7-8499f917c4f0)

### 📊 Dashboard with Gamification
![Gamification Zone](https://github.com/user-attachments/assets/eee49ab8-d034-4a23-a2f7-4b75e2003a2e)
![Dashboard](https://github.com/user-attachments/assets/98af7fe5-d0f5-489e-9fb5-c190034eab98)

