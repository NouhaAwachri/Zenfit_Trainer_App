# agents/routine_adjustment.py - FIXED VERSION

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import AIMessage, HumanMessage
from models.conversation_model import Conversation, Message
from models.workout_program import WorkoutProgram
from models.workoutLog_model import WorkoutLog, WorkoutExercise
from models.user_profile import UserProfile
from models.db import db
from datetime import datetime, timedelta
from sqlalchemy import desc
import re
import json

def routine_adjustment_agent(state, llm):
    """
    Direct adjustment agent that modifies the workout plan and returns ONLY the complete modified plan.
    Properly respects user equipment, restrictions, and requests.
    """
    user_data = state.get("user_data", {})
    goal = user_data.get("goal", "General Fitness")
    firebase_uid = user_data.get("firebase_uid", "N/A")
    name = user_data.get("name", "athlete")
    
    # Handle equipment properly
    equipment = user_data.get("equipment", [])
    if isinstance(equipment, list):
        equipment_str = ", ".join(equipment) if equipment else "bodyweight only"
    else:
        equipment_str = str(equipment) if equipment else "bodyweight only"
    
    # Handle restrictions properly
    restrictions = user_data.get("restrictions", [])
    if not isinstance(restrictions, list):
        restrictions = [restrictions] if restrictions else []

    # Get user's request and current plan
    user_request = state.get("feedback", "")
    current_plan = state.get("fitness_plan", "")
    
    print(f"🎯 User Request: {user_request}")
    print(f"🛠️ Equipment: {equipment_str}")
    print(f"🚫 Restrictions: {restrictions}")

    # If no specific request, return current plan with proper filtering
    if not user_request.strip():
        filtered_plan = apply_equipment_and_restrictions(current_plan, equipment_str, restrictions)
        state["fitness_plan"] = filtered_plan
        state["messages"].append(AIMessage(content=filtered_plan))
        return state

    # Analyze the user request to determine intent
    request_intent = analyze_user_intent(user_request)
    print(f"🧠 Detected intent: {request_intent}")
    
    modified_plan = current_plan
    
    # Handle different types of requests with direct plan modifications
    if request_intent == "remove_day":
        day_to_remove = extract_day_from_feedback(user_request)
        if day_to_remove:
            print(f"🗑️ Removing Day {day_to_remove} from plan...")
            modified_plan = remove_day_from_plan(current_plan, day_to_remove)
            
    elif request_intent == "reduce_days":
        target_days = extract_target_days(user_request)
        if target_days and target_days < 7:
            print(f"🔢 Reducing plan to {target_days} days...")
            modified_plan = reduce_days_in_plan(current_plan, target_days)
            
    elif request_intent == "remove_exercise":
        exercise_name = extract_exercise_name(user_request)
        if exercise_name:
            print(f"🏋️ Removing exercise: {exercise_name}")
            modified_plan = remove_exercise_from_plan(current_plan, exercise_name)
            
    elif request_intent == "replace_exercise":
        old_exercise = extract_old_exercise(user_request)
        new_exercise = extract_new_exercise(user_request)
        if old_exercise and new_exercise:
            print(f"🔄 Replacing '{old_exercise}' with '{new_exercise}'")
            modified_plan = replace_exercise_in_plan(current_plan, old_exercise, new_exercise)
    
    elif request_intent == "add_restrictions":
        # Handle new restrictions like "remove all jumping"
        new_restrictions = extract_new_restrictions(user_request)
        restrictions.extend(new_restrictions)
        modified_plan = current_plan
        print(f"➕ Added restrictions: {new_restrictions}")
    
    else:
        # For complex modifications, use LLM with strict formatting
        modified_plan = handle_complex_modification(
            current_plan, user_request, goal, equipment_str, restrictions, llm
        )
    
    # Apply equipment and restriction filters
    modified_plan = apply_equipment_and_restrictions(modified_plan, equipment_str, restrictions)
    
    # Ensure proper format matching the original generation
    modified_plan = ensure_exact_generation_format(modified_plan, equipment_str, goal)
    
    # Update state with the modified plan
    state["fitness_plan"] = modified_plan
    
    # Return ONLY the plan as the response
    state["messages"].append(AIMessage(content=modified_plan))
    
    print("✅ Plan modified and returned")
    return state

