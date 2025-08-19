import re
from langchain_core.messages import AIMessage
from services.rag_pipeline import load_retriever, ask_rag_question

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

def get_rag_based_exercises(goal, equipment_raw, experience, retriever):
    """Query RAG system for relevant exercises based on user requirements - OPTIMIZED"""
    
    try:
        # Create a single comprehensive query instead of multiple calls
        if equipment_raw == "Bodyweight Only":
            comprehensive_query = f"bodyweight exercises calisthenics {goal} beginner starter phase progression"
        else:
            comprehensive_query = f"{goal} exercises {equipment_raw} {experience} workout program structure"
        
        print(f"🔍 Optimized RAG Query: {comprehensive_query}")
        
        # Use retriever directly instead of ask_rag_question to avoid LLM timeout
        docs = retriever.invoke(comprehensive_query)  # Updated method
        
        # Extract relevant content with filtering
        relevant_context = []
        for doc in docs[:8]:  # Get more documents but filter them
            content = doc.page_content if hasattr(doc, 'page_content') else str(doc)
            
            # Filter for relevant content based on equipment
            if equipment_raw == "Bodyweight Only":
                # Look for bodyweight-friendly content
                if any(term in content.lower() for term in ['bodyweight', 'calisthenics', 'push-up', 'squat', 'plank', 'burpee', 'no equipment']):
                    relevant_context.append(content)
            else:
                # Include general fitness content
                if any(term in content.lower() for term in [goal.lower(), equipment_raw.lower().split()[0], 'exercise', 'training']):
                    relevant_context.append(content)
        
        # Combine contexts with length limit to avoid timeout
        combined_context = "\n\n".join(relevant_context[:5])[:2000]  # Limit context size
        
        print(f"✅ Retrieved {len(relevant_context)} relevant documents ({len(combined_context)} chars)")
        return combined_context
        
    except Exception as e:
        print(f"❌ RAG retrieval failed: {e}")
        return None

def generate_rag_based_plan(days, style, goal, equipment_raw, experience, retriever, llm):
    """Generate workout plan using RAG-retrieved information - OPTIMIZED"""
    
    try:
        # Get RAG-based context with optimized single call
        print("🧠 Retrieving relevant fitness knowledge from RAG system...")
        rag_context = get_rag_based_exercises(goal, equipment_raw, experience, retriever)
        
        if not rag_context:
            print("⚠️ No RAG context retrieved, falling back...")
            return None, False
        
        # Create streamlined RAG-enhanced prompt (shorter to avoid timeouts)
        rag_prompt = f"""Create a {days}-day {style} workout plan for {goal}.

FITNESS KNOWLEDGE BASE:
{rag_context}

USER SPECS:
- Experience: {experience}  
- Equipment: {equipment_raw}
- Goal: {goal}
- Days: {days}

MUST REQUIREMENTS:
- Generate exactly {days} workout days
- Use only {equipment_raw.lower()} exercises
- Include warm-up, 5-6 main exercises, cool-down per day
- Add sets/reps/rest for each exercise
- Apply beginner-friendly progression

FORMAT:
### Day X: [Focus]
**Warm-up (5 min):** Exercise list
**Main (30 min):** Exercise: Sets x Reps, Rest: Time
**Cool-down (5 min):** Stretch routine

Create complete {days}-day plan using the fitness knowledge above."""

        print("🤖 Generating RAG-enhanced workout plan...")
        print(f"📊 Compact prompt length: {len(rag_prompt)} characters")
        
        # Set longer timeout for complex generation
        try:
            response = llm.invoke(rag_prompt)
            plan_text = str(response.content) if hasattr(response, 'content') else str(response)
        except Exception as timeout_error:
            if "timeout" in str(timeout_error).lower():
                print("⏰ LLM timeout during RAG generation, reducing context...")
                # Retry with much shorter context
                short_context = rag_context[:800]  # Very short context
                short_prompt = f"""Create {days}-day bodyweight workout for {goal}.

Key info: {short_context[:400]}

Generate {days} workout days with exercises, sets, reps."""
                
                response = llm.invoke(short_prompt)
                plan_text = str(response.content) if hasattr(response, 'content') else str(response)
            else:
                raise timeout_error
        
        # Validate RAG-generated plan
        day_count = len(re.findall(r'### Day \d+:', plan_text))
        print(f"📊 RAG-generated {day_count} days (expected {days})")
        
        if day_count >= days and len(plan_text) > 500:
            print("✅ RAG-based generation successful")
            
            # Add header if missing
            if not plan_text.strip().startswith('##'):
                plan_text = f"## {days}-Day RAG-Enhanced {style} Plan for {goal}\n\n" + plan_text
            
            # Add concise RAG-based notes
            if "Training Notes" not in plan_text:
                plan_text += f"\n\n## Evidence-Based Notes:\n"
                plan_text += f"- Plan based on proven fitness principles from database\n"
                plan_text += f"- {experience} progression applied\n"
                plan_text += f"- {equipment_raw} optimized exercises\n"
                plan_text += f"- Focus on form and gradual progression\n"
            
            return plan_text, True
        else:
            print(f"⚠️ RAG generation incomplete ({day_count} days), will use fallback")
            return None, False
            
    except Exception as e:
        print(f"❌ RAG-based generation failed: {e}")
        return None, False

