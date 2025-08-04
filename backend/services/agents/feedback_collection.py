# agents/feedback_collection.py

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import AIMessage

def feedback_collection_agent(state, llm):
    """Enhanced feedback collection with better context analysis"""
    
    current_plan = state.get("fitness_plan", "")
    user_feedback = state.get("feedback", "")
    user_data = state.get("user_data", {})
    
    # Get user context
    goal = user_data.get("goal", "N/A")
    equipment = user_data.get("equipment", [])
    if isinstance(equipment, list):
        equipment_str = ", ".join(equipment) if equipment else "bodyweight only"
    else:
        equipment_str = str(equipment) if equipment else "bodyweight only"
    
    prompt = ChatPromptTemplate.from_template(
        """You are an AI fitness coach assistant analyzing user feedback to understand their needs precisely.

USER PROFILE:
- Goal: {goal}
- Available Equipment: {equipment}

CURRENT FITNESS PLAN:
{current_plan}

USER FEEDBACK:
"{user_feedback}"

TASK: Analyze the feedback and extract key information. Provide a structured summary that includes:

1. **FEEDBACK TYPE**: Is this about progress update, routine change request, equipment issue, injury/pain, difficulty level, or general question?

2. **SPECIFIC REQUIREMENTS**: What exactly does the user want changed or addressed?

3. **CONTEXT CLUES**: Any mentions of:
   - Specific days (Day 1, Day 2, etc.)
   - Specific exercises they like/dislike
   - Equipment preferences or limitations
   - Difficulty level (too easy/hard)
   - Injuries or physical limitations
   - Time constraints
   - Progress achievements

4. **ACTION NEEDED**: What should be done to address their feedback?

5. **PRIORITY LEVEL**: High (needs immediate plan change), Medium (needs response/clarification), Low (acknowledgment sufficient)

Be concise but thorough. Focus on actionable insights that will help adjust their fitness plan appropriately.
"""
    )
    
    chain = prompt | llm | StrOutputParser()
    
    summary = chain.invoke({
        "goal": goal,
        "equipment": equipment_str,
        "current_plan": current_plan,
        "user_feedback": user_feedback
    })
    
    # Store the enhanced parsed feedback
    state["parsed_feedback"] = summary
    
    # Add a more structured response message
    state["messages"].append(AIMessage(content=f"📋 Analyzing your feedback...\n\n{summary}"))
    
    print(f"🧠 Enhanced feedback analysis:\n{summary}")
    
    return state