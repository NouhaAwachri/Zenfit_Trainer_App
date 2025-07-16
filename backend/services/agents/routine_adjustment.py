from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import AIMessage
import re

def classify_feedback_type(feedback):
    """
    Classify feedback as progress update, routine change request, or other
    Returns: 'progress', 'routine_change', or 'other'
    """
    feedback_lower = feedback.lower()
    
    # Progress indicators
    progress_keywords = [
        # Weight/reps mentions
        r'\d+\s*kg', r'\d+\s*lbs', r'\d+\s*pounds',
        r'\d+\s*reps?', r'\d+\s*sets?',
        # Progress phrases
        'i did', 'i completed', 'i managed', 'i benched', 'i squatted',
        'i deadlifted', 'i lifted', 'i ran', 'i walked',
        'finished', 'completed', 'achieved', 'hit',
        # Feeling descriptions
        'felt good', 'felt great', 'felt easy', 'felt hard',
        'was tough', 'was easy', 'went well'
    ]
    
    # Routine change indicators
    change_keywords = [
        # Direct requests
        'change', 'modify', 'update', 'adjust', 'new routine',
        'different workout', 'switch', 'replace',
        # Problems/limitations
        'no jumping', 'cant jump', "can't jump", 'avoid jumping',
        'too hard', 'too easy', 'too difficult', 'easier',
        'injury', 'hurt', 'pain', 'sore', 'injured',
        'no equipment', 'different equipment', 'at home',
        # Preferences
        'prefer', 'would rather', 'instead of', 'dont like', "don't like",
        'hate', 'love', 'enjoy', 'boring'
    ]
    
    # Count matches
    progress_matches = 0
    change_matches = 0
    
    for keyword in progress_keywords:
        if re.search(keyword, feedback_lower):
            progress_matches += 1
    
    for keyword in change_keywords:
        if keyword in feedback_lower:
            change_matches += 1
    
    # Decision logic
    if progress_matches > change_matches and progress_matches > 0:
        return 'progress'
    elif change_matches > 0:
        return 'routine_change'
    else:
        return 'other'

