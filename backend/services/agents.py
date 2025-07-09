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

    # Optionally skip appending this message if you don't want to show user profile
    return state


# ✅ Agent 2: Generate fitness routine using RAG (retriever + LLM)


def routine_generation_agent(state, retriever, api_key):
    user_data_json = json.dumps(state["user_data"], indent=2)

    query = f"Workout plan for a {state['user_data'].get('experience_level')} level person with goal: {state['user_data'].get('goal')}, equipment: {', '.join(state['user_data'].get('equipment', []))}, constraints: {state['user_data'].get('constraints', 'None')}."

    docs = retriever.invoke(query)


    if not docs:
        plan = "⚠️ No relevant documents found. Unable to generate a plan."
        state["fitness_plan"] = plan
        ai_msg = AIMessage(content=plan)
        state["messages"].append(ai_msg)
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

    import requests
    response = requests.post("https://openrouter.ai/api/v1/chat/completions", json=payload, headers=headers)
    if response.status_code == 200:
        content = response.json()
        plan = content["choices"][0]["message"]["content"]
    else:
        plan = f"⚠️ Error: {response.status_code} - {response.text}"

    state["fitness_plan"] = plan
    ai_msg = AIMessage(content=plan)
    state["messages"].append(ai_msg)
    return state

