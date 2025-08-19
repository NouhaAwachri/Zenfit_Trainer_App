# services/handlers/followup_handler.py - ENHANCED VERSION WITH THANK YOU HANDLING

from models.workout_program import WorkoutProgram
from services.coach import AIFitnessCoach
from models.db import db
from models.conversation_model import Conversation, Message
from datetime import datetime
import json
import re
import random

coach = AIFitnessCoach()

def get_or_create_conversation(user_id, title="Workout Follow-up"):
    """Get existing conversation or create a new one"""
    # Try to find the most recent conversation for this user
    existing_conv = Conversation.query.filter_by(user_id=user_id)\
        .order_by(Conversation.created_at.desc()).first()
    
    # If no conversation exists or the last one is older than 7 days, create new
    if not existing_conv or (datetime.utcnow() - existing_conv.created_at).days > 7:
        conv = Conversation(user_id=user_id, title=title)
        db.session.add(conv)
        db.session.commit()
        return conv.id
    else:
        return existing_conv.id

def add_message(conversation_id, role, content):
    """Add a message to the conversation"""
    message = Message(conversation_id=conversation_id, role=role, content=content)
    db.session.add(message)
    db.session.commit()
    return message

def get_conversation_history(user_id, limit=10):
    """Get recent conversation history for context"""
    try:
        # Get recent conversations
        conversations = Conversation.query.filter_by(user_id=user_id)\
            .order_by(Conversation.created_at.desc()).limit(3).all()
        
        history = []
        for conv in conversations:
            messages = Message.query.filter_by(conversation_id=conv.id)\
                .order_by(Message.created_at.asc()).all()
            
            for msg in messages[-limit//3:]:  # Distribute limit across conversations
                history.append({
                    'role': msg.role,
                    'content': msg.content,
                    'timestamp': msg.created_at
                })
        
        return sorted(history, key=lambda x: x['timestamp'])[-limit:]
    except Exception as e:
        print(f"Error getting conversation history: {e}")
        return []

def is_thanking_message(feedback):
    """Detect if the message is expressing gratitude"""
    if not feedback or len(feedback) < 2:
        return False
    
    feedback_lower = feedback.lower().strip()
    
    # Thank you patterns
    thank_patterns = [
        r'\bthank\s*you\b',
        r'\bthanks\b',
        r'\bthx\b',
        r'\bty\b',
        r'\bthanku\b',
        r'\bappreciate\b',
        r'\bgrateful\b',
        r'\bawesome\b',
        r'\bgreat\b.*\bwork\b',
        r'\bperfect\b',
        r'\bexcellent\b',
        r'\bamazing\b',
        r'\bfantastic\b',
        r'\bwonderful\b',
        r'\bhelpful\b',
        r'\buseful\b',
        r'\blove\s*it\b',
        r'\bnice\s*job\b',
        r'\bgood\s*job\b',
        r'\bwell\s*done\b'
    ]
    
    # Check for thank you patterns
    for pattern in thank_patterns:
        if re.search(pattern, feedback_lower):
            return True
    
    # Check for simple positive responses
    positive_responses = [
        'ok', 'okay', 'cool', 'nice', 'good', 'yes', 'yep', 'yeah', 
        'great', 'perfect', 'awesome', 'excellent', 'fantastic'
    ]
    
    # If it's a very short positive response (1-2 words), likely thanking
    words = feedback_lower.split()
    if len(words) <= 2 and any(word in positive_responses for word in words):
        return True
    
    return False

def generate_thank_you_response():
    """Generate a varied 'you're welcome' response"""
    responses = [
        "You're very welcome! 😊 I'm here whenever you need help with your fitness journey.",
        "My pleasure! 💪 Keep up the great work with your workouts!",
        "You're welcome! I'm glad I could help. Stay consistent and you'll see amazing results!",
        "Happy to help! 🎯 Remember, consistency is key to reaching your fitness goals.",
        "You're welcome! 🔥 Keep pushing yourself and feel free to reach out anytime.",
        "Glad I could assist! 💯 Your dedication to fitness is inspiring.",
        "You're very welcome! 🏋️ I'm always here to support your fitness journey.",
        "My pleasure helping you! 🌟 Keep up the momentum and stay strong!",
        "You're welcome! 💪 I believe in your ability to achieve your fitness goals.",
        "Happy to be part of your fitness journey! 🎉 Keep being awesome!",
        "You're welcome! 🚀 Remember, every workout counts towards your goals.",
        "Glad to help! 💪 Your commitment to fitness is going to pay off big time!"
    ]
    
    return random.choice(responses)

def is_workout_plan(content):
    """Detect if content contains a workout plan"""
    if not content or len(content) < 100:
        return False
    
    # Look for workout plan indicators
    plan_indicators = [
        r'### Day \d+:',           # Day headers
        r'\*\*Day \d+:',           # Alternative day headers  
        r'## \d+-Day.*Plan',       # Plan titles
        r'\*\*Main Workout',       # Workout sections
        r'\*\*Warm-up',           # Warm-up sections
        r'sets x \d+ reps',        # Exercise format
        r'\d+ sets x \d+',         # Alternative exercise format
        r'Rest: \d+ sec'           # Rest periods
    ]
    
    indicator_count = 0
    for pattern in plan_indicators:
        if re.search(pattern, content, re.IGNORECASE):
            indicator_count += 1
    
    # If we find multiple indicators, it's likely a workout plan
    return indicator_count >= 3

def extract_plan_from_content(content):
    """Extract just the workout plan from the response"""
    if not content:
        return None
    
    # Look for plan start
    plan_start_patterns = [
        r'## \d+-Day.*?Plan',
        r'### Day 1:',
        r'\*\*Day 1:'
    ]
    
    plan_start = -1
    for pattern in plan_start_patterns:
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            plan_start = match.start()
            break
    
    if plan_start == -1:
        # No clear plan start, check if the whole content is a plan
        if is_workout_plan(content):
            return content.strip()
        return None
    
    # Extract from plan start to end
    plan_content = content[plan_start:].strip()
    
    # Remove any trailing non-plan content
    # (This is optional, depends on your format)
    
    return plan_content

def follow_up_workout(data):
    """Enhanced follow-up handler with memory, context, and thank you responses"""
    uid = data.get("firebase_uid")
    feedback = data.get("feedback")
    
    if not uid or not feedback:
        return {"error": "Missing firebase_uid or feedback"}, 400
    
    print(f"🔄 Processing follow-up for user: {uid}")
    print(f"📝 Feedback: {feedback}")
    
    # Check if this is a thanking message
    if is_thanking_message(feedback):
        print("🙏 Detected thanking message, generating polite response...")
        
        # Generate a nice thank you response
        thank_response = generate_thank_you_response()
        
        # Save to conversation
        conv_id = get_or_create_conversation(user_id=uid, title="Chat")
        add_message(conv_id, role="user", content=feedback)
        add_message(conv_id, role="ai", content=thank_response)
        
        # Get the current plan (no changes)
        last_program = WorkoutProgram.query.filter_by(user_id=uid)\
            .order_by(WorkoutProgram.id.desc()).first()
        
        current_plan = last_program.program_text if last_program else None
        
        return {
            "response": thank_response,
            "plan_updated": False,
            "current_program": current_plan,
            "message_type": "gratitude_response"
        }, 200
    
    # Get the most recent workout program
    last_program = WorkoutProgram.query.filter_by(user_id=uid)\
        .order_by(WorkoutProgram.id.desc()).first()
    
    if not last_program:
        return {"error": "No previous program found. Please complete initial workout generation first."}, 404
    
    print(f"📋 Current plan length: {len(last_program.program_text)} chars")
    
    # Get conversation history for context
    conversation_history = get_conversation_history(uid)
    
    try:
        # Run the enhanced follow-up pipeline with memory
        messages = coach.run_followup(
            user_id=uid, 
            current_plan=last_program.program_text, 
            feedback=feedback
        )
        
        print(f"🤖 Coach returned {len(messages)} messages")
        
        # Extract the final adjusted plan from messages
        adjusted_plan = None
        coaching_response = None
        
        # Look through all messages for plans and responses
        for i, msg in enumerate(messages):
            if hasattr(msg, "content") and isinstance(msg.content, str):
                content = msg.content.strip()
                if content:
                    print(f"📨 Message {i}: {content[:100]}...")
                    
                    # Check if this message contains a workout plan
                    if is_workout_plan(content):
                        extracted_plan = extract_plan_from_content(content)
                        if extracted_plan:
                            adjusted_plan = extracted_plan
                            print(f"✅ Found workout plan in message {i}")
                    
                    # Keep the last substantial response as coaching response
                    if len(content) > 20:
                        coaching_response = content
        
        # Determine if plan was actually changed
        plan_changed = False
        if adjusted_plan:
            # Compare day counts to detect changes
            original_days = len(re.findall(r'### Day \d+:|Day \d+:', last_program.program_text))
            new_days = len(re.findall(r'### Day \d+:|Day \d+:', adjusted_plan))
            
            print(f"📊 Original days: {original_days}, New days: {new_days}")
            
            if new_days != original_days:
                plan_changed = True
                print(f"✅ Plan changed: {original_days} days → {new_days} days")
            elif len(adjusted_plan) != len(last_program.program_text):
                # Length changed, likely modified
                plan_changed = True
                print(f"✅ Plan changed: Length {len(last_program.program_text)} → {len(adjusted_plan)}")
        
        # Choose appropriate response
        if plan_changed and adjusted_plan:
            response_content = coaching_response or "I've updated your workout plan based on your request."
        else:
            response_content = coaching_response or "I've processed your feedback."
        
        if not response_content:
            return {"error": "Failed to process your feedback. Please try again."}, 500
        
        print(f"📤 Final response length: {len(response_content)} chars")
        print(f"🔄 Plan changed: {plan_changed}")
        
        # Save to database
        conv_id = get_or_create_conversation(user_id=uid, title="Workout Adjustment")
        
        # Add user message
        add_message(conv_id, role="user", content=feedback)
        
        # Add AI response
        add_message(conv_id, role="ai", content=response_content)
        
        # If plan was changed, save new workout program
        if plan_changed and adjusted_plan:
            print(f"💾 Saving new workout program...")
            
            # Save new program version
            updated_program = WorkoutProgram(
                user_id=uid, 
                program_text=adjusted_plan,
                created_at=datetime.utcnow()
            )
            
            # Add name if the model supports it
            if hasattr(WorkoutProgram, 'name'):
                updated_program.name = "Adjusted Workout Plan"
            
            db.session.add(updated_program)
            db.session.commit()
            
            print(f"✅ Saved new program: {updated_program.id}")
            
            return {
                "response": response_content,
                "plan_updated": True,
                "new_program": adjusted_plan,
                "program_id": updated_program.id,
                "message_type": "plan_adjustment"
            }, 200
        else:
            print(f"📋 No plan changes, returning current program")
            return {
                "response": response_content,
                "plan_updated": False,
                "current_program": last_program.program_text,
                "message_type": "coaching_advice"
            }, 200
            
    except Exception as e:
        print(f"❌ Error in follow_up_workout: {e}")
        import traceback
        traceback.print_exc()
        return {"error": f"An error occurred while processing your feedback: {str(e)}"}, 500

def get_workout_history(uid, limit=5):
    """Get user's workout program history"""
    try:
        programs = WorkoutProgram.query.filter_by(user_id=uid)\
            .order_by(WorkoutProgram.created_at.desc())\
            .limit(limit).all()
        
        return [{
            'id': p.id,
            'program_text': p.program_text[:300] + "..." if len(p.program_text) > 300 else p.program_text,
            'created_at': p.created_at.isoformat()
        } for p in programs]
    except Exception as e:
        print(f"Error getting workout history: {e}")
        return []

def get_conversation_summary(uid):
    """Get a summary of recent conversations"""
    try:
        conversations = Conversation.query.filter_by(user_id=uid)\
            .order_by(Conversation.created_at.desc()).limit(3).all()
        
        summary = []
        for conv in conversations:
            message_count = Message.query.filter_by(conversation_id=conv.id).count()
            last_message = Message.query.filter_by(conversation_id=conv.id)\
                .order_by(Message.created_at.desc()).first()
            
            summary.append({
                'title': conv.title,
                'message_count': message_count,
                'last_activity': last_message.created_at.isoformat() if last_message else None,
            })
        
        return summary
    except Exception as e:
        print(f"Error getting conversation summary: {e}")
        return []