def routine_adjustment_agent(state, llm):
    user_data = state.get("user_data", {})

    # Extract values from user_data safely
    goal = user_data.get("goal", "N/A")
    experience = user_data.get("experience", "N/A")
    equipment = user_data.get("equipment", "N/A")
    firebase_uid = user_data.get("firebase_uid", "N/A")
    name = user_data.get("name", "athlete")

    feedback_text = state.get("feedback", "")
    current_plan = state.get("fitness_plan", "")

    # Classify the feedback type
    feedback_type = classify_feedback_type(feedback_text)
    
    print(f"📊 Feedback classified as: {feedback_type}")
    print(f"📤 Original feedback: {feedback_text}")

    # Handle different feedback types
    if feedback_type == 'progress':
        # Progress update - acknowledge and encourage
        response_prompt = ChatPromptTemplate.from_template(
            """You are a supportive fitness coach responding to a progress update.

The user reported: "{feedback}"

Respond with:
1. Congratulations on their progress
2. Ask 1-2 follow-up questions about how it felt
3. Give brief encouragement to continue
4. DO NOT change their routine unless they specifically ask

Keep it conversational and supportive. Start with "Hey {name}!"

Example: "Hey John! That's awesome that you benched 80kg for 8 reps! How did it feel? Was it challenging or do you think you could push for more reps next time? Keep up the great work!"
"""
        )
        
        chain = response_prompt | llm | StrOutputParser()
        
        response = chain.invoke({
            "name": name,
            "feedback": feedback_text
        })
        
        # Don't change the fitness plan, just add encouragement
        state["messages"].append(AIMessage(content=response))
        
    elif feedback_type == 'routine_change':
        # Routine change request - use your original logic
        routine_change_prompt = ChatPromptTemplate.from_template(
            """You are an expert AI fitness coach.

Given the user's **current workout plan** and **feedback**, revise the plan.

🚨 CRITICAL RULE - READ THIS FIRST:
If the user mentions "no jumping" anywhere in their feedback, you MUST NOT include ANY of these exercises:
- Jumping Jacks
- Jump rope  
- Burpees
- Box jumps
- Mountain climbers
- Squat jumps
- Jumping lunges
- ANY exercise that involves jumping movements

Instead, replace with: marching in place, step-ups, regular squats, plank holds, or walking movements.

---
👤 **User Info**:
- Firebase UID: {firebase_uid}
- Goal: {goal}
- Experience: {experience}
- Equipment: {equipment}

📋 **Current Plan**:
{current_plan}

💬 **User Feedback**:
{feedback}

---

BEFORE writing the plan, ask yourself: "Did the user say no jumping? If yes, I must avoid ALL jumping exercises."

🎯 Write a **new plan from scratch if needed**, based on feedback.

Use this structure:
- Start with:
  _"Hey {name}! Based on your goal of {goal} and your feedback, here's an updated routine tailored just for you..."_

- Format each day like:
  **Day 1: Upper Body Strength (Approx. 45 mins)**
  - Warm-up (5 min): Arm circles
  - Exercise 1 (10 min): Push-ups — 3 sets of 12 reps, 60s rest
  ...
  
- Add estimated **duration** per exercise.
- Use a friendly, motivating tone.

✅ Tips: Stay consistent, track progress, and take rest when needed!
💪 You're doing great — keep it up!
"""
        )
        
        if hasattr(llm, 'bind'):
            chain = routine_change_prompt | llm.bind(temperature=0.1) | StrOutputParser()
        else:
            chain = routine_change_prompt | llm | StrOutputParser()

        updated_plan = chain.invoke({
            "firebase_uid": firebase_uid,
            "goal": goal,
            "experience": experience,
            "equipment": equipment,
            "name": name,
            "current_plan": current_plan,
            "feedback": feedback_text,
        })

        print("📥 LLM responded with (first 300 chars):\n", updated_plan[:300])

        # Save to state
        state["fitness_plan"] = updated_plan
        state["messages"].append(AIMessage(content=f"🔄 Updated Plan:\n\n{updated_plan}"))
        
    else:
        # Other feedback - general response
        general_prompt = ChatPromptTemplate.from_template(
            """You are a helpful fitness coach. The user said: "{feedback}"

Respond helpfully and ask clarifying questions if needed. Keep it conversational and supportive. Start with "Hey {name}!"

If they're asking for routine changes, ask them to be more specific about what they want changed.
"""
        )
        
        chain = general_prompt | llm | StrOutputParser()
        
        response = chain.invoke({
            "name": name,
            "feedback": feedback_text
        })
        
        state["messages"].append(AIMessage(content=response))

