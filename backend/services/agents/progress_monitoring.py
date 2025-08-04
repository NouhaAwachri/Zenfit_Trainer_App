# services/agents/progress_monitoring.py

from datetime import datetime, timedelta
from models.workout_program import WorkoutProgram
from models.workoutLog_model import WorkoutLog, WorkoutExercise
from models.db import db
import json

def progress_monitoring_agent(user_data: dict, llm):
    """
    Enhanced progress monitoring agent that analyzes user's workout adherence 
    and provides detailed insights and recommendations.
    """
    try:
        user_id = user_data.get('firebase_uid') or user_data.get('uid')
        if not user_id:
            return {"adherence_report": "User ID not found"}

        # ✅ Fix: Removed .created_at
        current_program = WorkoutProgram.query.filter_by(
            user_id=user_id
        ).order_by(WorkoutProgram.id.desc()).first()

        if not current_program:
            return {"adherence_report": "No workout program found for this user"}

        # ✅ Fix: Removed use of day_label
        program_exercises = WorkoutExercise.query.filter_by(
            program_id=current_program.id
        ).all()

        # Get recent workout logs (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_logs = WorkoutLog.query.filter(
            WorkoutLog.user_id == user_id,
            WorkoutLog.date >= thirty_days_ago.date()
        ).order_by(WorkoutLog.date.desc()).all()

        # Calculate statistics
        stats = calculate_workout_stats(program_exercises, recent_logs)

        # Generate insights using LLM
        insights = generate_ai_insights(user_data, stats, llm)

        return {
            "adherence_report": {
                "completion_percentage": stats["completion_percentage"],
                "total_workouts": stats["total_completed_workouts"],
                "current_streak": stats["current_streak"],
                "weekly_average": stats["weekly_average"],
                "favorite_exercises": stats["favorite_exercises"],
                "missed_sessions": stats["missed_sessions"],
                "insights": insights,
                "recommendations": generate_recommendations(stats, user_data)
            }
        }

    except Exception as e:
        print(f"Progress monitoring error: {str(e)}")
        return {
            "adherence_report": {
                "completion_percentage": 0,
                "total_workouts": 0,
                "current_streak": 0,
                "weekly_average": 0,
                "favorite_exercises": [],
                "missed_sessions": 0,
                "insights": "Unable to generate progress report at this time.",
                "recommendations": ["Please try again later or contact support."]
            }
        }

def calculate_workout_stats(program_exercises, recent_logs):
    """Calculate detailed workout statistics"""
    
    # Group exercises by week and day for planned workouts
    planned_workouts = {}
    for exercise in program_exercises:
        key = f"W{exercise.week}D{exercise.day}"
        if key not in planned_workouts:
            planned_workouts[key] = []
        planned_workouts[key].append(exercise)
    
    # Calculate completion rates
    total_planned_exercises = len(program_exercises)
    completed_exercises = len([ex for ex in program_exercises if ex.completed])
    completion_percentage = (completed_exercises / total_planned_exercises * 100) if total_planned_exercises > 0 else 0
    
    # Calculate workout frequency
    total_completed_workouts = len(recent_logs)
    
    # Calculate current streak
    current_streak = calculate_current_streak(recent_logs)
    
    # Calculate weekly average
    weeks_in_period = min(4, len(set(log.date.isocalendar()[1] for log in recent_logs)) or 1)
    weekly_average = total_completed_workouts / weeks_in_period if weeks_in_period > 0 else 0
    
    # Find favorite exercises (most completed)
    exercise_completion = {}
    for log in recent_logs:
        if log.exercises:
            try:
                exercises_data = json.loads(log.exercises)
                for ex in exercises_data:
                    if ex.get('completed'):
                        name = ex.get('name', 'Unknown')
                        exercise_completion[name] = exercise_completion.get(name, 0) + 1
            except:
                continue
    
    favorite_exercises = sorted(exercise_completion.items(), key=lambda x: x[1], reverse=True)[:5]
    favorite_exercises = [{"name": name, "count": count} for name, count in favorite_exercises]
    
    # Calculate missed sessions
    total_planned_sessions = len(planned_workouts)
    missed_sessions = max(0, total_planned_sessions - total_completed_workouts)
    
    return {
        "completion_percentage": round(completion_percentage, 1),
        "total_completed_workouts": total_completed_workouts,
        "current_streak": current_streak,
        "weekly_average": round(weekly_average, 1),
        "favorite_exercises": favorite_exercises,
        "missed_sessions": missed_sessions,
        "total_planned_exercises": total_planned_exercises,
        "completed_exercises": completed_exercises
    }

