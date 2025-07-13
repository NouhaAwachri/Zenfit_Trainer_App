# agents/motivational.py
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import AIMessage

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