def routine_adjustment_agent(state, llm):
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import StrOutputParser
    from langchain_core.messages import AIMessage

    import re

    def classify_feedback_type(feedback):
        feedback_lower = feedback.lower()
        progress_keywords = [
            r'\d+\s*kg', r'\d+\s*lbs', r'\d+\s*pounds',
            r'\d+\s*reps?', r'\d+\s*sets?',
            'i did', 'i completed', 'i managed', 'i benched', 'i squatted',
            'i deadlifted', 'i lifted', 'i ran', 'i walked',
            'finished', 'completed', 'achieved', 'hit',
            'felt good', 'felt great', 'felt easy', 'felt hard',
            'was tough', 'was easy', 'went well'
        ]
        change_keywords = [
            'change', 'modify', 'update', 'adjust', 'new routine',
            'different workout', 'switch', 'replace',
            'no jumping', 'cant jump', "can't jump", 'avoid jumping',
            'too hard', 'too easy', 'too difficult', 'easier',
            'injury', 'hurt', 'pain', 'sore', 'injured',
            'no equipment', 'different equipment', 'at home',
            'prefer', 'would rather', 'instead of', 'dont like', "don't like",
            'hate', 'love', 'enjoy', 'boring'
        ]
        progress_matches = sum(1 for kw in progress_keywords if re.search(kw, feedback_lower))
        change_matches = sum(1 for kw in change_keywords if kw in feedback_lower)

        if progress_matches > change_matches and progress_matches > 0:
            return 'progress'
        elif change_matches > 0:
            return 'routine_change'
        else:
            return 'other'

    user_data = state.get("user_data", {})
    goal = user_data.get("goal", "N/A")
    experience = user_data.get("experience", "N/A")
    equipment = user_data.get("equipment", "N/A")
    firebase_uid = user_data.get("firebase_uid", "N/A")
    name = user_data.get("name", "athlete")

    feedback_text = state.get("feedback", "")
    current_plan = state.get("fitness_plan", "")
    feedback_type = classify_feedback_type(feedback_text)

    print(f"📊 Feedback classified as: {feedback_type}")
    print(f"📤 Original feedback: {feedback_text}")

    if feedback_type == 'progress':
        response_prompt = ChatPromptTemplate.from_template(
            """You are a supportive fitness coach responding to a progress update.

The user reported: "{feedback}"

Respond with:
1. Congratulations on their progress
2. Ask 1-2 follow-up questions about how it felt
3. Give brief encouragement to continue
4. DO NOT change their routine unless they specifically ask

Keep it conversational and supportive. Start with "Hey {name}!"
"""
        )
        chain = response_prompt | llm | StrOutputParser()
        response = chain.invoke({"name": name, "feedback": feedback_text})
        state["messages"].append(AIMessage(content=response))

    elif feedback_type == 'routine_change':
        routine_change_prompt = ChatPromptTemplate.from_template(
            """You are an expert AI fitness coach.

Given the user's **current workout plan** and **feedback**, revise the plan.

🚨 CRITICAL RULES:

1. If the user says **"no jumping"**, do NOT include:
- Jumping Jacks
- Jump rope  
- Burpees
- Box jumps
- Mountain climbers
- Squat jumps
- Jumping lunges
- Any jumping-based movement

2. If the user **mentions disliking, hating, or not liking a specific exercise** (e.g. "I don't like crunches"), you MUST:
- Completely REMOVE that exercise and similar variants (e.g. replace crunches and bicycle crunches with planks or leg raises).
- NEVER include it again in the updated plan.
- Choose a functionally equivalent but different alternative.

---
👤 **User Info**:
- Firebase UID: {firebase_uid}
- Goal: {goal}
- Experience: {experience}
- Equipment: {equipment}

📋 **Current Plan**:
{current_plan}

💬 **User Feedback**:
{feedback}

---
Write a NEW PLAN from scratch if needed, based on the user's feedback.

Use this structure:
- Start with: _"Hey {name}! Based on your goal of {goal} and your feedback, here's an updated routine tailored just for you..."_
- Format each day like:  
  **Day 1: Upper Body Strength (Approx. 45 mins)**  
  - Warm-up (5 min): Arm circles  
  - Exercise 1 (10 min): Push-ups — 3 sets of 12 reps, 60s rest  

✅ Keep it motivational, friendly, and supportive.
💪 You're doing great — keep it up!
"""
        )
        if hasattr(llm, 'bind'):
            chain = routine_change_prompt | llm.bind(temperature=0.1) | StrOutputParser()
        else:
            chain = routine_change_prompt | llm | StrOutputParser()

        updated_plan = chain.invoke({
            "firebase_uid": firebase_uid,
            "goal": goal,
            "experience": experience,
            "equipment": equipment,
            "name": name,
            "current_plan": current_plan,
            "feedback": feedback_text,
        })

        print("📥 LLM responded with (first 300 chars):\n", updated_plan[:300])
        state["fitness_plan"] = updated_plan
        state["messages"].append(AIMessage(content=f"🔄 Updated Plan:\n\n{updated_plan}"))

    else:
        general_prompt = ChatPromptTemplate.from_template(
            """You are a helpful fitness coach. The user said: "{feedback}"

Respond helpfully and ask clarifying questions if needed. Keep it conversational and supportive. Start with "Hey {name}!"

If they're asking for routine changes, ask them to be more specific about what they want changed.
"""
        )
        chain = general_prompt | llm | StrOutputParser()
        response = chain.invoke({"name": name, "feedback": feedback_text})
        state["messages"].append(AIMessage(content=response))

    return state
