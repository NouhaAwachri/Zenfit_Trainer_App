from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import AIMessage

def routine_adjustment_agent(state, llm):
    user_data = state.get("user_data", {})

    # Extract values from user_data safely
    goal = user_data.get("goal", "N/A")
    experience = user_data.get("experience", "N/A")
    equipment = user_data.get("equipment", "N/A")
    firebase_uid = user_data.get("firebase_uid", "N/A")
    name = user_data.get("name", "athlete")

    # Stronger prompt with instruction to AVOID jumping if requested
    prompt = ChatPromptTemplate.from_template(
        """You are an expert AI fitness coach.

Given the user's **current workout plan** and **feedback**, revise the plan.

⚠️ STRICT INSTRUCTIONS:
- If the user says "no jumping", **do not** include any jumping exercises like:
  - Jumping Jacks
  - Jump rope
  - Burpees
  - Box jumps
  - Mountain climbers
- Respect injuries, limitations, or preferences mentioned.

---
👤 **User Info**:
- Firebase UID: {firebase_uid}
- Goal: {goal}
- Experience: {experience}
- Equipment: {equipment}

📋 **Current Plan**:
{current_plan}

💬 **User Feedback**:
{feedback}
---

🎯 Write a **new plan from scratch if needed**, based on feedback.

Use this structure:
- Start with:
  _"Hey {name}! Based on your goal of {goal} and your feedback, here's an updated routine tailored just for you..."_

- Format each day like:
  **Day 1: Upper Body Strength (Approx. 45 mins)**
  - Warm-up (5 min): Arm circles
  - Exercise 1 (10 min): Push-ups — 3 sets of 12 reps, 60s rest
  ...

- Avoid jumping if requested.
- Add estimated **duration** per exercise.
- Use a friendly, motivating tone.

✅ Tips: Stay consistent, track progress, and take rest when needed!
💪 You're doing great — keep it up!
"""
    )

    chain = prompt | llm | StrOutputParser()

    feedback_text = state.get("feedback", "")
    current_plan = state.get("fitness_plan", "")

    print("📤 Sending to LLM:")
    print("Feedback:\n", feedback_text)
    print("Current Plan (first 300 chars):\n", current_plan[:300])

    updated_plan = chain.invoke({
        "firebase_uid": firebase_uid,
        "goal": goal,
        "experience": experience,
        "equipment": equipment,
        "name": name,
        "current_plan": current_plan,
        "feedback": feedback_text,
    })

    print("📥 LLM responded with (first 300 chars):\n", updated_plan[:300])

    # Save to state
    state["fitness_plan"] = updated_plan
    state["messages"].append(AIMessage(content=f"🔄 Updated Plan:\n\n{updated_plan}"))

    return state