def handle_complex_modification(current_plan, user_request, goal, equipment_str, restrictions, llm):
    """Handle complex modifications using LLM with strict output control"""
    
    # Build restriction constraints
    restriction_text = build_restriction_constraints(equipment_str, restrictions)
    
    adjustment_prompt = ChatPromptTemplate.from_template(
        """You are a fitness plan modifier. Modify the workout plan according to the user's request and return ONLY the complete modified workout plan in the EXACT format shown.

USER PROFILE:
- Goal: {goal}
- Equipment Available: {equipment}
- Restrictions: {restriction_constraints}

CURRENT WORKOUT PLAN:
{current_plan}

USER REQUEST: "{user_request}"

CRITICAL INSTRUCTIONS:
1. You MUST respect the equipment constraint: {equipment}
2. You MUST respect these restrictions: {restriction_constraints}
3. Return ONLY the workout plan - NO explanations, NO chat, NO additional text
4. Use the EXACT format from the current plan
5. Keep the same structure: warm-up, main workout, cool-down sections
6. Maintain the same exercise format: "- Exercise: X sets x X reps, Rest: X sec"
7. If equipment is "bodyweight only" - use NO equipment-based exercises
8. Apply all restrictions strictly

EXAMPLE CORRECT FORMAT:
## 4-Day Cardio Focus Workout Plan for Endurance

This 4-day workout plan is designed for Endurance using bodyweight only. Each workout takes 30-45 minutes.

### Day 1: Upper Body
**Warm-up (5-10 min):**
- Arm circles: 30 seconds
- Leg swings: 10 each leg

**Main Workout (30-35 min):**
- Push-ups: 3 sets x 10 reps, Rest: 60 sec
- Mountain climbers: 3 sets x 14 reps, Rest: 60 sec

**Cool-down (5 min):**
- Full body stretch: 30 seconds per muscle group
- Deep breathing: 1 minute

## Training Notes:
- **Progression:** Increase reps by 2-3 each week
- **Rest:** Take at least 1 day of rest between workout days
- **Form:** Focus on proper form over speed
- **Frequency:** Perform 4 days per week with rest days in between

RETURN ONLY THE WORKOUT PLAN IN THIS EXACT FORMAT:
"""
    )

    # Execute the prompt
    chain = adjustment_prompt | llm | StrOutputParser()
    
    llm_response = chain.invoke({
        "goal": goal,
        "equipment": equipment_str,
        "restriction_constraints": restriction_text,
        "current_plan": current_plan,
        "user_request": user_request
    })
    
    # Extract only the plan part from LLM response
    modified_plan = extract_clean_plan(llm_response)
    return modified_plan

def build_restriction_constraints(equipment_str, restrictions):
    """Build clear constraint text for the LLM"""
    constraints = []
    
    # Equipment constraints
    if "bodyweight only" in equipment_str.lower():
        constraints.append("NO equipment-based exercises (dumbbells, barbells, machines, etc.)")
    
    # Specific restrictions
    for restriction in restrictions:
        restriction_lower = restriction.lower()
        if "no jumping" in restriction_lower or "remove jumping" in restriction_lower:
            constraints.append("NO jumping exercises (jumping jacks, burpees, jump squats, etc.)")
        if "no dumbbell" in restriction_lower:
            constraints.append("NO dumbbell exercises")
        if "no running" in restriction_lower:
            constraints.append("NO running exercises")
        if "no high impact" in restriction_lower:
            constraints.append("NO high-impact exercises")
    
    return ". ".join(constraints) if constraints else "No specific restrictions"