def calculate_current_streak(recent_logs):
    """Calculate the current workout streak in days"""
    if not recent_logs:
        return 0
    
    sorted_logs = sorted(recent_logs, key=lambda x: x.date, reverse=True)
    streak = 0
    current_date = datetime.utcnow().date()
    
    for log in sorted_logs:
        days_diff = (current_date - log.date).days
        if days_diff <= 1:
            streak = 1
            break

    if streak == 0:
        return 0

    prev_date = sorted_logs[0].date
    for log in sorted_logs[1:]:
        days_gap = (prev_date - log.date).days
        if days_gap <= 2:
            streak += 1
            prev_date = log.date
        else:
            break

    return streak

def generate_ai_insights(user_data, stats, llm):
    """Generate AI-powered insights about user's progress"""

    prompt = f"""
    Analyze this user's workout progress and provide personalized insights:

    User Profile:
    - Goal: {user_data.get('goal', 'General fitness')}
    - Experience: {user_data.get('experience', 'Beginner')}
    - Days per week target: {user_data.get('days_per_week', 3)}
    - Age: {user_data.get('age', 'Unknown')}
    - Equipment: {user_data.get('equipment', 'Basic')}

    Progress Statistics:
    - Exercise completion rate: {stats['completion_percentage']}%
    - Total workouts completed: {stats['total_completed_workouts']}
    - Current streak: {stats['current_streak']} days
    - Weekly average: {stats['weekly_average']} workouts
    - Missed sessions: {stats['missed_sessions']}
    - Top exercises: {[ex['name'] for ex in stats['favorite_exercises'][:3]]}

    Provide a concise, encouraging progress analysis in 2-3 sentences focusing on:
    1. Overall progress assessment
    2. Key strength or positive trend
    3. One specific insight or pattern you notice

    Keep it motivational and actionable.
    """
    try:
        response = llm.invoke(prompt)
        return response.strip()
    except Exception as e:
        print(f"AI insights generation error: {e}")
        return generate_fallback_insights(stats)

def generate_fallback_insights(stats):
    completion = stats['completion_percentage']
    
    if completion >= 80:
        return f"Excellent progress! You're maintaining a {completion}% completion rate with a {stats['current_streak']}-day streak. Your consistency is paying off!"
    elif completion >= 60:
        return f"Good progress! You're at {completion}% completion. Your {stats['weekly_average']} workouts per week show solid commitment. Keep building on this momentum!"
    elif completion >= 40:
        return f"You're making progress at {completion}% completion. Focus on consistency - even short workouts count. Your effort is building a foundation for success!"
    else:
        return f"Starting your fitness journey with {stats['total_completed_workouts']} completed workouts. Every session matters - you're building healthy habits one workout at a time!"

def generate_recommendations(stats, user_data):
    recommendations = []
    
    completion_rate = stats['completion_percentage']
    streak = stats['current_streak']
    weekly_avg = stats['weekly_average']
    target_days = user_data.get('days_per_week', 3)
    
    if completion_rate < 50:
        recommendations.append("Try breaking workouts into shorter 15-20 minute sessions to build consistency")
        recommendations.append("Focus on completing 2-3 exercises per session rather than full workouts")
    elif completion_rate < 75:
        recommendations.append("You're building good habits! Try to complete one additional exercise per workout")
    else:
        recommendations.append("Excellent consistency! Consider gradually increasing workout intensity or duration")
    
    if weekly_avg < target_days * 0.7:
        recommendations.append(f"Aim to increase workout frequency - target {target_days} sessions per week")
        recommendations.append("Schedule workouts at consistent times to build a routine")
    elif weekly_avg >= target_days:
        recommendations.append("Great workout frequency! Focus on progressive overload and proper form")
    
    if streak < 3:
        recommendations.append("Build momentum with small wins - even 10-minute workouts maintain your streak")
    elif streak >= 7:
        recommendations.append("Amazing streak! Remember to include rest days for recovery")
    
    if len(stats['favorite_exercises']) < 3:
        recommendations.append("Try incorporating more exercise variety to work different muscle groups")
    
    goal = user_data.get('goal', '').lower()
    if 'weight' in goal and 'loss' in goal:
        recommendations.append("Combine your workouts with cardio sessions for optimal weight loss results")
    elif 'muscle' in goal or 'strength' in goal:
        recommendations.append("Focus on progressive overload - gradually increase weights or reps each week")
    elif 'endurance' in goal:
        recommendations.append("Gradually increase workout duration and reduce rest times between exercises")
    
    return recommendations[:4]
