# agents/feedback_collection.py
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import AIMessage

def feedback_collection_agent(state, llm):
    prompt = ChatPromptTemplate.from_template(
        """You are an AI fitness coach assistant. Analyze the following user feedback:

Current fitness plan:
{current_plan}

User feedback:
{user_feedback}

✅ Summarize and extract the most important changes needed to adjust the plan. Be clear and concise.
"""
    )
    chain = prompt | llm | StrOutputParser()
    
    summary = chain.invoke({
        "current_plan": state["fitness_plan"],
        "user_feedback": state.get("feedback", "")
    })

    # ✅ Store the cleaned/parsed feedback for use in adjustment agent
    state["parsed_feedback"] = summary

    state["messages"].append(AIMessage(content=f"📋 Feedback Summary: {summary}"))
    return state
