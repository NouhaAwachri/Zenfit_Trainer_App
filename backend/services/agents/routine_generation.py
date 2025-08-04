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

VALID_DAYS = ["1 day", "2 days", "3 days", "4 days", "5 days", "6 days", "7 days"]

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

def get_equipment_constraints(equipment_raw):
    """Return specific equipment constraints and allowed exercises"""
    constraints = {
        "Bodyweight Only": {
            "allowed": ["push-ups", "pull-ups", "squats", "lunges", "planks", "burpees", "mountain climbers", "jumping jacks", "dips", "crunches"],
            "forbidden": ["dumbbells", "barbells", "machines", "weights", "kettlebells", "resistance bands"],
            "constraint": "STRICTLY bodyweight exercises only - no equipment whatsoever"
        },
        "Dumbbells Only": {
            "allowed": ["dumbbell exercises", "bodyweight exercises"],
            "forbidden": ["barbells", "machines", "kettlebells", "resistance bands"],
            "constraint": "Only dumbbells and bodyweight exercises allowed"
        },
        "Resistance Bands Only": {
            "allowed": ["resistance band exercises", "bodyweight exercises"],
            "forbidden": ["dumbbells", "barbells", "machines", "kettlebells"],
            "constraint": "Only resistance bands and bodyweight exercises allowed"
        },
        "Kettlebells Only": {
            "allowed": ["kettlebell exercises", "bodyweight exercises"],
            "forbidden": ["dumbbells", "barbells", "machines", "resistance bands"],
            "constraint": "Only kettlebells and bodyweight exercises allowed"
        },
        "Basic Home Equipment (Dumbbells, Resistance Bands)": {
            "allowed": ["dumbbells", "resistance bands", "bodyweight exercises"],
            "forbidden": ["barbells", "machines", "kettlebells"],
            "constraint": "Only dumbbells, resistance bands, and bodyweight exercises allowed"
        },
        "Home Gym (Weights & Machines)": {
            "allowed": ["dumbbells", "barbells", "home machines", "bodyweight exercises"],
            "forbidden": ["commercial gym machines"],
            "constraint": "Home gym equipment including weights and basic machines"
        },
        "Outdoor/Park Equipment": {
            "allowed": ["bodyweight exercises", "park equipment", "running", "outdoor activities"],
            "forbidden": ["dumbbells", "barbells", "machines", "kettlebells"],
            "constraint": "Only outdoor/park equipment and bodyweight exercises"
        },
        "Full Gym Access": {
            "allowed": ["all gym equipment", "machines", "free weights", "cardio equipment"],
            "forbidden": [],
            "constraint": "Full access to gym equipment and machines"
        }
    }
    return constraints.get(equipment_raw, constraints["Bodyweight Only"])

