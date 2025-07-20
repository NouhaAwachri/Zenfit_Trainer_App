#coach.py
import os
from dotenv import load_dotenv
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, BaseMessage, AIMessage

from services.llm_engine import LLMEngine
from services.rag_pipeline import load_retriever
from models.user_profile import UserProfile

# Agents
from services.agents.user_input import user_input_agent
from services.agents.routine_generation import routine_generation_agent
from services.agents.feedback_collection import feedback_collection_agent
from services.agents.routine_adjustment import routine_adjustment_agent

# Optionally available agents for future use
# from services.agents.motivational import motivational_agent
# from services.agents.progress_monitoring import progress_monitoring_agent
# from services.agents.routine_generation_no_rag import routine_generation_no_rag_agent

load_dotenv()
api_key = os.getenv("OPENROUTER_API_KEY")

# 🧠 Define shared state across agents
class State(TypedDict):
    user_data: dict
    fitness_plan: str
    feedback: str
    progress: List[str]
    messages: List[BaseMessage]

# 🤖 Main Fitness Coach Orchestrator
class AIFitnessCoach:
    def __init__(self):
        self.llm = LLMEngine(provider="ollama", model="mistral") 
        self.retriever = load_retriever()
        self.graph = self.create_graph()

    def create_graph(self):
        graph = StateGraph(State)

        # 🔁 Basic flow: collect input ➜ generate routine ➜ end
        graph.add_node("user_input", lambda state: user_input_agent(state, self.llm))
        graph.add_node("routine_generation", lambda state: routine_generation_agent(state, self.retriever, self.llm))

        graph.add_edge("user_input", "routine_generation")
        graph.add_edge("routine_generation", END)

        graph.set_entry_point("user_input")
        return graph.compile()

    # 🟢 Entry point for initial generation
    def run_initial(self, user_input: dict):
        fresh_graph = self.create_graph() 
        state = State(
            user_data=user_input,
            fitness_plan="",
            feedback="",
            progress=[],
            messages=[HumanMessage(content=str(user_input))],
        )
        result = fresh_graph.invoke(state)
        return {
            "fitness_plan": result.get("fitness_plan", "").strip(),
            "feedback": result.get("feedback", "").strip(),
            "progress": result.get("progress", []),
            "messages": result.get("messages", [])  # Enable if needed for debugging
        }

    # 🔄 Entry point for follow-up (adjustments based on feedback)
    def run_followup(self, user_id: str, current_plan: str, feedback: str):
        user_profile = UserProfile.query.filter_by(firebase_uid=user_id).first()
        if not user_profile:
            return [AIMessage(content="⚠️ Could not find your fitness profile. Please complete onboarding.")]

        user_data = {
            "firebase_uid": user_id,
            "gender": user_profile.gender,
            "age": user_profile.age,
            "height": user_profile.height,
            "weight": user_profile.weight,
            "goal": user_profile.goal,
            "days_per_week": user_profile.days_per_week,
            "equipment": user_profile.equipment,
            "style": user_profile.style,
            "name": "athlete",
        }

        state = State(
            user_data=user_data,
            fitness_plan=current_plan,
            feedback=feedback,
            progress=[],
            messages=[HumanMessage(content=f"User feedback: {feedback}")],
        )

        # ⛓️ Feedback collection ➜ Routine adjustment
        for agent in [
            lambda s: feedback_collection_agent(s, self.llm),
            lambda s: routine_adjustment_agent(s, self.llm),
        ]:
            state = agent(state)

        return state["messages"]
