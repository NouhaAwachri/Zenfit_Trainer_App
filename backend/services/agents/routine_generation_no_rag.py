#routine_generation_no_rag.py
import re
from langchain_core.messages import AIMessage

# Define your valid options exactly as your frontend dropdowns
VALID_GOALS = [
    "Muscle Gain",
    "Fat Loss", 
    "Strength Building",
    "Endurance",
    "General Fitness",
    "Athletic Performance",
    "Flexibility & Mobility",
    "Body Recomposition",
    "Powerlifting",
    "Bodybuilding"
]

VALID_EXPERIENCE = [
    "Complete Beginner",
    "Beginner (1-6 months)",
    "Intermediate (6 months - 2 years)",
    "Advanced (2-5 years)",
    "Expert (5+ years)"
]

VALID_EQUIPMENT = [
    "Full Gym Access",
    "Home Gym (Weights & Machines)", 
    "Basic Home Equipment (Dumbbells, Resistance Bands)",
    "Bodyweight Only",
    "Minimal Equipment (Dumbbells Only)",
    "Resistance Bands Only",
    "Kettlebells Only",
    "Outdoor/Park Equipment"
]

VALID_STYLES = [
    "Strength Training",
    "HIIT (High Intensity Interval Training)",
    "Cardio Focus",
    "Bodybuilding",
    "Powerlifting", 
    "CrossFit Style",
    "Yoga & Flexibility",
    "Circuit Training",
    "Functional Training",
    "Sports-Specific Training"
]

def get_default_style_for_goal(goal):
    """Return a default workout style based on the goal"""
    style_mapping = {
        "Fat Loss": "HIIT (High Intensity Interval Training)",
        "Muscle Gain": "Bodybuilding",
        "Strength Building": "Strength Training", 
        "Endurance": "Cardio Focus",
        "General Fitness": "Circuit Training",
        "Athletic Performance": "Functional Training",
        "Flexibility & Mobility": "Yoga & Flexibility",
        "Body Recomposition": "Circuit Training",
        "Powerlifting": "Powerlifting",
        "Bodybuilding": "Bodybuilding"
    }
    return style_mapping.get(goal, "Circuit Training")

def create_fallback_plan(days, style, goal, equipment_raw):
    """Create a reliable fallback plan without LLM generation"""
    
    # Base exercises for bodyweight workouts
    exercises = {
        "upper": ["Push-ups", "Tricep dips", "Mountain climbers", "Plank", "Pike push-ups"],
        "lower": ["Squats", "Lunges", "Glute bridges", "Wall sit", "Calf raises"],
        "cardio": ["Burpees", "Jumping jacks", "High knees", "Butt kicks", "Jump squats"],
        "core": ["Plank", "Crunches", "Leg raises", "Bicycle crunches", "Dead bug"]
    }
    
    plan = f"## {days}-Day {style} Workout Plan for {goal}\n\n"
    plan += f"This {days}-day workout plan is designed for {goal} using {equipment_raw.lower()}. Each workout takes 30-45 minutes.\n\n"
    
    # Generate days based on number of days requested
    for day in range(1, days + 1):
        if days == 1:
            focus = "Full Body"
            day_exercises = exercises["upper"][:2] + exercises["lower"][:2] + exercises["cardio"][:2]
        elif days == 2:
            focus = "Upper Body" if day == 1 else "Lower Body"
            day_exercises = exercises["upper"] if day == 1 else exercises["lower"]
        elif days == 3:
            focuses = ["Upper Body", "Lower Body", "Full Body Cardio"]
            focus = focuses[day - 1]
            if day == 1:
                day_exercises = exercises["upper"]
            elif day == 2: 
                day_exercises = exercises["lower"]
            else:
                day_exercises = exercises["cardio"]
        elif days == 4:
            focuses = ["Upper Body", "Lower Body", "Core & Cardio", "Full Body"]
            focus = focuses[day - 1]
            if day == 1:
                day_exercises = exercises["upper"]
            elif day == 2:
                day_exercises = exercises["lower"] 
            elif day == 3:
                day_exercises = exercises["core"] + exercises["cardio"][:2]
            else:
                day_exercises = exercises["upper"][:2] + exercises["lower"][:2] + exercises["cardio"][:1]
        else:  # 5+ days
            focuses = ["Push", "Pull", "Legs", "Core", "Full Body"]
            focus = focuses[(day - 1) % 5]
            day_exercises = exercises["upper"] if "Push" in focus or "Pull" in focus else exercises["lower"]
        
        plan += f"### Day {day}: {focus}\n"
        plan += "**Warm-up (5-10 min):**\n"
        plan += "- Jumping jacks: 30 seconds\n"
        plan += "- Arm circles: 30 seconds\n" 
        plan += "- Leg swings: 10 each leg\n\n"
        
        plan += "**Main Workout (30-35 min):**\n"
        for i, exercise in enumerate(day_exercises[:6]):  # Limit to 6 exercises
            sets = 3 if i < 4 else 2  # Vary sets
            reps = 10 + (i * 2)  # Vary reps
            rest = 60 if i < 3 else 45  # Vary rest
            plan += f"- {exercise}: {sets} sets x {reps} reps, Rest: {rest} sec\n"
        
        plan += "\n**Cool-down (5 min):**\n"
        plan += "- Full body stretch: 30 seconds per muscle group\n"
        plan += "- Deep breathing: 1 minute\n\n"
    
    plan += "## Training Notes:\n"
    plan += "- **Progression:** Increase reps by 2-3 each week\n"
    plan += "- **Rest:** Take at least 1 day of rest between workout days\n"
    plan += "- **Form:** Focus on proper form over speed\n"
    plan += f"- **Frequency:** Perform {days} days per week with rest days in between\n"
    
    return plan