def routine_generation_agent(state, retriever, llm):
    """
    Generates a personalized workout routine using Retrieval-Augmented Generation (RAG).
    """
    user_data = state.get("user_data", {})

    # Validate required fields presence
    for field in ["goal", "experience", "style", "gender", "days_per_week", "equipment"]:
        if not user_data.get(field):
            raise ValueError(f"Missing required user field: {field}")

    # Validate and normalize inputs
    goal = user_data["goal"]
    if goal not in VALID_GOALS:
        raise ValueError(f"Invalid goal: {goal}")

    experience = user_data["experience"]
    if experience not in VALID_EXPERIENCE:
        raise ValueError(f"Invalid experience: {experience}")

    style = user_data["style"]
    if style not in VALID_STYLES:
        raise ValueError(f"Invalid style: {style}")

    gender = user_data["gender"]

    days_str = user_data["days_per_week"]
    # Parse number from string like "3 days"
    days_match = re.match(r"(\d+)", days_str)
    if not days_match:
        raise ValueError(f"Invalid days_per_week format: {days_str}")
    days = int(days_match.group(1))

    equipment_raw = user_data["equipment"]
    if equipment_raw not in VALID_EQUIPMENT:
        raise ValueError(f"Invalid equipment: {equipment_raw}")
    
    # Get equipment constraints
    equipment_info = get_equipment_constraints(equipment_raw)

    # Optional fields with safe defaults and parsing
    name = user_data.get("name", "Athlete")

    # Parse height and weight carefully
    def parse_float(value):
        try:
            v = float(value)
            return round(v, 1)
        except (TypeError, ValueError):
            return "N/A"

    height = parse_float(user_data.get("height"))
    weight = parse_float(user_data.get("weight"))
    age = user_data.get("age", "N/A")

    # Build RAG query - concise but informative
    rag_query = (
        f"{days}-day {style} workout plan for {experience} level, "
        f"goal: {goal}, using {equipment_raw.lower()} only. "
        "Include warm-up, sets, reps, rest periods."
    )

    print(f"\n🔎 FAISS RAG Query: {rag_query}\n")

    docs = retriever.invoke(rag_query)
    if not docs:
        plan = "⚠️ No relevant documents found. Unable to generate a plan."
        state["fitness_plan"] = plan
        state["messages"].append(AIMessage(content=plan))
        return state

    context = "\n\n".join(
        doc.page_content if hasattr(doc, "page_content") else str(doc)
        for doc in docs[:5]
    )

    print("📄 Retrieved Documents (RAG):")
    for i, doc in enumerate(docs[:3]):
        preview = doc.page_content[:500] if hasattr(doc, "page_content") else str(doc)[:500]
        print(f"Doc {i+1}: {preview}...\n---")

    # Create strict constraints list
    strict_constraints = [
        f"🚨 CRITICAL: Create EXACTLY {days} workout days, no more, no less",
        f"🚨 CRITICAL: {equipment_info['constraint']}",
        f"🚨 CRITICAL: Do NOT include any of these forbidden items: {', '.join(equipment_info['forbidden']) if equipment_info['forbidden'] else 'None'}",
        f"🚨 CRITICAL: ONLY use exercises from this allowed list: {', '.join(equipment_info['allowed'])}",
        "🚨 CRITICAL: If equipment is 'Bodyweight Only', use ZERO equipment - only body movements",
        "🚨 CRITICAL: Do not add extra days or suggest equipment not available",
        "🚨 CRITICAL: Stick exactly to the user's specified workout days and equipment"
    ]

    # Build goal-specific instructions
    goal_instructions = {
        "Fat Loss": "Focus on high-intensity exercises, short rest periods (30-60 seconds), and metabolic circuits",
        "Muscle Gain": "Use hypertrophy rep ranges (8-12 reps), progressive overload, longer rest (60-90 seconds)",
        "Strength Building": "Focus on compound movements, lower reps (3-6), longer rest periods (2-3 minutes)",
        "Endurance": "Higher rep ranges (15-20), shorter rest periods, cardiovascular emphasis",
        "General Fitness": "Balanced approach mixing strength, cardio, and flexibility",
        "Flexibility & Mobility": "Focus on stretching, mobility drills, and movement quality",
        "Powerlifting": "Emphasize compound lifts: squat, bench, deadlift patterns with available equipment",
        "Bodybuilding": "High volume, muscle isolation, multiple sets per muscle group",
        "Athletic Performance": "Sport-specific movements, power, agility, and functional training",
        "Body Recomposition": "Combine strength training with metabolic conditioning"
    }

    # Experience level modifications
    experience_mods = {
        "Complete Beginner": "Keep workouts simple, 30-45 minutes, focus on form over intensity",
        "Beginner (1-6 months)": "Progressive difficulty, 45-60 minutes, basic to intermediate exercises",
        "Intermediate (6 months - 2 years)": "Moderate complexity, 60 minutes, varied training techniques",
        "Advanced (2-5 years)": "Advanced techniques, 60-75 minutes, complex movement patterns",
        "Expert (5+ years)": "Expert-level programming, advanced techniques, periodization"
    }

    # Create equipment-specific exercise lists for bodyweight
    if equipment_raw == "Bodyweight Only":
        allowed_exercises = """
ALLOWED BODYWEIGHT EXERCISES ONLY:
- Push-ups (standard, incline, decline, diamond)
- Pull-ups / Chin-ups (if bar available)
- Squats (bodyweight, jump squats, single-leg)
- Lunges (forward, reverse, lateral, jumping)
- Planks (standard, side, mountain climbers)
- Burpees
- Jumping jacks
- High knees
- Butt kicks
- Crunches / Sit-ups
- Leg raises
- Glute bridges
- Wall sits
- Bear crawls
- Calf raises
- Step-ups (using stairs/bench)
- Tricep dips (using chair/bench)
- Superman exercises
- Bicycle crunches
- Russian twists (no weight)
"""
        forbidden_reminder = """
🚫 ABSOLUTELY FORBIDDEN - DO NOT INCLUDE:
- NO dumbbells
- NO barbells  
- NO machines
- NO weights of any kind
- NO equipment whatsoever
- NO gym equipment
- NO resistance bands
- NO kettlebells
"""
    else:
        allowed_exercises = f"Use exercises appropriate for: {equipment_raw}"
        forbidden_reminder = f"Avoid equipment not listed in: {equipment_raw}"

    prompt = f"""You are a professional fitness trainer. You MUST create a workout plan that follows these specifications EXACTLY.

🎯 CLIENT PROFILE:
- Name: {name}
- Equipment Available: {equipment_raw}
- Workout Days: EXACTLY {days} days
- Goal: {goal} 
- Style: {style}
- Experience: {experience}

{allowed_exercises}

{forbidden_reminder}

🚨 ABSOLUTE REQUIREMENTS - NO EXCEPTIONS:
1. Create EXACTLY {days} workout days (Day 1, Day 2, Day 3, Day 4) - NO MORE, NO LESS
2. If equipment is "Bodyweight Only" - USE ZERO EQUIPMENT, ONLY BODY MOVEMENTS
3. For {goal} + {style}: Focus on high-intensity, metabolic exercises with short rest periods
4. Each day should be 30-45 minutes total
5. Include proper warm-up and cool-down

📝 EXACT FORMAT REQUIRED:

## {days}-Day {style} Workout Plan for {goal}

### Day 1: [Name]
**Warm-up (5-10 min):**
- [Bodyweight exercise] - 30 seconds
- [Bodyweight exercise] - 30 seconds
- [Bodyweight exercise] - 30 seconds

**Main Workout (20-30 min):**
- [Bodyweight exercise]: 3 sets x 12-15 reps, Rest: 30 seconds
- [Bodyweight exercise]: 3 sets x 12-15 reps, Rest: 30 seconds  
- [Bodyweight exercise]: 3 sets x 12-15 reps, Rest: 30 seconds
- [Bodyweight exercise]: 3 sets x 12-15 reps, Rest: 30 seconds
- [Bodyweight exercise]: 3 sets x 12-15 reps, Rest: 30 seconds

**Cool-down (5 min):**
- [Stretch/mobility exercise]
- [Stretch/mobility exercise]

### Day 2: [Name]
[Same format as Day 1]

### Day 3: [Name]  
[Same format as Day 1]

### Day 4: [Name]
[Same format as Day 1]

## Training Tips:
- Keep rest periods short for fat loss
- Focus on compound movements
- Maintain proper form

🔍 BEFORE SUBMITTING - VERIFY:
✅ Does this have exactly {days} days?
✅ Are ALL exercises bodyweight only (no equipment)?
✅ Is every single exercise from the allowed list above?

KNOWLEDGE BASE REFERENCE:
{context}

Generate the workout plan now following ALL requirements above."""

    # Call the LLM with the final prompt
    plan = llm.invoke(prompt)

    print(f"✅ LLM Response (Preview):\n{plan[:800]}\n")

    # Post-process validation and correction
    plan_text = str(plan)
    
    # Count days in the response
    day_count = len(re.findall(r'### Day \d+:', plan_text))
    if day_count != days:
        print(f"⚠️ ERROR: Generated plan has {day_count} days but should have {days} days")
    
    # Strict equipment violation check for bodyweight
    if equipment_raw == "Bodyweight Only":
        violations_found = []
        forbidden_terms = [
            "dumbbell", "barbell", "weight", "machine", "kettlebell", "band", 
            "press", "curl", "deadlift", "leg press", "chest press", 
            "shoulder press", "triceps extension", "bicep curl", "romanian deadlift",
            "leg curl", "equipment"
        ]
        
        for term in forbidden_terms:
            if term.lower() in plan_text.lower():
                violations_found.append(term)
        
        if violations_found:
            print(f"🚨 CRITICAL ERROR: Found forbidden equipment in bodyweight plan: {violations_found}")
            
            # Generate corrective plan
            corrective_prompt = f"""The previous plan violated bodyweight-only requirements. 
            
Generate a NEW {days}-day bodyweight-only cardio workout plan for fat loss.

STRICT RULES:
- ONLY use: push-ups, squats, lunges, planks, burpees, jumping jacks, mountain climbers, high knees, crunches
- NO equipment, weights, machines, or gym equipment
- EXACTLY {days} days
- Focus on cardio/fat loss with short rest periods

Format:
## {days}-Day Bodyweight Cardio Plan

### Day 1: Upper Body Cardio
**Warm-up (5 min):**
- Jumping jacks - 30 seconds
- High knees - 30 seconds  
- Arm circles - 30 seconds

**Main Workout (25 min):**
- Push-ups: 3 sets x 10-15 reps, Rest: 30 sec
- Mountain climbers: 3 sets x 20 reps, Rest: 30 sec
- Burpees: 3 sets x 8-12 reps, Rest: 30 sec
- Plank: 3 sets x 30-45 sec, Rest: 30 sec
- Jumping jacks: 3 sets x 20 reps, Rest: 30 sec

**Cool-down (5 min):**
- Arm stretches
- Shoulder rolls

[Continue for remaining days...]

Generate this corrected plan now."""
            
            corrected_plan = llm.invoke(corrective_prompt)
            plan = corrected_plan
            print("✅ Generated corrective bodyweight-only plan")

    # Save plan and message to state
    state["fitness_plan"] = plan
    state["messages"].append(AIMessage(content=plan))
    return state