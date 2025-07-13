# coach.py (Updated) orchestration of the entire workflow while agents are the specific jobs 
import os
from dotenv import load_dotenv
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, BaseMessage
from services.llm_engine import LLMEngine

#from services.llm_engine import OpenRouterLLM
from services.rag_pipeline import load_retriever
from services.agents.feedback_collection import feedback_collection_agent
from services.agents.motivational import motivational_agent
from services.agents.routine_generation import routine_generation_agent
from services.agents.routine_generation_no_rag import routine_generation_no_rag_agent
from services.agents.routine_adjustment import routine_adjustment_agent
from services.agents.progress_monitoring import progress_monitoring_agent
from services.agents.user_input import user_input_agent

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
        self.llm = LLMEngine(provider="ollama", model="gemma:2b")
        self.retriever = load_retriever()  # FAISS retriever
        self.graph = self.create_graph()

    def create_graph(self):
        graph = StateGraph(State)

        # 🔗 Use RAG-based generation agent
        graph.add_node("user_input", lambda s: user_input_agent(s, self.llm))
        graph.add_node("routine_generation", lambda s: routine_generation_agent(s, self.retriever, self.llm))

        graph.add_edge("user_input", "routine_generation")
        graph.add_edge("routine_generation", END)

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
        result = self.graph.invoke(state)
        return {
            "fitness_plan": result.get("fitness_plan", "").strip(),
            "feedback": result.get("feedback", "").strip(),
            "progress": result.get("progress", []),
            # "messages": result.get("messages", [])
        }

    def run_followup(self, user_id, current_plan, feedback):
        state = State(
            user_data={"firebase_uid": user_id},
            fitness_plan=current_plan,
            feedback=feedback,
            progress=[],
            messages=[HumanMessage(content=f"User feedback: {feedback}")],
        )

       
        for agent in [
            lambda s: feedback_collection_agent(s, self.llm),
            lambda s: routine_adjustment_agent(s, self.llm),
        ]:
            state = agent(state)

        return state["messages"]
