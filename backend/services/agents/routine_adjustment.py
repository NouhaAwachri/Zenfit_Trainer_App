# agents/routine_adjustment.py

from joblib import Memory
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import AIMessage, HumanMessage
from models.conversation_model import Conversation, Message
from models.db import db
import re

def classify_feedback_type(feedback):
    """Enhanced feedback classification considering context"""
    feedback_lower = feedback.lower()
    
    # Progress indicators
    progress_keywords = [
        r'\d+\s*kg', r'\d+\s*lbs', r'\d+\s*pounds',
        r'\d+\s*reps?', r'\d+\s*sets?',
        'i did', 'i completed', 'i managed', 'i benched', 'i squatted',
        'i deadlifted', 'i lifted', 'i ran', 'i walked',
        'finished', 'completed', 'achieved', 'hit',
        'felt good', 'felt great', 'felt easy', 'felt hard',
        'was tough', 'was easy', 'went well', 'personal record',
        'pr', 'new max', 'increased weight', 'progressed'
    ]
    
    # Change request indicators
    change_keywords = [
        'change', 'modify', 'update', 'adjust', 'new routine',
        'different workout', 'switch', 'replace', 'rewrite',
        'entire program', 'whole program', 'full program',
        'no jumping', 'cant jump', "can't jump", 'avoid jumping',
        'too hard', 'too easy', 'too difficult', 'easier',
        'injury', 'hurt', 'pain', 'sore', 'injured',
        'no equipment', 'different equipment', 'at home',
        'prefer', 'would rather', 'instead of', 'dont like', "don't like",
        'hate', 'love', 'enjoy', 'boring', 'day 1', 'day 2', 'day 3', 'day 4','day 5','day 6', 'day 7',
        'full body', 'upper body', 'lower body', 'cardio',
        'bands', 'bodyweight', 'no dumbbell', 'using bands',
        'more challenging', 'less challenging', 'not working'
    ]
    
    # Question/clarification indicators
    question_keywords = [
        '?', 'how', 'what', 'when', 'where', 'why', 'should i',
        'can i', 'is it okay', 'help', 'confused', 'not sure'
    ]
    
    progress_matches = sum(1 for kw in progress_keywords if re.search(kw, feedback_lower))
    change_matches = sum(1 for kw in change_keywords if kw in feedback_lower)
    question_matches = sum(1 for kw in question_keywords if kw in feedback_lower)

    if progress_matches > change_matches and progress_matches > question_matches and progress_matches > 0:
        return 'progress'
    elif change_matches > 0:
        return 'routine_change'
    elif question_matches > 0:
        return 'question'
    else:
        return 'other'

def extract_day_from_feedback(feedback):
    """Extract which day the user wants to modify"""
    feedback_lower = feedback.lower()
    day_patterns = [
        r'day\s*(\d+)',
        r'day\s*(\w+)',
        r'workout\s*(\d+)',
        r'session\s*(\d+)'
    ]
    
    for pattern in day_patterns:
        match = re.search(pattern, feedback_lower)
        if match:
            day_ref = match.group(1)
            if day_ref.isdigit():
                return f"Day {day_ref}"
            elif day_ref in ['one', '1st', 'first']:
                return "Day 1"
            elif day_ref in ['two', '2nd', 'second']:
                return "Day 2"
            elif day_ref in ['three', '3rd', 'third']:
                return "Day 3"
            elif day_ref in ['four', '4th', 'fourth']:
                return "Day 4"
            elif day_ref in ['five', '5th', 'fifth']:
                return "Day 5"
            elif day_ref in ['six', '6th', 'sixth']:
                return "Day 6"
            elif day_ref in ['seven', '7th', 'seventh']:
                return "Day 7"
    return None

def get_conversation_context(user_id, limit=5):
    """Get recent conversation history for context"""
    try:
        recent_conversations = Conversation.query.filter_by(user_id=user_id)\
            .order_by(Conversation.created_at.desc()).limit(3).all()
        
        context = []
        for conv in recent_conversations:
            messages = Message.query.filter_by(conversation_id=conv.id)\
                .order_by(Message.created_at.desc()).limit(limit).all()
            
            for msg in reversed(messages):  # Reverse to get chronological order
                context.append(f"{msg.role}: {msg.content[:200]}...")
        
        return "\n".join(context[-10:])  # Last 10 messages
    except Exception as e:
        print(f"Error getting conversation context: {e}")
        return ""

def parse_current_plan_by_days(current_plan):
    """Parse the current plan into individual days"""
    days = {}
    current_day = None
    current_content = []
    
    lines = current_plan.split('\n')
    
    for line in lines:
        # Check if line starts a new day
        day_match = re.match(r'\*\*Day\s*(\d+):', line, re.IGNORECASE)
        if day_match:
            # Save previous day if it exists
            if current_day:
                days[current_day] = '\n'.join(current_content)
            
            # Start new day
            current_day = f"Day {day_match.group(1)}"
            current_content = [line]
        else:
            if current_day:
                current_content.append(line)
    
    # Save the last day
    if current_day:
        days[current_day] = '\n'.join(current_content)
    
    return days

