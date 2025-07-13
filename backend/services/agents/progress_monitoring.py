# agents/progress_monitoring.py
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import AIMessage

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
