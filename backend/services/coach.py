#coach.py
import os
from dotenv import load_dotenv
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, BaseMessage, AIMessage
import re
from services.llm_engine import LLMEngine
from services.rag_pipeline import load_retriever
from models.user_profile import UserProfile

# Agents
from services.agents.user_input import user_input_agent
from services.agents.routine_generation import routine_generation_agent
from services.agents.feedback_collection import feedback_collection_agent
from services.agents.routine_adjustment import routine_adjustment_agent
from services.agents.progress_monitoring import progress_monitoring_agent
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
        self.llm = LLMEngine(provider="ollama", model="qwen2.5:3b-instruct", timeout=180)
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
    # In acoach.py

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

        print(f"🔄 Starting followup pipeline...")
        print(f"📋 Initial plan length: {len(current_plan)} chars")

        # Store the original plan for comparison
        original_plan = current_plan
        plan_modified = False

        # ⛓️ Feedback collection ➜ Routine adjustment ➜ Progress monitoring
        for i, agent in enumerate([
            lambda s: feedback_collection_agent(s, self.llm),
            lambda s: routine_adjustment_agent(s, self.llm),
            lambda s: progress_monitoring_agent(s, self.llm),
        ]):
            try:
                print(f"🤖 Running agent {i+1}...")
                
                # Store state before agent
                plan_before = state.get("fitness_plan", "")
                
                # Run the agent
                new_state = agent(state)
                if new_state:
                    state = new_state
                
                # Check if plan was modified by this agent
                plan_after = state.get("fitness_plan", "")
                if plan_after != plan_before and plan_after != original_plan:
                    plan_modified = True
                    print(f"✅ Agent {i+1} modified the plan (length: {len(plan_after)} chars)")
                    
                    # If routine_adjustment_agent modified the plan, don't let future agents overwrite it
                    if i == 1:  # routine_adjustment_agent is index 1
                        print(f"🔒 Protecting plan changes from routine_adjustment_agent")
                        # Store the modified plan
                        modified_plan = plan_after
                        
                        # Continue with remaining agents but restore plan if they overwrite
                        original_messages = state.get("messages", []).copy()
                        
                        # Run remaining agents
                        for j, remaining_agent in enumerate([lambda s: progress_monitoring_agent(s, self.llm)][i-1:]):
                            try:
                                print(f"🤖 Running remaining agent {j+2}...")
                                before_plan = state.get("fitness_plan", "")
                                
                                remaining_state = remaining_agent(state)
                                if remaining_state:
                                    state = remaining_state
                                
                                after_plan = state.get("fitness_plan", "")
                                
                                # If this agent overwrote our plan changes, restore them
                                if after_plan != before_plan and before_plan == modified_plan:
                                    print(f"⚠️ Agent {j+2} overwrote plan changes, restoring...")
                                    state["fitness_plan"] = modified_plan
                                
                            except Exception as e:
                                print(f"[run_followup] Remaining agent {j+2} error: {e}")
                        
                        break  # Don't run any more agents in the main loop
                else:
                    print(f"📋 Agent {i+1} did not modify the plan")
                    
            except Exception as e:
                print(f"[run_followup] Agent {i+1} error: {e}")

        # Final verification
        final_plan = state.get("fitness_plan", current_plan)
        if final_plan != original_plan:
            original_days = len(re.findall(r'### Day \d+:', original_plan))
            final_days = len(re.findall(r'### Day \d+:', final_plan))
            print(f"🎯 FINAL RESULT: Plan changed from {original_days} days to {final_days} days")
        else:
            print(f"📋 FINAL RESULT: No plan changes")

        # ✅ Guarantee a proper list of messages
        messages = state.get("messages", [])
        if not messages:
            messages = [AIMessage(content=final_plan)]  # fallback: return current plan

        print(f"📤 Returning {len(messages)} messages")
        for i, msg in enumerate(messages):
            if hasattr(msg, 'content'):
                print(f"📨 Message {i}: {str(msg.content)[:100]}...")

        return messages