def analyze_user_intent(user_request):
    """Enhanced analysis of user intent with better pattern matching"""
    if not user_request:
        return "general_modification"
        
    request_lower = user_request.lower().strip()
    
    # Remove entire day patterns
    day_removal_patterns = [
        r'remove day \d+',
        r'delete day \d+',
        r'take out day \d+',
        r'get rid of day \d+',
        r'eliminate day \d+',
        r'skip day \d+'
    ]
    
    for pattern in day_removal_patterns:
        if re.search(pattern, request_lower):
            return "remove_day"
    
    # Reduce to X days patterns
    reduce_days_patterns = [
        r'make it (\d+) days?',
        r'reduce to (\d+) days?',
        r'change to (\d+) days?',
        r'(\d+) days? per week',
        r'(\d+) days? only',
        r'only (\d+) days?'
    ]
    
    for pattern in reduce_days_patterns:
        if re.search(pattern, request_lower):
            return "reduce_days"
    
    # Remove specific exercise patterns - Enhanced
    exercise_removal_keywords = [
        'jumping jacks', 'jumping jack', 'jump',
        'burpees', 'burpee',
        'push ups', 'push-ups', 'pushups', 'push up',
        'squats', 'squat',
        'lunges', 'lunge',
        'planks', 'plank',
        'sit ups', 'sit-ups', 'situps',
        'pull ups', 'pull-ups', 'pullups',
        'mountain climbers', 'mountain climber',
        'high knees', 'butt kicks',
        'crunches', 'crunch',
        'tricep dips', 'tricep dip'
    ]
    
    removal_indicators = ['remove', 'delete', 'take out', 'get rid of', 'eliminate', 'no more', 'skip']
    
    for indicator in removal_indicators:
        if indicator in request_lower:
            for exercise in exercise_removal_keywords:
                if exercise in request_lower:
                    return "remove_exercise"
    
    # Special case for "remove all jumping" type requests
    if any(phrase in request_lower for phrase in ['remove all jumping', 'no jumping', 'remove jumping', 'eliminate jumping']):
        return "add_restrictions"
    
    # Replace exercise patterns
    replace_patterns = [
        r'replace.*?with',
        r'substitute.*?with',
        r'change.*?to',
        r'swap.*?for'
    ]
    
    for pattern in replace_patterns:
        if re.search(pattern, request_lower):
            return "replace_exercise"
    
    # Default to general modification
    return "general_modification"

def extract_new_restrictions(user_request):
    """Extract new restrictions from user request"""
    request_lower = user_request.lower()
    new_restrictions = []
    
    if any(phrase in request_lower for phrase in ['remove all jumping', 'no jumping', 'remove jumping', 'eliminate jumping']):
        new_restrictions.append("no jumping")
    
    if any(phrase in request_lower for phrase in ['no equipment', 'bodyweight only', 'remove equipment']):
        new_restrictions.append("bodyweight only")
        
    return new_restrictions

def extract_exercise_name(feedback):
    """Enhanced exercise name extraction"""
    feedback_lower = feedback.lower().strip()
    
    # Common exercise names with variations
    exercise_patterns = {
        'jumping': ['jumping jacks', 'jumping jack', 'jump', 'jumping'],
        'burpees': ['burpees', 'burpee'],
        'push-ups': ['push ups', 'push-ups', 'pushups', 'push up'],
        'squats': ['squats', 'squat'],
        'lunges': ['lunges', 'lunge'],
        'planks': ['planks', 'plank'],
        'mountain climbers': ['mountain climbers', 'mountain climber'],
        'high knees': ['high knees'],
        'butt kicks': ['butt kicks'],
        'tricep dips': ['tricep dips', 'tricep dip'],
        'crunches': ['crunches', 'crunch'],
        'sit-ups': ['sit ups', 'sit-ups', 'situps']
    }
    
    for standard_name, variations in exercise_patterns.items():
        for variation in variations:
            if variation in feedback_lower:
                return standard_name
    
    # Generic extraction for other exercises
    removal_patterns = [
        r'remove\s+([a-zA-Z\s\-]+?)(?:\s|$|,|\.|\bfrom\b)',
        r'delete\s+([a-zA-Z\s\-]+?)(?:\s|$|,|\.|\bfrom\b)',
        r'take out\s+([a-zA-Z\s\-]+?)(?:\s|$|,|\.|\bfrom\b)',
        r'get rid of\s+([a-zA-Z\s\-]+?)(?:\s|$|,|\.|\bfrom\b)',
        r'eliminate\s+([a-zA-Z\s\-]+?)(?:\s|$|,|\.|\bfrom\b)',
        r'no more\s+([a-zA-Z\s\-]+?)(?:\s|$|,|\.|\bfrom\b)'
    ]
    
    for pattern in removal_patterns:
        match = re.search(pattern, feedback_lower)
        if match:
            potential_exercise = match.group(1).strip()
            # Filter out common words that aren't exercises
            stop_words = ['the', 'all', 'any', 'of', 'in', 'from', 'exercises', 'workout']
            if potential_exercise not in stop_words and len(potential_exercise) > 2:
                return potential_exercise
    
    return None

