# agents/routine_generation_no_rag.py

import json
from langchain_core.messages import AIMessage

def routine_generation_no_rag_agent(state, llm):
    """
    Generates a workout routine WITHOUT retrieval augmentation.
    Uses only the LLM prompt with user profile.
    """

    user_data = state["user_data"]
    user_data_json = json.dumps(user_data, indent=2)

    # Extract user info with defaults
    experience = user_data.get("experience", "beginner")
    goal = user_data.get("goal", "general fitness")
    style = user_data.get("style", "full body")
    gender = user_data.get("gender", "neutral")
    days = user_data.get("days_per_week", "3")
    height = user_data.get("height", "N/A")
    weight = user_data.get("weight", "N/A")
    equipment = user_data.get("equipment", [])
    
    if isinstance(equipment, str):
        equipment_list = [e.strip().lower() for e in equipment.split(",")]
    else:
        equipment_list = equipment

    prompt = f"""
You are a certified elite personal trainer and AI fitness coach.

Generate a **complete weekly workout plan** based on the following user profile:

- Gender: {gender}
- Age: {user_data.get("age", "N/A")}
- Height: {height} cm
- Weight: {weight} kg
- Fitness Goal: {goal}
- Experience Level: {experience}
- Available Workout Days per Week: {days}
- Equipment Available: {', '.join(equipment_list)}
- Preferred Workout Style: {style}

Requirements:
1. Use an optimized split that matches their days/week and style (e.g., 4-day Upper/Lower, 3-day Full Body, or Push/Pull).
2. Ensure balance between training volume and intensity to manage recovery and CNS fatigue.
3. Incorporate **progressive overload** and **periodization logic** across the week (e.g., varying rep ranges or intensities).
4. Only include exercises that match the user's available equipment and level.
5. Include warm-ups, main exercises (with sets & reps), optional cardio, rest days, and cooldowns.
6. Present the plan as a clean, easy-to-follow day-by-day schedule:
   **Day 1**, **Day 2**, etc. with bullet points and headings.

Respond ONLY with the full plan in this clean format — no extra comments or headings.
"""


    plan = llm.invoke(prompt)

    state["fitness_plan"] = plan
    state["messages"].append(AIMessage(content=plan))
    return state
