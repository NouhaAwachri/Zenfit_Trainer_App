# coach.py (Updated)
import os
from dotenv import load_dotenv
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, BaseMessage
from services.llm_engine import LLMEngine

#from services.llm_engine import OpenRouterLLM
from services.rag_pipeline import load_retriever
from services.agents import (
    user_input_agent,
    routine_generation_agent,
    feedback_collection_agent, 
    routine_adjustment_agent,
    progress_monitoring_agent,
    motivational_agent,
)

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
        #self.llm = OpenRouterLLM(api_key=api_key, model="deepseek/deepseek-r1-0528-qwen3-8b:free")
        self.llm = LLMEngine(provider="ollama", model="mistral")

        self.retriever = load_retriever()
        self.graph = self.create_graph()

    def create_graph(self):
        graph = StateGraph(State)

        graph.add_node("user_input", lambda s: user_input_agent(s, self.llm))
        #graph.add_node("routine_generation", lambda s: routine_generation_agent(s, self.retriever, api_key))
        graph.add_node("routine_generation", lambda s: routine_generation_agent(s, self.retriever, self.llm))
        graph.add_node("feedback_collection", lambda s: feedback_collection_agent(s, self.llm))
        graph.add_node("routine_adjustment", lambda s: routine_adjustment_agent(s, self.llm))
        graph.add_node("progress_monitoring", lambda s: progress_monitoring_agent(s, self.llm))
        graph.add_node("motivation", lambda s: motivational_agent(s, self.llm))

        graph.add_edge("user_input", "routine_generation")
        graph.add_edge("routine_generation", "feedback_collection")
        graph.add_edge("feedback_collection", "routine_adjustment")
        graph.add_edge("routine_adjustment", "progress_monitoring")
        graph.add_edge("progress_monitoring", "motivation")
        graph.add_edge("motivation", END)

        graph.set_entry_point("user_input")
        return graph.compile()
    def run_initial(self, user_input):
        state = State(
            user_data=user_input,
            fitness_plan="",
            feedback="",
            progress=[],
            messages=[HumanMessage(content=str(user_input))],
        )
        return self.graph.invoke(state).get("messages", [])

    def run_followup(self, user_id, current_plan, feedback):
        state = State(
            user_data={"firebase_uid": user_id},
            fitness_plan=current_plan,
            feedback=feedback,
            progress=[],
            messages=[HumanMessage(content=f"User feedback: {feedback}")],
        )

        # Run only feedback → adjust → progress → motivate
        for agent in [
            lambda s: feedback_collection_agent(s, self.llm),
            lambda s: routine_adjustment_agent(s, self.llm),
            lambda s: progress_monitoring_agent(s, self.llm),
            lambda s: motivational_agent(s, self.llm)
        ]:
            state = agent(state)

        return state["messages"]