def apply_equipment_and_restrictions(plan_text, equipment_str, restrictions):
    """Apply equipment and restriction filters to the plan"""
    if not plan_text:
        return plan_text
    
    modified_plan = plan_text
    
    # Handle bodyweight only constraint
    if "bodyweight only" in equipment_str.lower():
        modified_plan = remove_equipment_exercises(modified_plan)
    
    # Handle specific restrictions
    for restriction in restrictions:
        restriction_lower = restriction.lower()
        
        if "no jumping" in restriction_lower:
            modified_plan = remove_jumping_exercises(modified_plan)
        
        if "no dumbbell" in restriction_lower:
            modified_plan = remove_dumbbell_exercises(modified_plan)
    
    return modified_plan

def remove_equipment_exercises(plan_text):
    """Remove all equipment-based exercises"""
    equipment_keywords = [
        'dumbbell', 'barbell', 'kettlebell', 'cable', 'machine',
        'weight', 'bench press', 'deadlift', 'bicep curl',
        'tricep extension', 'lat pulldown', 'leg press'
    ]
    
    lines = plan_text.split('\n')
    filtered_lines = []
    
    for line in lines:
        line_lower = line.lower()
        # Check if this line contains an exercise with equipment
        is_equipment_exercise = False
        for keyword in equipment_keywords:
            if keyword in line_lower and ('sets' in line_lower or 'reps' in line_lower):
                is_equipment_exercise = True
                break
        
        if not is_equipment_exercise:
            filtered_lines.append(line)
    
    return '\n'.join(filtered_lines)

def remove_jumping_exercises(plan_text):
    """Remove all jumping-related exercises"""
    jumping_patterns = [
        r'(?i).*jumping jacks.*\n?',
        r'(?i).*burpees.*\n?',
        r'(?i).*jump.*(?:sets|reps).*\n?',
        r'(?i).*high knees.*\n?',
        r'(?i).*butt kicks.*\n?',
        r'(?i).*box jumps.*\n?',
        r'(?i).*squat jumps.*\n?',
        r'(?i).*jumping lunges.*\n?'
    ]
    
    modified_plan = plan_text
    for pattern in jumping_patterns:
        modified_plan = re.sub(pattern, '', modified_plan)
    
    # Clean up any double newlines
    modified_plan = re.sub(r'\n\n+', '\n\n', modified_plan)
    
    return modified_plan

def remove_dumbbell_exercises(plan_text):
    """Remove dumbbell-specific exercises"""
    dumbbell_pattern = r'(?i).*dumbbell.*(?:sets|reps).*\n?'
    return re.sub(dumbbell_pattern, '', plan_text)

def extract_clean_plan(response):
    """Extract clean workout plan from LLM response"""
    if not response:
        return ""
    
    # Look for plan start markers
    plan_start_patterns = [
        r'## \d+-Day.*?Plan',
        r'# \d+-Day.*?Plan',
        r'### Day 1:'
    ]
    
    plan_start = 0
    for pattern in plan_start_patterns:
        match = re.search(pattern, response, re.IGNORECASE)
        if match:
            plan_start = match.start()
            break
    
    # Extract from plan start to end
    clean_response = response[plan_start:].strip()
    
    # Remove any conversational text at the beginning
    lines = clean_response.split('\n')
    plan_lines = []
    found_plan_start = False
    
    for line in lines:
        # Skip conversational lines before the actual plan
        if not found_plan_start:
            if line.startswith('#') or 'Day 1:' in line or '**Warm-up' in line:
                found_plan_start = True
            elif any(phrase in line.lower() for phrase in [
                "here's", "i've", "modified", "updated", "according to"
            ]):
                continue
        
        if found_plan_start or line.startswith('#') or 'Day' in line:
            plan_lines.append(line)
    
    return '\n'.join(plan_lines).strip()

