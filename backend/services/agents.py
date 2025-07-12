# agents.py
# Defines individual agents (units of AI logic)

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import AIMessage
import json
from dotenv import load_dotenv
import os
import requests
load_dotenv()
api_key = os.getenv("OPENROUTER_API_KEY")

# Agent 1: Process user input into structured JSON
def user_input_agent(state, llm):
    prompt = ChatPromptTemplate.from_template(
        "You are an AI fitness coach. Convert this user profile into structured JSON:\n{user_input}\nRespond only with valid JSON."
    )
    chain = prompt | llm | StrOutputParser()
    user_profile = chain.invoke({"user_input": json.dumps(state["user_data"])})

    try:
        state["user_data"] = json.loads(user_profile)
    except json.JSONDecodeError:
        pass  # Keep original if JSON parsing fails

    return state

# ✅ Agent 2: Generate fitness routine using RAG (retriever + LLM)
"""def routine_generation_agent(state, retriever, api_key):
    user_data_json = json.dumps(state["user_data"], indent=2)
    query = f"Workout plan for a {state['user_data'].get('experience')} level person with goal: {state['user_data'].get('goal')}, equipment: {', '.join(state['user_data'].get('equipment', []))}."
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

    payload = {
        "model": "deepseek/deepseek-r1-0528-qwen3-8b:free",
        "messages": [
            {"role": "system", "content": "You are a certified AI fitness coach."},
            {"role": "user", "content": f"Generate a personalized fitness plan based on the following context:\n{context}\nUser profile:\n{user_data_json}"}
        ]
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    response = requests.post("https://openrouter.ai/api/v1/chat/completions", json=payload, headers=headers)
    if response.status_code == 200:
        content = response.json()
        plan = content["choices"][0]["message"]["content"]
    else:
        plan = f"⚠️ Error: {response.status_code} - {response.text}"

    state["fitness_plan"] = plan
    state["messages"].append(AIMessage(content=plan))
    return state
"""
def routine_generation_agent(state, retriever, llm):
    import re
    user_data = state["user_data"]
    user_data_json = json.dumps(user_data, indent=2)

    # Fix equipment parsing in case it's a string like "gym"
    equipment = user_data.get("equipment", [])
    if isinstance(equipment, str):
        equipment = [equipment]
    equipment = [re.sub(r"\W+", "", e.lower()) for e in equipment]  # Clean and normalize

    query = f"Workout plan for a {user_data.get('experience')} level person with goal: {user_data.get('goal')}, equipment: {', '.join(equipment)}."

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
You are a certified AI fitness coach. Using only the context provided below, generate a personalized workout plan.

---
TRUSTED CONTEXT:
{context}
---

USER PROFILE (JSON):
{user_data_json}

🔧 INSTRUCTIONS:
1. Include training split (days/week), weekly structure, and daily exercises.
2. Include sets, reps, rest, warm-up and recovery tips.
3. Match intensity to user's experience.
4. Use available equipment: {', '.join(equipment)}.
5. Be clear, structured and practical.
6. Do NOT repeat the same content or mention authors or references.

Respond with the full program only. Start directly with the plan.
"""

    plan = llm.invoke(prompt)

    print(f"✅ Mistral response:\n{plan[:800]}\n")

    state["fitness_plan"] = plan
    state["messages"].append(AIMessage(content=plan))
    return state

# ✅ Agent 3: Collect feedback and summarize it
def feedback_collection_agent(state, llm):
    prompt = ChatPromptTemplate.from_template(
        """You are an AI fitness coach assistant. Analyze the following user feedback:

Current fitness plan:
{current_plan}

User feedback:
{user_feedback}

Summarize and extract key points for adjustments.
"""
    )
    chain = prompt | llm | StrOutputParser()
    summary = chain.invoke({
        "current_plan": state["fitness_plan"],
        "user_feedback": state.get("feedback", "")
    })
    state["messages"].append(AIMessage(content=f"📋 Feedback Summary: {summary}"))
    return state


# ✅ Agent 4: Adjust routine based on feedback
def routine_adjustment_agent(state, llm):
    prompt = ChatPromptTemplate.from_template(
        """You are an AI fitness coach. Adjust the following fitness plan based on this user feedback:

Current Plan:
{current_plan}

User Feedback:
{feedback}

Respond with the updated plan.
"""
    )
    chain = prompt | llm | StrOutputParser()
    updated_plan = chain.invoke({
        "current_plan": state["fitness_plan"],
        "feedback": state.get("feedback", "")
    })
    state["fitness_plan"] = updated_plan
    state["messages"].append(AIMessage(content=f"🔄 Updated Plan: {updated_plan}"))
    return state

# ✅ Agent 5: Track user progress
def progress_monitoring_agent(state, llm):
    prompt = ChatPromptTemplate.from_template(
        """You are an AI fitness coach. Analyze the user's progress:

User data: {user_data}
Current plan: {current_plan}
Progress so far: {progress_history}

Provide suggestions, encouragement or challenge.
"""
    )
    chain = prompt | llm | StrOutputParser()
    progress_update = chain.invoke({
        "user_data": str(state["user_data"]),
        "current_plan": state["fitness_plan"],
        "progress_history": str(state.get("progress", []))
    })
    state.setdefault("progress", []).append(progress_update)
    state["messages"].append(AIMessage(content=f"📈 Progress Update: {progress_update}"))
    return state

# ✅ Agent 6: Motivation agent
def motivational_agent(state, llm):
    prompt = ChatPromptTemplate.from_template(
        """You are an AI motivational coach. Based on this user's profile and recent progress, give a motivational tip:

User data: {user_data}
Current plan: {current_plan}
Recent progress: {recent_progress}

Motivate them to continue.
"""
    )
    chain = prompt | llm | StrOutputParser()
    recent = state.get("progress", [])[-1] if state.get("progress") else ""
    motivation = chain.invoke({
        "user_data": str(state["user_data"]),
        "current_plan": state["fitness_plan"],
        "recent_progress": recent
    })
    state["messages"].append(AIMessage(content=f"💪 Motivation: {motivation}"))
    return state
