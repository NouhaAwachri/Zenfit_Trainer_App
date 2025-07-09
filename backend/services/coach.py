#coach.py
import os
from dotenv import load_dotenv
from services.agents import user_input_agent, routine_generation_agent
from services.rag_pipeline import load_retriever
from langchain_core.messages import HumanMessage, BaseMessage
from langgraph.graph import StateGraph, END
from typing import TypedDict, List
from services.llm_engine import OpenRouterLLM

load_dotenv()
api_key = os.getenv("OPENROUTER_API_KEY")

class State(TypedDict):
    user_data: dict
    fitness_plan: str
    feedback: str
    progress: List[str]
    messages: List[BaseMessage]

class AIFitnessCoach:
    def __init__(self): 
        self.llm = OpenRouterLLM(api_key=api_key, model="deepseek/deepseek-r1-0528-qwen3-8b:free")
        self.retriever = load_retriever()
        self.graph = self.create_graph()

    def create_graph(self):
        graph = StateGraph(State)
        graph.add_node("user_input", lambda s: user_input_agent(s, self.llm))
        graph.add_node("routine_generation", lambda s: routine_generation_agent(s, self.retriever, api_key))
        graph.add_edge("user_input", "routine_generation")
        graph.add_edge("routine_generation", END)
        graph.set_entry_point("user_input")
        return graph.compile()

    def run(self, user_input):
        initial_state = State(
            user_data=user_input,
            fitness_plan="",
            feedback=user_input.get("feedback", ""),
            progress=[],
            messages=[HumanMessage(content=str(user_input))]
        )
        return self.graph.invoke(initial_state)["messages"]