def ensure_exact_generation_format(plan_text, equipment_str, goal):
    """Ensure the plan matches the exact format from generation agent"""
    if not plan_text:
        return plan_text
    
    # Extract key information
    day_count = len(re.findall(r'### Day \d+:', plan_text))
    if day_count == 0:
        day_count = 4  # Default fallback
    
    # Extract or determine plan style
    style_match = re.search(r'## \d+-Day ([^\\n]+?) Workout Plan', plan_text)
    if style_match:
        style = style_match.group(1).strip()
    else:
        style = "Cardio Focus"  # Default from your example
    
    # Create proper header with description
    header_lines = [
        f"## {day_count}-Day {style} Workout Plan for {goal}",
        "",
        f"This {day_count}-day workout plan is designed for {goal} using {equipment_str}. Each workout takes 30-45 minutes.",
        ""
    ]
    
    # Extract content starting from first day
    content_start = plan_text.find('### Day 1:')
    if content_start != -1:
        content = plan_text[content_start:]
    else:
        # If no Day 1 found, try to preserve existing content
        lines = plan_text.split('\n')
        content_lines = []
        for line in lines:
            if line.startswith('### Day') or line.startswith('**') or line.startswith('- ') or line.startswith('## Training'):
                content_lines.append(line)
        content = '\n'.join(content_lines)
    
    # Ensure Training Notes section exists
    if "## Training Notes:" not in content:
        training_notes = [
            "",
            "## Training Notes:",
            "- **Progression:** Increase reps by 2-3 each week",
            "- **Rest:** Take at least 1 day of rest between workout days",
            "- **Form:** Focus on proper form over speed",
            f"- **Frequency:** Perform {day_count} days per week with rest days in between"
        ]
        content += '\n'.join(training_notes)
    else:
        # Update frequency in existing notes
        content = re.sub(
            r'- \*\*Frequency:\*\* Perform \d+ days per week',
            f'- **Frequency:** Perform {day_count} days per week',
            content
        )
    
    # Combine header with content
    final_plan = '\n'.join(header_lines) + content
    
    return final_plan

# Keep all the existing helper functions (remove_day_from_plan, reduce_days_in_plan, etc.)
# but ensure they call ensure_exact_generation_format at the end

def remove_day_from_plan(plan_text, day_number):
    """Remove a specific day from the workout plan and reformat"""
    lines = plan_text.split('\n')
    result_lines = []
    skip_section = False
    day_counter = 0
    
    for line in lines:
        if re.match(r'###?\s*Day\s*\d+:', line, re.IGNORECASE):
            day_match = re.search(r'Day\s*(\d+)', line, re.IGNORECASE)
            if day_match and int(day_match.group(1)) == day_number:
                skip_section = True
                continue
            else:
                skip_section = False
                if not skip_section:
                    day_counter += 1
                    day_parts = line.split(':', 1)
                    if len(day_parts) > 1:
                        day_name = day_parts[1].strip()
                        line = f"### Day {day_counter}: {day_name}"
                    else:
                        line = f"### Day {day_counter}:"
        elif line.startswith('##') and not line.startswith('###'):
            skip_section = False
        
        if not skip_section:
            result_lines.append(line)
    
    result_text = '\n'.join(result_lines)
    
    # Extract equipment and goal for proper formatting
    equipment_match = re.search(r'using ([^\\n\\.]+?)\\. Each workout', result_text)
    equipment = equipment_match.group(1).strip() if equipment_match else "bodyweight only"
    
    goal_match = re.search(r'Plan for ([^\\n\\.]+)', result_text)
    goal = goal_match.group(1).strip() if goal_match else "General Fitness"
    
    return ensure_exact_generation_format(result_text, equipment, goal)

def reduce_days_in_plan(plan_text, target_days):
    """Reduce the plan to a specific number of days"""
    lines = plan_text.split('\n')
    result_lines = []
    current_day = 0
    skip_section = False
    day_counter = 0
    
    for line in lines:
        if re.match(r'###?\s*Day\s*\d+:', line, re.IGNORECASE):
            day_match = re.search(r'Day\s*(\d+)', line, re.IGNORECASE)
            if day_match:
                current_day = int(day_match.group(1))
                if current_day > target_days:
                    skip_section = True
                    continue
                else:
                    skip_section = False
                    day_counter += 1
                    day_parts = line.split(':', 1)
                    if len(day_parts) > 1:
                        day_name = day_parts[1].strip()
                        line = f"### Day {day_counter}: {day_name}"
                    else:
                        line = f"### Day {day_counter}:"
        elif line.startswith('##') and not line.startswith('###'):
            skip_section = False
        
        if not skip_section:
            result_lines.append(line)
    
    result_text = '\n'.join(result_lines)
    
    # Extract equipment and goal for proper formatting
    equipment_match = re.search(r'using ([^\\n\\.]+?)\\. Each workout', result_text)
    equipment = equipment_match.group(1).strip() if equipment_match else "bodyweight only"
    
    goal_match = re.search(r'Plan for ([^\\n\\.]+)', result_text)
    goal = goal_match.group(1).strip() if goal_match else "General Fitness"
    
    return ensure_exact_generation_format(result_text, equipment, goal)

