# services/handlers/followup_handler.py

from models.workout_program import WorkoutProgram
from services.coach import AIFitnessCoach
from models.db import db
from models.conversation_model import Conversation, Message
from datetime import datetime
import json

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

def follow_up_workout(data):
    """Enhanced follow-up handler with memory and context"""
    uid = data.get("firebase_uid")
    feedback = data.get("feedback")
    
    if not uid or not feedback:
        return {"error": "Missing firebase_uid or feedback"}, 400
    
    # Get the most recent workout program
    last_program = WorkoutProgram.query.filter_by(user_id=uid)\
        .order_by(WorkoutProgram.id.desc()).first()
    
    if not last_program:
        return {"error": "No previous program found. Please complete initial workout generation first."}, 404
    
    # Get conversation history for context
    conversation_history = get_conversation_history(uid)
    
    try:
        # Run the enhanced follow-up pipeline with memory
        messages = coach.run_followup(
            user_id=uid, 
            current_plan=last_program.program_text, 
            feedback=feedback
        )
        
        # Extract the final adjusted plan from messages
        adjusted_plan = None
        coaching_response = None
        
        # Look for the final plan and coaching response
        for msg in reversed(messages):
            if hasattr(msg, "content") and isinstance(msg.content, str):
                content = msg.content.strip()
                if content:
                    if "🔄" in content and ("Day 1" in content or "**Day" in content):
                        # This looks like an adjusted plan
                        adjusted_plan = content
                    elif not coaching_response:
                        # This is likely a coaching response
                        coaching_response = content
        
        # If no adjusted plan found but we have a coaching response
        if not adjusted_plan and coaching_response:
            # Check if this is just a progress acknowledgment or question
            if any(indicator in coaching_response.lower() for indicator in [
                "congratulations", "great job", "keep it up", "how did", "what do you think"
            ]):
                # No plan change needed, just coaching response
                response_content = coaching_response
                plan_changed = False
            else:
                response_content = coaching_response
                plan_changed = False
        else:
            # Plan was adjusted
            response_content = adjusted_plan or coaching_response or "I've processed your feedback."
            plan_changed = bool(adjusted_plan)
        
        if not response_content:
            return {"error": "Failed to process your feedback. Please try again."}, 500
        
        # Save to database
        conv_id = get_or_create_conversation(user_id=uid, title="Workout Adjustment")
        
        # Add user message
        add_message(conv_id, role="user", content=feedback)
        
        # Add AI response
        add_message(conv_id, role="ai", content=response_content)
        
        # If plan was changed, save new workout program
        if plan_changed and adjusted_plan:
            # Extract just the plan content (remove coaching messages)
            plan_content = adjusted_plan
            if "🔄" in plan_content:
                # Remove the update indicator and keep just the plan
                parts = plan_content.split("🔄", 1)
                if len(parts) > 1:
                    plan_content = parts[1].strip()
                    # Remove any leading text before the actual plan
                    if ":\n\n" in plan_content:
                        plan_content = plan_content.split(":\n\n", 1)[1]
            
            # Save new program version
            updated_program = WorkoutProgram(user_id=uid, program_text=plan_content)
            db.session.add(updated_program)
            db.session.commit()
            
            return {
                "response": response_content,
                "plan_updated": True,
                "new_program": plan_content
            }, 200
        else:
            return {
                "response": response_content,
                "plan_updated": False,
                "current_program": last_program.program_text
            }, 200
            
    except Exception as e:
        print(f"Error in follow_up_workout: {e}")
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