def routine_generation_agent(state, retriever, llm):
    """
    Generates a personalized workout routine - SIMPLIFIED OLLAMA VERSION
    """
    user_data = state.get("user_data", {})
    
    # 🔧 FIX: Corrected default values (no typos)
    defaults = {
        "goal": "General Fitness",  # Fixed typo
        "experience": "Beginner (1-6 months)",  # Fixed typo
        "gender": "Other",
        "days_per_week": "3 days",  # Fixed typo
        "equipment": "Bodyweight Only",  # Fixed typo
        "name": "Athlete",
        "age": "N/A",
        "height": "N/A", 
        "weight": "N/A"
    }
    
    # Apply defaults for missing fields
    for key, default_value in defaults.items():
        if not user_data.get(key):
            user_data[key] = default_value
            print(f"⚠️ Missing field '{key}', using default: {default_value}")

    # Handle style field - provide default if missing
    if not user_data.get("style"):
        goal = user_data["goal"]
        user_data["style"] = get_default_style_for_goal(goal)
        print(f"⚠️ Style field missing, defaulting to: {user_data['style']} based on goal: {goal}")

    # Validate and normalize inputs
    goal = user_data.get("goal", "General Fitness")
    if goal not in VALID_GOALS:
        print(f"⚠️ Invalid goal '{goal}', defaulting to 'General Fitness'")
        goal = "General Fitness"

    experience = user_data.get("experience", "Beginner (1-6 months)")
    if experience not in VALID_EXPERIENCE:
        print(f"⚠️ Invalid experience '{experience}', defaulting to 'Beginner (1-6 months)'")
        experience = "Beginner (1-6 months)"

    style = user_data.get("style", "Circuit Training")
    if style not in VALID_STYLES:
        print(f"⚠️ Invalid style '{style}', defaulting to 'Circuit Training'")
        style = "Circuit Training"

    gender = user_data.get("gender", "Other")

    days_str = user_data.get("days_per_week", "3 days")
    # Parse number from string like "3 days"
    days_match = re.match(r"(\d+)", str(days_str))
    if not days_match:
        print(f"⚠️ Invalid days_per_week format '{days_str}', defaulting to 3 days")
        days = 3
    else:
        days = int(days_match.group(1))

    equipment_raw = user_data.get("equipment", "Bodyweight Only")
    if equipment_raw not in VALID_EQUIPMENT:
        print(f"⚠️ Invalid equipment '{equipment_raw}', defaulting to 'Bodyweight Only'")
        equipment_raw = "Bodyweight Only"

    print(f"\n🏋️ GENERATING {days}-DAY WORKOUT PLAN")
    print(f"📊 Goal: {goal}")
    print(f"🎯 Style: {style}")
    print(f"🛠️ Equipment: {equipment_raw}")
    print(f"📈 Experience: {experience}")

    try:
        # 🔧 SIMPLIFIED APPROACH: One focused prompt for the entire plan
        # Much shorter and more direct for Ollama
        
        # Determine if we should use LLM or fallback
        use_llm = True
        
        if use_llm:
            # Short, focused prompt optimized for Ollama
            prompt = f"""Create a {days}-day {style} workout plan for {goal}.

Equipment: {equipment_raw}
Experience: {experience}

Requirements:
- Generate EXACTLY {days} days
- Each day needs: warm-up, 5-6 main exercises, cool-down
- Format: ### Day X: [Name]
- Use only bodyweight exercises if equipment is "Bodyweight Only"
- Include sets, reps, rest times

Example format:
### Day 1: Upper Body
**Warm-up (5 min):** 
- Jumping jacks: 30 seconds
- Arm circles: 30 seconds

**Main Workout (30 min):**
- Push-ups: 3 sets x 12 reps, Rest: 60 sec
- Squats: 3 sets x 15 reps, Rest: 60 sec
- Lunges: 3 sets x 10 each leg, Rest: 60 sec
- Plank: 3 sets x 30 seconds, Rest: 60 sec
- Burpees: 3 sets x 8 reps, Rest: 90 sec

**Cool-down (5 min):**
- Stretching: 5 minutes

Generate all {days} days now."""

            try:
                print("🤖 Generating workout with LLM...")
                response = llm.invoke(prompt)
                plan_text = str(response.content) if hasattr(response, 'content') else str(response)
                
                # Quick validation - count days generated
                day_count = len(re.findall(r'### Day \d+:', plan_text))
                print(f"📊 Generated {day_count} days (expected {days})")
                
                if day_count >= days and len(plan_text) > 500:
                    print("✅ LLM generation successful")
                    
                    # Add header if missing
                    if not plan_text.strip().startswith('##'):
                        plan_text = f"## {days}-Day {style} Workout Plan for {goal}\n\n" + plan_text
                    
                    # Add training notes if missing
                    if "Training Notes" not in plan_text:
                        plan_text += f"\n\n## Training Notes:\n"
                        plan_text += f"- Progress gradually each week\n"
                        plan_text += f"- Focus on proper form over speed\n" 
                        plan_text += f"- Rest 1 day between workouts\n"
                        plan_text += f"- Perform {days} days per week\n"
                    
                    # Equipment validation for bodyweight
                    if equipment_raw == "Bodyweight Only":
                        forbidden_terms = ["dumbbell", "barbell", "machine", "weight", "kettlebell"]
                        for term in forbidden_terms:
                            if term.lower() in plan_text.lower():
                                print(f"⚠️ Found forbidden term '{term}', cleaning...")
                                plan_text = re.sub(term, "bodyweight", plan_text, flags=re.IGNORECASE)
                    
                    full_plan = plan_text
                    
                else:
                    print(f"⚠️ LLM generation incomplete ({day_count} days), using fallback")
                    use_llm = False
                    
            except Exception as e:
                print(f"❌ LLM generation failed: {e}")
                use_llm = False
        
        # Use fallback if LLM failed or incomplete
        if not use_llm:
            print("🔧 Using fallback plan generation...")
            full_plan = create_fallback_plan(days, style, goal, equipment_raw)
        
        # Final validation
        final_day_count = len(re.findall(r'### Day \d+:', full_plan))
        print(f"✅ FINAL PLAN: {final_day_count} days, {len(full_plan)} characters")
        
        # Save to state
        state["fitness_plan"] = full_plan
        state["messages"].append(AIMessage(content=full_plan))
        
        print("✅ WORKOUT PLAN GENERATION COMPLETE")
        return state
        
    except Exception as e:
        error_message = f"❌ Error generating workout plan: {str(e)}"
        print(error_message)
        
        # Emergency fallback
        print("🚨 Using emergency fallback...")
        emergency_plan = create_fallback_plan(days, style, goal, equipment_raw)
        
        state["fitness_plan"] = emergency_plan
        state["messages"].append(AIMessage(content=emergency_plan))
        return state