def remove_exercise_from_plan(plan_text, exercise_name):
    """Remove a specific exercise from the workout plan"""
    lines = plan_text.split('\n')
    result_lines = []
    
    # Create flexible pattern to match the exercise
    exercise_patterns = []
    if exercise_name:
        # Handle different variations of the exercise name
        base_name = exercise_name.lower().replace('-', '').replace(' ', '')
        exercise_patterns = [
            re.compile(re.escape(exercise_name), re.IGNORECASE),
            re.compile(exercise_name.replace(' ', '[ -]'), re.IGNORECASE),
            re.compile(exercise_name.replace('-', '[ -]'), re.IGNORECASE)
        ]
    
    for line in lines:
        should_remove = False
        line_lower = line.lower()
        
        # Check if this line contains the target exercise
        for pattern in exercise_patterns:
            if pattern.search(line) and ('sets' in line_lower or 'reps' in line_lower or 'seconds' in line_lower):
                should_remove = True
                print(f"🗑️ Removing line: {line}")
                break
        
        if not should_remove:
            result_lines.append(line)
    
    result_text = '\n'.join(result_lines)
    
    # Clean up extra blank lines
    result_text = re.sub(r'\n\n\n+', '\n\n', result_text)
    
    # Extract equipment and goal for proper formatting
    equipment_match = re.search(r'using ([^\\n\\.]+?)\\. Each workout', result_text)
    equipment = equipment_match.group(1).strip() if equipment_match else "bodyweight only"
    
    goal_match = re.search(r'Plan for ([^\\n\\.]+)', result_text)
    goal = goal_match.group(1).strip() if goal_match else "General Fitness"
    
    return ensure_exact_generation_format(result_text, equipment, goal)

def replace_exercise_in_plan(plan_text, old_exercise, new_exercise):
    """Replace an exercise with another in the workout plan"""
    old_pattern = re.compile(re.escape(old_exercise), re.IGNORECASE)
    result_text = old_pattern.sub(new_exercise, plan_text)
    
    # Extract equipment and goal for proper formatting
    equipment_match = re.search(r'using ([^\\n\\.]+?)\\. Each workout', result_text)
    equipment = equipment_match.group(1).strip() if equipment_match else "bodyweight only"
    
    goal_match = re.search(r'Plan for ([^\\n\\.]+)', result_text)
    goal = goal_match.group(1).strip() if goal_match else "General Fitness"
    
    return ensure_exact_generation_format(result_text, equipment, goal)

def extract_day_from_feedback(feedback):
    """Extract which day the user wants to modify"""
    feedback_lower = feedback.lower()
    
    day_patterns = [
        r'day\s*(\d+)',
        r'day\s*(one|two|three|four|five|six|seven)',
        r'(\d+)(?:st|nd|rd|th)?\s*day'
    ]
    
    for pattern in day_patterns:
        match = re.search(pattern, feedback_lower)
        if match:
            day_ref = match.group(1)
            if day_ref.isdigit():
                return int(day_ref)
            else:
                day_map = {
                    'one': 1, 'two': 2, 'three': 3, 'four': 4,
                    'five': 5, 'six': 6, 'seven': 7
                }
                return day_map.get(day_ref, None)
    return None

def extract_target_days(feedback):
    """Extract target number of days from feedback"""
    feedback_lower = feedback.lower()
    
    patterns = [
        r'make it (\d+) days?',
        r'reduce to (\d+) days?',
        r'change to (\d+) days?',
        r'(\d+) days? per week',
        r'(\d+) days? only',
        r'only (\d+) days?'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, feedback_lower)
        if match:
            return int(match.group(1))
    
    return None

def extract_old_exercise(feedback):
    """Extract the exercise to be replaced"""
    feedback_lower = feedback.lower()
    
    patterns = [
        r'replace\s+([a-zA-Z\s\-]+?)\s+with',
        r'substitute\s+([a-zA-Z\s\-]+?)\s+with',
        r'change\s+([a-zA-Z\s\-]+?)\s+to',
        r'swap\s+([a-zA-Z\s\-]+?)\s+for'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, feedback_lower)
        if match:
            return match.group(1).strip()
    
    return None

def extract_new_exercise(feedback):
    """Extract the replacement exercise"""
    feedback_lower = feedback.lower()
    
    patterns = [
        r'with\s+([a-zA-Z\s\-]+?)(?:\s|$|,|\.)',
        r'to\s+([a-zA-Z\s\-]+?)(?:\s|$|,|\.)',
        r'for\s+([a-zA-Z\s\-]+?)(?:\s|$|,|\.)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, feedback_lower)
        if match:
            return match.group(1).strip()
    
    return None