def reconstruct_plan(days_dict, target_day, new_day_content):
    """Reconstruct the full plan with the updated day"""
    updated_days = days_dict.copy()
    updated_days[target_day] = new_day_content
    
    # Reconstruct in order
    full_plan = []
    for day_num in [1, 2, 3, 4, 5, 6, 7]:
        day_key = f"Day {day_num}"
        if day_key in updated_days:
            full_plan.append(updated_days[day_key])
    
    return '\n\n'.join(full_plan)

import re
from typing import List

def filter_forbidden_exercises(text: str, equipment_str: str, restrictions: str) -> str:
    equipment_str = equipment_str.lower()
    restrictions = restrictions.lower()

    remove_dumbbell = any(phrase in equipment_str for phrase in [
        "no dumbbell", "no dumbbells", "without dumbbell", "bodyweight only"
    ])
    remove_barbell = "no barbell" in equipment_str
    remove_kettlebell = "no kettlebell" in equipment_str or "bodyweight only" in equipment_str
    remove_machines = "no machines" in equipment_str or "bodyweight only" in equipment_str

    if remove_dumbbell:
        text = re.sub(r'(?i)dumbbell[^\n]*\n?', '', text)

    if remove_barbell:
        text = re.sub(r'(?i)barbell[^\n]*\n?', '', text)

    if remove_kettlebell:
        text = re.sub(r'(?i)kettlebell[^\n]*\n?', '', text)

    if remove_machines:
        text = re.sub(r'(?i)machine[^\n]*\n?', '', text)

    if "no jumping" in restrictions:
        forbidden = [
            r'(?i)jumping jacks[^\n]*', r'jump rope[^\n]*', r'burpees[^\n]*',
            r'box jumps[^\n]*', r'squat jumps[^\n]*', r'jumping lunges[^\n]*',
            r'plyometric[^\n]*', r'mountain climbers[^\n]*'
        ]
        for pattern in forbidden:
            text = re.sub(pattern + r'\n?', '', text)

    return text


