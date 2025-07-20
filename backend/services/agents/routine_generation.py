# agents/routine_generation.py

import re
import json
from langchain_core.messages import AIMessage

def routine_generation_agent(state, retriever, llm):
    user_data = state["user_data"]

    # Extract values with safe defaults
    experience = user_data.get("experience", "beginner")
    goal = user_data.get("goal", "general fitness")
    style = user_data.get("style", "full body")
    gender = user_data.get("gender", "neutral")
    days = int(user_data.get("days_per_week", 3))  # force int
    age = user_data.get("age", "N/A")
    height = user_data.get("height", "N/A")
    weight = user_data.get("weight", "N/A")
    name = user_data.get("name", "Athlete")

    equipment = user_data.get("equipment", [])
    if isinstance(equipment, str):
        equipment_list = [e.strip().lower() for e in equipment.split(",")]
    else:
        equipment_list = [re.sub(r"\W+", "", e.lower()) for e in equipment]

    # 🔍 RAG query
    query = (
        f"{days}-day {style} workout plan for a {experience} level {gender}, "
        f"goal: {goal}, using {', '.join(equipment_list)} only."
    )
    print(f"\n🔎 FAISS RAG Query: {query}\n")
    docs = retriever.invoke(query)

    if not docs:
        plan = "⚠️ No relevant documents found. Unable to generate a plan."
        state["fitness_plan"] = plan
        state["messages"].append(AIMessage(content=plan))
        return state

    context = "\n\n".join([
        doc.page_content if hasattr(doc, "page_content") else str(doc)
        for doc in docs[:5]
    ])

    # ✅ STRONG PROMPT WITH HARD RULES
    prompt = f"""
You are a certified AI personal trainer and strength coach.

Your job is to create a complete weekly training plan for the following client. 
**DO NOT** ask the user any questions.
**DO NOT** skip days — you must design a plan with exactly **{days} training days per week**.
Use only the information provided.

---
📘 KNOWLEDGE BASE:
{context}

---
👤 CLIENT PROFILE:
- Name: {name}
- Gender: {gender}
- Age: {age}
- Height: {height}
- Weight: {weight}
- Goal: {goal}
- Experience: {experience}
- Days Available: {days}
- Equipment: {', '.join(equipment_list) if equipment_list else 'Bodyweight only'}
- Style: {style}

---
🎯 INSTRUCTIONS:
- Include: Warm-up, main workout per day, rest days, exercise names, sets/reps
- Make each day ~45–60 min
- Use progressive overload
- Write clear markdown with headings
- End with training tips + motivation

Start your output with this sentence (customized):
> "Hey , based on your goal of **{goal}**, here’s your optimized {days}-day workout plan:"

Then structure each day like this:

### Day 1: Upper Body Push (Approx. 50 min)
- Warm-up (5 min): Jump rope, shoulder circles
- Bench Press: 3 sets x 10 reps
- ...

✅ **Training Tips**: Log your workouts, stay consistent, hydrate daily.  
💬 **You got this! Let’s crush your goal.**

ONLY output the final workout plan in Markdown. Do not ask for clarification.
""".strip()

    plan = llm.invoke(prompt)

    print(f"✅ Mistral response:\n{plan[:800]}\n")

    state["fitness_plan"] = plan
    state["messages"].append(AIMessage(content=plan))
    return state
