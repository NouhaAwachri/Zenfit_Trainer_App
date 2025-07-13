# agents/routine_generation.py

import re
import json
from langchain_core.messages import AIMessage

def routine_generation_agent(state, retriever, llm):
    """
    Generates a workout routine USING retrieval augmentation (RAG).
    Retrieves relevant docs from vectorstore and passes context in prompt.
    """

    user_data = state["user_data"]
    user_data_json = json.dumps(user_data, indent=2)

    # Extract values with defaults
    experience = user_data.get("experience", "beginner")
    goal = user_data.get("goal", "general fitness")
    style = user_data.get("style", "full body")
    gender = user_data.get("gender", "neutral")
    days = user_data.get("days_per_week", "3")
    height = user_data.get("height", "N/A")
    weight = user_data.get("weight", "N/A")

    # Normalize equipment
    equipment = user_data.get("equipment", [])
    if isinstance(equipment, str):
        equipment_list = [e.strip().lower() for e in equipment.split(",")]
    else:
        equipment_list = [re.sub(r"\W+", "", e.lower()) for e in equipment]

    query = (
        f"{days}-day {style} workout plan for a {experience} level {gender}, "
        f"goal: {goal}, using {', '.join(equipment_list)} only. "
        f"Include warm-up, sets, reps, rest periods, and recovery tips."
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

    print(f"📄 Retrieved Documents (RAG):\n")
    for i, doc in enumerate(docs[:3]):
        print(f"Doc {i+1}: {doc.page_content[:500]}...\n---")

    prompt = f"""
You are an elite AI fitness coach and certified personal trainer.

Use the trusted fitness documents below to design a **personalized and intelligent workout program** for the client based on their profile.

---
📚 KNOWLEDGE BASE:
{context}
---

👤 CLIENT PROFILE:
- Name (optional): {user_data.get("name", "Athlete")}
- Gender: {gender}
- Age: {user_data.get("age", "N/A")}
- Height: {height} cm
- Weight: {weight} kg
- Goal: {goal}
- Experience Level: {experience}
- Days Available per Week: {days}
- Available Equipment: {', '.join(equipment_list)}
- Preferred Style: {style}

🎯 YOUR TASK:
Design a professional plan that includes:

1. An **optimized workout split** based on experience and schedule (e.g., Upper/Lower, Push/Pull, Full Body).
2. **Balanced volume and intensity** with rest and recovery built in (avoid CNS fatigue).
3. Logical **progressive overload** and periodization for long-term improvement.
4. Exercises tailored to available equipment and fitness level.
5. Daily session duration ~45–60 min max, with **exact duration per exercise**.
6. Clear markdown sections and headings.
7. Include **warm-up**, **cool-down**, and **rest days**.
8. Finish with:
    - ✅ **Training Tips**
    - 💬 **Motivational Message**

---
📄 FORMAT (Markdown):
Start with:

_"Hey {user_data.get('name', 'athlete')}! Based on your goal of {goal} and the info you shared, here’s your customized weekly training plan..."_

Then structure like:
## Weekly Split
### Day 1: Upper Body Strength (Approx. 50 min)
- Warm-up (5 min): Arm circles, jumping jacks
- Exercise 1 (10 min): Push-ups – 3x12, 60s rest
- Exercise 2 (10 min): Dumbbell Shoulder Press – 3x10, 90s rest
...

✅ **Training Tips**: Stay consistent, track your lifts, and get 7–9 hours of sleep.
💬 **Keep pushing – you're doing amazing!**

Only output the final workout plan in markdown.
"""


    plan = llm.invoke(prompt)

    print(f"✅ gemma:2b response:\n{plan[:800]}\n")

    state["fitness_plan"] = plan
    state["messages"].append(AIMessage(content=plan))
    return state
