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


