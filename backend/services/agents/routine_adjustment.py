# agents/routine_adjustment.py

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

    # ✅ Use simple variable names in prompt
    prompt = ChatPromptTemplate.from_template(
        """You are an expert AI fitness coach.

Given the **current workout plan** and the user's **feedback**, revise the plan accordingly.

---
👤 **User Info**:
- Firebase UID: {firebase_uid}
- Goal: {goal}
- Experience: {experience}
- Equipment: {equipment}

🧠 **Current Plan**:
{current_plan}

💬 **User Feedback**:
{feedback}
---

🎯 Rewrite the plan **from scratch if needed**, including any new preferences, like adding abs, cardio, or specific body parts.

Make the tone **friendly and motivational**.

### Response Format:
- Start with:  
  _"Hey {name}! Based on your goal of {goal} and your feedback, here's an updated routine tailored just for you..."_

- Structure each day like this:
  **Day 1: Upper Body Strength (Approx. 45 mins)**
  - Warm-up (5 min): Jump rope
  - Exercise 1 (10 min): Push-ups — 3 sets of 12 reps, 60s rest
  - Exercise 2 (10 min): Dumbbell Press — 3 sets of 10 reps, 90s rest
  ...

- Add estimated **duration** per exercise.

- End with:
  ✅ **Tips**: Consistency is key. Stick with it, track your progress, and don't skip recovery!
  💪 **Keep pushing – you're doing great!**

Output ONLY the updated plan in this format.
"""
    )

    # Combine prompt + LLM + output parsing
    chain = prompt | llm | StrOutputParser()

    # Call the chain with preprocessed variables
    updated_plan = chain.invoke({
        "firebase_uid": firebase_uid,
        "goal": goal,
        "experience": experience,
        "equipment": equipment,
        "name": name,
        "current_plan": state.get("fitness_plan", ""),
        "feedback": state.get("parsed_feedback", state.get("feedback", ""))
    })

    # Update state with new plan and message
    state["fitness_plan"] = updated_plan
    state["messages"].append(AIMessage(content=f"🔄 Updated Plan:\n\n{updated_plan}"))

    return state
