# 📄 services/agents/user_input.py
import json
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

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