def routine_adjustment_agent(state, llm):
    """Enhanced routine adjustment agent with memory, context awareness, and detailed workout generation."""
    user_data = state.get("user_data", {})
    goal = user_data.get("goal", "N/A")
    firebase_uid = user_data.get("firebase_uid", "N/A")
    name = user_data.get("name", "athlete")
    
    # Handle equipment robustly
    equipment = user_data.get("equipment", [])
    if isinstance(equipment, list):
        equipment_str = ", ".join(equipment) if equipment else "bodyweight only"
    else:
        equipment_str = str(equipment) if equipment else "bodyweight only"
    
    restrictions = user_data.get("restrictions", [])  # e.g. ["no jumping", "no dumbbells"]

    print(f"User equipment preferences: {equipment_str}")
    print(f"User restrictions: {restrictions}")

    # Get original feedback and parsed feedback
    feedback_text = state.get("feedback", "")
    parsed_feedback = state.get("parsed_feedback", "")
    current_plan = state.get("fitness_plan", "")
    
    # Get conversation context for memory
    conversation_context = get_conversation_context(firebase_uid)
    
    # Get recent messages from current session
    session_messages = state.get("messages", [])
    recent_session_context = "\n".join([
        f"{msg.__class__.__name__}: {getattr(msg, 'content', '')[:150]}..."
        for msg in session_messages[-5:]  # Last 5 messages
    ])
    
    feedback_type = classify_feedback_type(feedback_text)
    
    print(f"📊 Feedback classified as: {feedback_type}")
    print(f"📤 Original feedback: {feedback_text}")
    print(f"🧠 Parsed feedback: {parsed_feedback}")

    # Build comprehensive context
    full_context = f"""
RECENT CONVERSATION HISTORY:
{conversation_context}

CURRENT SESSION CONTEXT:
{recent_session_context}

USER PROFILE:
- Goal: {goal}
- Equipment: {equipment_str}
- Restrictions: {', '.join(restrictions) if restrictions else 'None'}
- Name: {name}
"""

    # Helper: build critical rules text based on restrictions
    rules = [
        f"The user has access to: {equipment_str}",
        "Use ONLY exercises with the allowed equipment."
    ]
    if any("no dumbbell" in r.lower() for r in restrictions):
        rules.append("DO NOT include any dumbbell exercises.")
    if any("no barbell" in r.lower() for r in restrictions):
        rules.append("DO NOT include any barbell exercises.")
    if any("no kettlebell" in r.lower() for r in restrictions):
        rules.append("DO NOT include any kettlebell exercises.")
    if any("no jumping" in r.lower() for r in restrictions):
        rules.append("DO NOT include any jumping or plyometric exercises.")
    rules_text = "\n".join(f"- {rule}" for rule in rules)

    if feedback_type == 'progress':
        # Respond supportively, no plan changes unless requested
        response_prompt = ChatPromptTemplate.from_template(
            """You are a supportive fitness coach responding to a progress update.

CONTEXT:
{context}

CURRENT PLAN:
{current_plan}

The user reported: "{feedback}"

PARSED FEEDBACK SUMMARY: {parsed_feedback}

Respond with:
1. Specific congratulations based on their progress
2. Ask 1-2 follow-up questions about how it felt or what they noticed
3. Give brief encouragement referencing their goal
4. Suggest when to progress further (if appropriate)
5. DO NOT change their routine unless they specifically request it

Keep it conversational, personal, and supportive. Start with "Hey {name}!" and reference their previous conversations if relevant.
"""
        )
        chain = response_prompt | llm | StrOutputParser()
        response = chain.invoke({
            "name": name,
            "feedback": feedback_text,
            "parsed_feedback": parsed_feedback,
            "current_plan": current_plan[:500],
            "context": full_context
        })
        state["messages"].append(AIMessage(content=response))

    elif feedback_type == 'routine_change':
        target_day = extract_day_from_feedback(feedback_text)
        days_dict = parse_current_plan_by_days(current_plan) if current_plan else {}

        if target_day and current_plan:
            current_day_content = days_dict.get(target_day, "No content found for this day")

            routine_change_prompt = ChatPromptTemplate.from_template(
f"""You are an expert AI fitness coach with memory of previous conversations.

CONTEXT & MEMORY:
{{context}}

CRITICAL RULES:
{rules_text}

SPECIFIC TASK: Rewrite ONLY {{target_day}} with a **clear, fully structured workout** as follows:

1. Warm-up (5-10 min) — list specific bodyweight warm-up exercises.
2. Main Workout (30-45 min) — list **specific exercises** with:
   - Sets x Reps (e.g., 3 sets x 10-12 reps)
   - Exercise name (no dumbbells, barbells, kettlebells if restricted)
3. Cardio & Core (optional section, specify time and exercises)
4. Cool-down (5-10 min) — list specific stretches or mobility work

Include rest periods between sets and exercises.

Use exercises appropriate for the user's equipment and restrictions.

If user feedback indicates discomfort or dislikes (e.g., no planks), do not include those exercises.

Add personalized training tips and encouragement referencing user's goal and journey.

Format your response clearly with markdown headers and bullet points, like this:

**{{target_day}}: [Workout Title] (Approx. [X] min)**

- Warm-up:
  - [Exercise 1]
  - [Exercise 2]
- Main Workout:
  - [Exercise 1]: [sets] x [reps]
  - [Exercise 2]: [sets] x [reps]
- Cardio & Core:
  - [Exercise 1]: [sets] x [reps]
- Cool-down:
  - [Stretch 1]

Additional notes:
- [Rest time, progression tips]

Personal encouragement:
- [Motivational message]

Current {{target_day}} content:
{{current_day_content}}

Original user request: "{{feedback}}"
Parsed requirements: "{{parsed_feedback}}"
"""
            )
            if hasattr(llm, 'bind'):
                chain = routine_change_prompt | llm.bind(temperature=0.2) | StrOutputParser()
            else:
                chain = routine_change_prompt | llm | StrOutputParser()

            new_day_content = chain.invoke({
                "target_day": target_day,
                "goal": goal,
                "equipment": equipment_str,
                "current_day_content": current_day_content,
                "feedback": feedback_text,
                "parsed_feedback": parsed_feedback,
                "context": full_context
            })

            updated_full_plan = reconstruct_plan(days_dict, target_day, new_day_content)

            print(f"📥 Updated {target_day} content:\n{new_day_content}")
            state["fitness_plan"] = updated_full_plan
            state["messages"].append(AIMessage(content=f"🔄 I've updated {target_day} with a detailed structured workout:\n\n{new_day_content}"))

        else:
            # Check if user requested a full program rewrite
            is_full_rewrite = any(phrase in feedback_text.lower() for phrase in [
                'rewrite the entire', 'rewrite entire', 'entire program', 'whole program',
                'full program', 'rewrite the program', 'rewrite program', 'start over',
                'completely new', 'from scratch'
            ])

            if is_full_rewrite:
                # Replace with actual user-provided values
                user_name = state.get("user_name", "friend")  # or data.get(...)
                previous_goal = state.get("goal", "your fitness goal")  # or data.get(...)

                prompt = f"""
        You are a highly skilled AI fitness coach who understands the user's fitness goals, preferences, environment, and constraints. Your task is to **create a completely new and personalized workout program** for the user based on their latest feedback and needs.

        USER NAME: {user_name}
        USER GOAL: {previous_goal}

        TASK: Create a COMPLETE workout program that exactly follows the user's preferences and request.
        - Do NOT assume a 4-day structure or any default duration.
        - If the user specified number of days, structure, or type of exercises, follow that.
        - If not, use your expert judgment to suggest an effective and engaging structure.
        - Consider user's environment, available equipment, fitness level, past struggles, and goals.
        - Make it engaging, realistic, and sustainable.

        IMPORTANT: This replaces the previous routine entirely. Make it cohesive, structured, and motivating.

        OUTPUT FORMAT (MARKDOWN):
        Write your response using the format below:

        ## Hey {user_name}, based on your goal of **{previous_goal}**, here’s your brand-new personalized workout program:

        **[Workout Title or Focus Area] (Approx. [Duration] min)**
        - Warm-up:
        - Exercise 1: sets x reps
        - Exercise 2: sets x reps
        - Main Workout:
        - Exercise 1: sets x reps
        - Exercise 2: sets x reps
        - Optional (Core/Cardio/Flexibility):
        - Exercise 1: sets x reps
        - Cool-down:
        - Stretch 1
        - Stretch 2

        (Repeat the above structure for each session or workout block as needed)

        Make sure the tone is friendly, motivational, and clearly structured. Suggest progression tips or how to repeat or build on the plan.

        Close with a short encouraging message, e.g., “Let’s do this!” or “Proud of your dedication 💪”.
        """

                # Create the prompt template
                routine_change_prompt = ChatPromptTemplate.from_template(prompt)


                
            else:
                routine_change_prompt = ChatPromptTemplate.from_template(
f"""You are an expert AI fitness coach with memory of this user's fitness journey.

CONTEXT & HISTORY:
{{context}}

CRITICAL RULES:
{rules_text}

Current Plan:
{{current_plan}}

Original Request: "{{feedback}}"
Parsed Requirements: "{{parsed_feedback}}"

TASK: Adjust the workout plan based on:
- Their specific request
- Conversation history and preferences  
- Equipment limitations
- Past feedback patterns

Provide the adjusted plan with personal touches based on your knowledge of their journey.
"""
                )

            if hasattr(llm, 'bind'):
                chain = routine_change_prompt | llm.bind(temperature=0.2) | StrOutputParser()
            else:
                chain = routine_change_prompt | llm | StrOutputParser()

            updated_plan = chain.invoke({
                "name": name,
                "goal": goal,
                "equipment": equipment_str,
                "current_plan": current_plan,
                "feedback": feedback_text,
                "parsed_feedback": parsed_feedback,
                "context": full_context
            })
        


            print("📥 LLM responded with:\n", updated_plan)
            state["fitness_plan"] = updated_plan
            state["messages"].append(AIMessage(content=f"🔄 I've redesigned your plan based on our conversations:\n\n{updated_plan}"))

    elif feedback_type == 'question':
        question_prompt = ChatPromptTemplate.from_template(
            """You are a knowledgeable fitness coach with memory of this user's journey.

CONTEXT & CONVERSATION HISTORY:
{context}

CURRENT PLAN:
{current_plan}

The user asked: "{feedback}"
Parsed context: "{parsed_feedback}"

User Profile:
- Name: {name}
- Goal: {goal}
- Equipment: {equipment}

Respond with:
1. A helpful answer referencing their specific situation and history
2. Practical advice based on their current plan and equipment
3. Encouragement that acknowledges their journey
4. Ask if they need any plan adjustments

Keep it conversational and personal. Start with "Hey {name}!"
"""
        )
        chain = question_prompt | llm | StrOutputParser()
        response = chain.invoke({
            "name": name,
            "feedback": feedback_text,
            "parsed_feedback": parsed_feedback,
            "current_plan": current_plan[:500],
            "context": full_context,
            "goal": goal,
            "equipment": equipment_str
        })
        state["messages"].append(AIMessage(content=response))

    else:
        general_prompt = ChatPromptTemplate.from_template(
            """You are a helpful fitness coach with memory of this user's fitness journey.

CONTEXT & HISTORY:
{context}

The user said: "{feedback}"
Parsed context: "{parsed_feedback}"

User Profile:
- Name: {name}
- Goal: {goal}

Respond helpfully using your knowledge of their journey. Reference previous conversations when relevant. 
If they might want routine changes, ask them to be more specific.

Keep it conversational and supportive. Start with "Hey {name}!"
"""
        )
        chain = general_prompt | llm | StrOutputParser()
        response = chain.invoke({
            "name": name,
            "feedback": feedback_text,
            "parsed_feedback": parsed_feedback,
            "context": full_context,
            "goal": goal
        })
        state["messages"].append(AIMessage(content=response))

    return state
