# agents/routine_adjustment.py

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
        'different workout', 'switch', 'replace', 'rewrite',
        'entire program', 'whole program', 'full program',
        'no jumping', 'cant jump', "can't jump", 'avoid jumping',
        'too hard', 'too easy', 'too difficult', 'easier',
        'injury', 'hurt', 'pain', 'sore', 'injured',
        'no equipment', 'different equipment', 'at home',
        'prefer', 'would rather', 'instead of', 'dont like', "don't like",
        'hate', 'love', 'enjoy', 'boring', 'day 1', 'day 2', 'day 3', 'day 4',
        'full body', 'upper body', 'lower body', 'cardio',
        'bands', 'bodyweight', 'no dumbbell', 'using bands'
    ]
    progress_matches = sum(1 for kw in progress_keywords if re.search(kw, feedback_lower))
    change_matches = sum(1 for kw in change_keywords if kw in feedback_lower)

    if progress_matches > change_matches and progress_matches > 0:
        return 'progress'
    elif change_matches > 0:
        return 'routine_change'
    else:
        return 'other'

def extract_day_from_feedback(feedback):
    """Extract which day the user wants to modify"""
    feedback_lower = feedback.lower()
    day_patterns = [
        r'day\s*(\d+)',
        r'day\s*(\w+)',
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
    
    return None

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
    for day_num in [1, 2, 3, 4]:
        day_key = f"Day {day_num}"
        if day_key in updated_days:
            full_plan.append(updated_days[day_key])
    
    return '\n\n'.join(full_plan)

def routine_adjustment_agent(state, llm):
    user_data = state.get("user_data", {})
    goal = user_data.get("goal", "N/A")

    # Handle equipment robustly
    equipment = user_data.get("equipment", [])
    if isinstance(equipment, list):
        equipment_str = ", ".join(equipment) if equipment else "bodyweight only"
    else:
        equipment_str = str(equipment) if equipment else "bodyweight only"

    print(f"User equipment preferences: {equipment_str}")

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
1. Congratulations on their progress.
2. Ask 1-2 follow-up questions about how it felt.
3. Give brief encouragement to continue.
4. DO NOT change their routine unless they specifically ask.

Keep it conversational and supportive. Start with "Hey {name}!"
"""
        )
        chain = response_prompt | llm | StrOutputParser()
        response = chain.invoke({"name": name, "feedback": feedback_text})
        state["messages"].append(AIMessage(content=response))

    elif feedback_type == 'routine_change':
        # Extract which day to modify
        target_day = extract_day_from_feedback(feedback_text)
        
        if target_day and current_plan:
            # Parse current plan into days
            days_dict = parse_current_plan_by_days(current_plan)
            
            routine_change_prompt = ChatPromptTemplate.from_template(
"""You are an expert AI fitness coach. The user wants to modify {target_day} of their workout plan.

⚠️ CRITICAL RULES - YOU MUST FOLLOW ALL OF THESE:

1. EQUIPMENT RESTRICTION: The user has access to: {equipment}
   - You MUST ONLY use equipment from this list
   - If equipment list says "bodyweight only" or "bands" - use ONLY those
   - NEVER include dumbbells, barbells, or gym equipment unless specifically listed

2. NO JUMPING RULE: You MUST NOT include ANY jumping exercises such as:
   - Jumping Jacks, Jump Rope, Burpees, Box Jumps, Mountain Climbers
   - Squat Jumps, Jumping Lunges, Plyometric exercises, etc.

3. SPECIFIC DAY MODIFICATION: Only modify {target_day} as requested
   - Keep the same day structure and timing
   - Focus on the specific requirements mentioned in the feedback

User Info:
- Goal: {goal}
- Available Equipment: {equipment}
- Target Day: {target_day}

Current {target_day} content:
{current_day_content}

User's Request: "{feedback}"

TASK: Rewrite ONLY {target_day} according to the user's specific request. Follow the format below:

**{target_day}: [New Title] (Approx. [X] mins)**

- **Warm-up (5 min):** [NO jumping movements - use arm circles, marching in place, bodyweight squats, gentle stretches]

- **Main Sets:**
  - [Exercise 1 using only allowed equipment]: [sets] x [reps]
  - [Exercise 2 using only allowed equipment]: [sets] x [reps]
  - [Continue with appropriate exercises]

- **Cool-down (5 min):** [Stretching routine]

✅ **Training Tips:** Log your workouts, stay consistent, hydrate daily.  
💬 **You got this! Let's crush your goal.**

Remember: Use ONLY the equipment listed, NO jumping exercises, and follow the user's specific request for this day.
""")
            
            current_day_content = days_dict.get(target_day, "No content found for this day")
            
            if hasattr(llm, 'bind'):
                chain = routine_change_prompt | llm.bind(temperature=0.1) | StrOutputParser()
            else:
                chain = routine_change_prompt | llm | StrOutputParser()

            new_day_content = chain.invoke({
                "target_day": target_day,
                "firebase_uid": firebase_uid,
                "goal": goal,
                "equipment": equipment_str,
                "current_day_content": current_day_content,
                "feedback": feedback_text,
            })

            # Reconstruct the full plan with the updated day
            updated_full_plan = reconstruct_plan(days_dict, target_day, new_day_content)
            
            print(f"📥 Updated {target_day} (first 300 chars):\n", new_day_content[:300])
            state["fitness_plan"] = updated_full_plan
            state["messages"].append(AIMessage(content=f"🔄 I've updated {target_day} based on your request:\n\n{new_day_content}"))
        
        else:
            # General routine change without specific day OR full program rewrite
            is_full_rewrite = any(phrase in feedback_text.lower() for phrase in [
                'rewrite the entire', 'rewrite entire', 'entire program', 'whole program', 
                'full program', 'rewrite the program', 'rewrite program'
            ])
            
            if is_full_rewrite:
                routine_change_prompt = ChatPromptTemplate.from_template(
"""You are an expert AI fitness coach. The user wants you to REWRITE THE ENTIRE WORKOUT PROGRAM.

⚠️ CRITICAL RULES - FOLLOW ALL OF THESE:

1. EQUIPMENT RESTRICTION: User has access to: {equipment}
   - You MUST ONLY use equipment from this list
   - If "bands" - use ONLY resistance bands and bodyweight exercises
   - NEVER include dumbbells, barbells, or gym equipment unless specifically listed

2. ABSOLUTELY NO JUMPING EXERCISES: 
   - NO Jumping Jacks, Jump Rope, Burpees, Box Jumps, Mountain Climbers
   - NO Squat Jumps, Jumping Lunges, High Knees, or ANY plyometric movements
   - Use alternatives like: arm circles, marching in place, bodyweight squats, walking lunges

3. REWRITE THE ENTIRE 4-DAY PROGRAM incorporating their feedback: "{feedback}"

User Info:
- Goal: {goal}
- Available Equipment: {equipment}

TASK: Create a COMPLETE 4-day workout program. Format exactly like this:

## Hey Athlete, based on your goal of **{goal}**, here's your optimized 4-day workout plan:

**Day 1: [Workout Type] (Approx. [X] min)**
- Warm-up (5 min): [NO jumping movements - use arm circles, marching, gentle movements]
- [List exercises using ONLY allowed equipment]
- [Continue with sets/reps]

✅ **Training Tips**: Log your workouts, stay consistent, hydrate daily.  
💬 **You got this! Let's crush your goal.**

**Day 2: [Workout Type] (Approx. [X] min)**
- [Same format, following user's specific request]

**Day 3: [Workout Type] (Approx. [X] min)**
- [Same format]

**Day 4: [Workout Type] (Approx. [X] min)**
- [Same format]

REMEMBER: NO jumping exercises anywhere, use ONLY the allowed equipment, and incorporate the user's specific feedback.
""")
            else:
                routine_change_prompt = ChatPromptTemplate.from_template(
"""You are an expert AI fitness coach helping adjust a workout plan.

⚠️ CRITICAL RULES:

1. EQUIPMENT: User has access to: {equipment}
   - Use ONLY the listed equipment
   - If "bodyweight only" - use NO equipment at all
   - If "bands" - use resistance bands and bodyweight only

2. NO JUMPING: Absolutely NO jumping exercises (Jumping Jacks, Burpees, Mountain Climbers, High Knees, etc.)

3. RESPECT USER REQUEST: Follow their specific feedback exactly

User Info:
- Goal: {goal}
- Equipment: {equipment}

Current Plan:
{current_plan}

User Request: "{feedback}"

Please provide the adjusted workout plan based on their feedback, following all the rules above.
""")

            if hasattr(llm, 'bind'):
                chain = routine_change_prompt | llm.bind(temperature=0.1) | StrOutputParser()
            else:
                chain = routine_change_prompt | llm | StrOutputParser()

            updated_plan = chain.invoke({
                "firebase_uid": firebase_uid,
                "goal": goal,
                "equipment": equipment_str,
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