def routine_generation_agent(state, retriever, llm):
    """
    Enhanced workout routine generator with RAG integration
    """
    user_data = state.get("user_data", {})
    
    # 🔧 FIX: Corrected default values (no typos)
    defaults = {
        "goal": "General Fitness",
        "experience": "Beginner (1-6 months)",
        "gender": "Other",
        "days_per_week": "3 days",
        "equipment": "Bodyweight Only",
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

    print(f"\n🏋️ GENERATING {days}-DAY RAG-ENHANCED WORKOUT PLAN")
    print(f"📊 Goal: {goal}")
    print(f"🎯 Style: {style}")
    print(f"🛠️ Equipment: {equipment_raw}")
    print(f"📈 Experience: {experience}")

    try:
        # Initialize RAG retriever if not provided
        if retriever is None:
            print("🔧 Loading RAG retriever...")
            retriever = load_retriever()
        
        # Try RAG-based generation first
        rag_plan, rag_success = generate_rag_based_plan(
            days, style, goal, equipment_raw, experience, retriever, llm
        )
        
        if rag_success and rag_plan:
            print("✅ Using RAG-enhanced workout plan")
            full_plan = rag_plan
        else:
            print("🔄 RAG generation failed, trying simple LLM approach...")
            
            # Fallback to simple LLM approach (your original method)
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
                print("🤖 Generating workout with simple LLM...")
                response = llm.invoke(prompt)
                plan_text = str(response.content) if hasattr(response, 'content') else str(response)
                
                # Quick validation - count days generated
                day_count = len(re.findall(r'### Day \d+:', plan_text))
                print(f"📊 Generated {day_count} days (expected {days})")
                
                if day_count >= days and len(plan_text) > 500:
                    print("✅ Simple LLM generation successful")
                    
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
                    
                    full_plan = plan_text
                    
                else:
                    print(f"⚠️ Simple LLM generation incomplete ({day_count} days), using fallback")
                    raise Exception("LLM generation insufficient")
                    
            except Exception as e:
                print(f"❌ Simple LLM generation failed: {e}")
                print("🔧 Using emergency fallback plan generation...")
                full_plan = create_fallback_plan(days, style, goal, equipment_raw)
        
        # Final equipment validation for bodyweight
        if equipment_raw == "Bodyweight Only":
            forbidden_terms = ["dumbbell", "barbell", "machine", "weight", "kettlebell"]
            for term in forbidden_terms:
                if term.lower() in full_plan.lower():
                    print(f"⚠️ Found forbidden term '{term}', cleaning...")
                    full_plan = re.sub(term, "bodyweight", full_plan, flags=re.IGNORECASE)
        
        # Final validation
        final_day_count = len(re.findall(r'### Day \d+:', full_plan))
        print(f"✅ FINAL RAG-ENHANCED PLAN: {final_day_count} days, {len(full_plan)} characters")
        
        # Save to state
        state["fitness_plan"] = full_plan
        state["messages"].append(AIMessage(content=full_plan))
        
        print("✅ RAG-ENHANCED WORKOUT PLAN GENERATION COMPLETE")
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