# agents/performance_dashboard_agent.py

import json
from datetime import datetime, timedelta
from langchain_core.messages import AIMessage
from models.workout_program import WorkoutProgram
from models.workoutLog_model import WorkoutLog, WorkoutExercise
from models.user_profile import UserProfile
from models.db import db
from sqlalchemy import func, desc
import statistics

class PerformanceDashboardAgent:
    """
    Generates comprehensive performance dashboards based on user training data
    """
    
    def __init__(self, llm_engine):
        self.llm = llm_engine
    
    def generate_dashboard(self, user_data, time_period="30_days"):
        """
        Generate a comprehensive performance dashboard
        
        Args:
            user_data: User profile and preferences
            time_period: "7_days", "30_days", "90_days", "all_time"
        """
        try:
            user_id = user_data.get('firebase_uid') or user_data.get('uid')
            if not user_id:
                return {"error": "User ID not found"}
            
            print(f"📊 Generating performance dashboard for user: {user_id}")
            print(f"⏰ Time period: {time_period}")
            
            # Get time range
            end_date = datetime.utcnow()
            if time_period == "7_days":
                start_date = end_date - timedelta(days=7)
                period_name = "Last 7 Days"
            elif time_period == "30_days":
                start_date = end_date - timedelta(days=30)
                period_name = "Last 30 Days"
            elif time_period == "90_days":
                start_date = end_date - timedelta(days=90)
                period_name = "Last 90 Days"
            else:  # all_time
                start_date = datetime(2020, 1, 1)  # Far back date
                period_name = "All Time"
            
            # Collect all performance data
            performance_data = self._collect_performance_data(user_id, start_date, end_date)
            
            # Generate AI insights
            ai_insights = self._generate_ai_insights(performance_data, user_data, period_name)
            
            # Build dashboard
            dashboard = {
                "period": period_name,
                "generated_at": datetime.utcnow().isoformat(),
                "user_profile": self._get_user_summary(user_data),
                "performance_metrics": performance_data,
                "ai_insights": ai_insights,
                "recommendations": self._generate_recommendations(performance_data, user_data),
                "trends": self._analyze_trends(performance_data, user_id, start_date),
                "achievements": self._identify_achievements(performance_data, user_id),
                "areas_for_improvement": self._identify_improvement_areas(performance_data, user_data)
            }
            
            return dashboard
            
        except Exception as e:
            print(f"❌ Error generating performance dashboard: {e}")
            return {"error": f"Failed to generate dashboard: {str(e)}"}
    
    def _collect_performance_data(self, user_id, start_date, end_date):
        """Collect comprehensive performance data from database"""
        try:
            print("📈 Collecting performance data...")
            
            # Get workout logs in period
            workout_logs = WorkoutLog.query.filter(
                WorkoutLog.user_id == user_id,
                WorkoutLog.date >= start_date.date(),
                WorkoutLog.date <= end_date.date()
            ).order_by(WorkoutLog.date.desc()).all()
            
            # Get current workout program
            current_program = WorkoutProgram.query.filter_by(
                user_id=user_id
            ).order_by(desc(WorkoutProgram.id)).first()
            
            # Get all exercises for current program
            program_exercises = []
            if current_program:
                program_exercises = WorkoutExercise.query.filter_by(
                    program_id=current_program.id
                ).all()
            
            # Calculate metrics
            total_workouts = len(workout_logs)
            total_time = sum(log.duration for log in workout_logs if log.duration)
            
            # Exercise completion data
            total_exercises = len(program_exercises)
            completed_exercises = sum(1 for ex in program_exercises if ex.completed)
            completion_rate = (completed_exercises / total_exercises * 100) if total_exercises > 0 else 0
            
            # Weekly frequency
            weeks_in_period = max(1, (end_date - start_date).days / 7)
            weekly_frequency = total_workouts / weeks_in_period
            
            # Workout intensity analysis
            intensity_data = self._analyze_workout_intensity(workout_logs)
            
            # Consistency metrics
            consistency_data = self._analyze_consistency(workout_logs, start_date, end_date)
            
            # Exercise performance tracking
            exercise_performance = self._analyze_exercise_performance(workout_logs, program_exercises)
            
            # Progress over time
            progress_timeline = self._create_progress_timeline(workout_logs)
            
            return {
                "summary": {
                    "total_workouts": total_workouts,
                    "total_time_minutes": total_time,
                    "total_time_hours": round(total_time / 60, 1) if total_time else 0,
                    "completion_rate": round(completion_rate, 1),
                    "weekly_frequency": round(weekly_frequency, 1),
                    "total_exercises": total_exercises,
                    "completed_exercises": completed_exercises
                },
                "intensity": intensity_data,
                "consistency": consistency_data,
                "exercise_performance": exercise_performance,
                "progress_timeline": progress_timeline,
                "recent_workouts": self._format_recent_workouts(workout_logs[:10]),
                "program_info": {
                    "current_program_id": current_program.id if current_program else None,
                    "program_name": getattr(current_program, 'name', 'Current Program') if current_program else None,
                    "total_days": len(set((ex.week, ex.day) for ex in program_exercises)) if program_exercises else 0
                }
            }
            
        except Exception as e:
            print(f"❌ Error collecting performance data: {e}")
            return {"error": str(e)}
    
    def _analyze_workout_intensity(self, workout_logs):
        """Analyze workout intensity patterns"""
        if not workout_logs:
            return {"average_duration": 0, "intensity_trend": "No data"}
        
        durations = [log.duration for log in workout_logs if log.duration and log.duration > 0]
        
        if not durations:
            return {"average_duration": 0, "intensity_trend": "No duration data"}
        
        avg_duration = statistics.mean(durations)
        
        # Determine intensity trend
        if len(durations) >= 3:
            recent_avg = statistics.mean(durations[:3])
            older_avg = statistics.mean(durations[-3:])
            
            if recent_avg > older_avg * 1.1:
                trend = "Increasing"
            elif recent_avg < older_avg * 0.9:
                trend = "Decreasing"
            else:
                trend = "Stable"
        else:
            trend = "Insufficient data"
        
        return {
            "average_duration": round(avg_duration, 1),
            "max_duration": max(durations),
            "min_duration": min(durations),
            "intensity_trend": trend,
            "total_sessions": len(durations)
        }
    
    def _analyze_consistency(self, workout_logs, start_date, end_date):
        """Analyze workout consistency and patterns"""
        if not workout_logs:
            return {"consistency_score": 0, "longest_streak": 0, "current_streak": 0}
        
        # Calculate consistency score based on regularity
        total_days = (end_date - start_date).days
        workout_days = len(set(log.date for log in workout_logs))
        consistency_score = (workout_days / total_days * 100) if total_days > 0 else 0
        
        # Calculate streaks
        workout_dates = sorted([log.date for log in workout_logs])
        current_streak = self._calculate_current_streak(workout_dates)
        longest_streak = self._calculate_longest_streak(workout_dates)
        
        # Weekly pattern analysis
        weekday_counts = {}
        for log in workout_logs:
            weekday = log.date.strftime('%A')
            weekday_counts[weekday] = weekday_counts.get(weekday, 0) + 1
        
        preferred_days = sorted(weekday_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        
        return {
            "consistency_score": round(consistency_score, 1),
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "workout_days": workout_days,
            "total_possible_days": total_days,
            "preferred_workout_days": [day for day, count in preferred_days],
            "weekday_distribution": weekday_counts
        }
    
    def _calculate_current_streak(self, workout_dates):
        """Calculate current workout streak"""
        if not workout_dates:
            return 0
        
        today = datetime.utcnow().date()
        streak = 0
        check_date = today
        
        # Look back from today to find consecutive workout days
        for i in range(30):  # Check last 30 days max
            if check_date in workout_dates:
                streak += 1
                check_date -= timedelta(days=1)
            else:
                # Allow 1 day gap (rest days)
                check_date -= timedelta(days=1)
                if check_date in workout_dates:
                    streak += 1
                    check_date -= timedelta(days=1)
                else:
                    break
        
        return streak
    
    def _calculate_longest_streak(self, workout_dates):
        """Calculate longest historical workout streak"""
        if not workout_dates:
            return 0
        
        longest = 0
        current = 1
        
        for i in range(1, len(workout_dates)):
            days_diff = (workout_dates[i] - workout_dates[i-1]).days
            if days_diff <= 2:  # Allow 1 rest day between workouts
                current += 1
            else:
                longest = max(longest, current)
                current = 1
        
        return max(longest, current)
    
    def _analyze_exercise_performance(self, workout_logs, program_exercises):
        """Analyze performance on specific exercises"""
        exercise_stats = {}
        
        # Analyze exercises from workout logs
        for log in workout_logs:
            if log.exercises:
                try:
                    exercises_data = json.loads(log.exercises)
                    for exercise in exercises_data:
                        name = exercise.get('name', 'Unknown')
                        if exercise.get('completed'):
                            if name not in exercise_stats:
                                exercise_stats[name] = {
                                    'total_sessions': 0,
                                    'completion_rate': 0,
                                    'avg_sets': 0,
                                    'avg_reps': 0
                                }
                            exercise_stats[name]['total_sessions'] += 1
                except:
                    continue
        
        # Analyze current program exercises
        program_exercise_stats = {}
        for exercise in program_exercises:
            name = exercise.name
            if name not in program_exercise_stats:
                program_exercise_stats[name] = {
                    'total_occurrences': 0,
                    'completed_count': 0,
                    'completion_rate': 0,
                    'avg_sets': 0,
                    'avg_reps': 0
                }
            
            stats = program_exercise_stats[name]
            stats['total_occurrences'] += 1
            if exercise.completed:
                stats['completed_count'] += 1
            stats['avg_sets'] = exercise.sets or 0
            stats['avg_reps'] = exercise.reps or 0
        
        # Calculate completion rates
        for name, stats in program_exercise_stats.items():
            if stats['total_occurrences'] > 0:
                stats['completion_rate'] = round(
                    (stats['completed_count'] / stats['total_occurrences']) * 100, 1
                )
        
        # Find top and struggling exercises
        top_exercises = sorted(
            program_exercise_stats.items(), 
            key=lambda x: x[1]['completion_rate'], 
            reverse=True
        )[:5]
        
        struggling_exercises = sorted(
            program_exercise_stats.items(),
            key=lambda x: x[1]['completion_rate']
        )[:3]
        
        return {
            "exercise_details": program_exercise_stats,
            "top_performing_exercises": [{"name": name, **stats} for name, stats in top_exercises],
            "struggling_exercises": [{"name": name, **stats} for name, stats in struggling_exercises],
            "total_unique_exercises": len(program_exercise_stats)
        }
    
    def _create_progress_timeline(self, workout_logs):
        """Create timeline of progress over time"""
        timeline = []
        
        # Group workouts by week
        weekly_data = {}
        for log in workout_logs:
            week_start = log.date - timedelta(days=log.date.weekday())
            week_key = week_start.strftime('%Y-%m-%d')
            
            if week_key not in weekly_data:
                weekly_data[week_key] = {
                    'week_start': week_key,
                    'workout_count': 0,
                    'total_duration': 0,
                    'completed_exercises': 0
                }
            
            weekly_data[week_key]['workout_count'] += 1
            weekly_data[week_key]['total_duration'] += log.duration or 0
            
            if log.exercises:
                try:
                    exercises = json.loads(log.exercises)
                    completed = sum(1 for ex in exercises if ex.get('completed'))
                    weekly_data[week_key]['completed_exercises'] += completed
                except:
                    pass
        
        # Convert to sorted timeline
        timeline = sorted(weekly_data.values(), key=lambda x: x['week_start'])
        
        return timeline[-8:]  # Last 8 weeks
    
    def _format_recent_workouts(self, recent_logs):
        """Format recent workout data for dashboard"""
        formatted_workouts = []
        
        for log in recent_logs:
            workout_data = {
                "date": log.date.isoformat(),
                "duration": log.duration or 0,
                "week": log.week,
                "day": log.day,
                "notes": log.notes or "",
                "completed_exercises": 0,
                "total_exercises": 0
            }
            
            if log.exercises:
                try:
                    exercises = json.loads(log.exercises)
                    workout_data["total_exercises"] = len(exercises)
                    workout_data["completed_exercises"] = sum(1 for ex in exercises if ex.get('completed'))
                    workout_data["exercise_details"] = exercises
                except:
                    pass
            
            formatted_workouts.append(workout_data)
        
        return formatted_workouts
    
    def _generate_ai_insights(self, performance_data, user_data, period_name):
        """Generate AI-powered insights about performance"""
        try:
            # Prepare data summary for LLM
            summary = performance_data.get('summary', {})
            consistency = performance_data.get('consistency', {})
            intensity = performance_data.get('intensity', {})
            
            insights_prompt = f"""
Analyze this user's fitness performance data and provide personalized insights:

USER PROFILE:
- Goal: {user_data.get('goal', 'General Fitness')}
- Experience: {user_data.get('experience', 'Beginner')}
- Age: {user_data.get('age', 'N/A')}
- Equipment: {user_data.get('equipment', 'Bodyweight Only')}

PERFORMANCE DATA ({period_name}):
- Total Workouts: {summary.get('total_workouts', 0)}
- Total Time: {summary.get('total_time_hours', 0)} hours
- Exercise Completion Rate: {summary.get('completion_rate', 0)}%
- Weekly Frequency: {summary.get('weekly_frequency', 0)} workouts/week
- Consistency Score: {consistency.get('consistency_score', 0)}%
- Current Streak: {consistency.get('current_streak', 0)} days
- Average Workout Duration: {intensity.get('average_duration', 0)} minutes

Provide 3-4 key insights in a conversational, encouraging tone. Focus on:
1. Overall progress assessment
2. Strengths to celebrate
3. Patterns you notice
4. One specific area for improvement

Keep each insight to 1-2 sentences. Be motivational and actionable.
"""

            response = self.llm.invoke(insights_prompt)
            return str(response.content) if hasattr(response, 'content') else str(response)
            
        except Exception as e:
            print(f"❌ Error generating AI insights: {e}")
            return self._generate_fallback_insights(performance_data, user_data)
    
    def _generate_fallback_insights(self, performance_data, user_data):
        """Generate fallback insights if LLM fails"""
        summary = performance_data.get('summary', {})
        consistency = performance_data.get('consistency', {})
        
        insights = []
        
        # Progress assessment
        completion_rate = summary.get('completion_rate', 0)
        if completion_rate >= 80:
            insights.append("🎉 Excellent work! You're completing over 80% of your exercises, showing great dedication to your fitness goals.")
        elif completion_rate >= 60:
            insights.append("💪 Good progress! You're staying consistent with your workouts and building healthy habits.")
        else:
            insights.append("🌱 You're building your fitness foundation. Every workout counts, and consistency will lead to great results!")
        
        # Consistency feedback
        consistency_score = consistency.get('consistency_score', 0)
        if consistency_score >= 70:
            insights.append("⚡ Your consistency is impressive! Regular training is the key to achieving lasting fitness results.")
        else:
            insights.append("🎯 Focus on building consistency. Try scheduling your workouts at the same time each day to create a routine.")
        
        # Frequency feedback
        weekly_freq = summary.get('weekly_frequency', 0)
        target_days = int(user_data.get('days_per_week', '3').split()[0])
        if weekly_freq >= target_days * 0.8:
            insights.append(f"🏆 You're hitting your target of {target_days} workouts per week! Your commitment is paying off.")
        else:
            insights.append(f"📈 Aim to increase your workout frequency to reach your goal of {target_days} sessions per week.")
        
        return " ".join(insights)
    
    def _generate_recommendations(self, performance_data, user_data):
        """Generate specific recommendations based on performance analysis"""
        recommendations = []
        
        summary = performance_data.get('summary', {})
        consistency = performance_data.get('consistency', {})
        intensity = performance_data.get('intensity', {})
        exercise_perf = performance_data.get('exercise_performance', {})
        
        # Completion rate recommendations
        completion_rate = summary.get('completion_rate', 0)
        if completion_rate < 50:
            recommendations.append({
                "category": "Exercise Completion",
                "priority": "high",
                "title": "Focus on Exercise Completion", 
                "description": "Try reducing the number of exercises per workout or lowering the intensity to build consistency.",
                "actionable_steps": [
                    "Start with 3-4 exercises per session",
                    "Reduce reps by 20-30% if struggling",
                    "Celebrate completing any amount rather than skipping entirely"
                ]
            })
        
        # Consistency recommendations
        consistency_score = consistency.get('consistency_score', 0)
        if consistency_score < 60:
            recommendations.append({
                "category": "Consistency",
                "priority": "high",
                "title": "Build Workout Consistency",
                "description": "Establish a regular workout schedule to improve adherence and results.",
                "actionable_steps": [
                    "Choose specific days and times for workouts",
                    "Start with shorter, 20-30 minute sessions",
                    "Set up workout reminders on your phone"
                ]
            })
        
        # Duration recommendations
        avg_duration = intensity.get('average_duration', 0)
        if avg_duration > 0 and avg_duration < 20:
            recommendations.append({
                "category": "Workout Duration",
                "priority": "medium",
                "title": "Extend Workout Duration",
                "description": "Gradually increase workout length for better fitness benefits.",
                "actionable_steps": [
                    "Add 5 minutes to each workout this week",
                    "Include proper warm-up and cool-down",
                    "Try adding one extra exercise per session"
                ]
            })
        elif avg_duration > 90:
            recommendations.append({
                "category": "Workout Duration", 
                "priority": "medium",
                "title": "Optimize Workout Efficiency",
                "description": "Very long workouts may lead to burnout. Focus on quality over quantity.",
                "actionable_steps": [
                    "Aim for 45-60 minute sessions",
                    "Reduce rest times between exercises",
                    "Focus on compound movements for efficiency"
                ]
            })
        
        # Exercise-specific recommendations
        struggling_exercises = exercise_perf.get('struggling_exercises', [])
        if struggling_exercises:
            worst_exercise = struggling_exercises[0]
            recommendations.append({
                "category": "Exercise Performance",
                "priority": "medium",
                "title": f"Improve {worst_exercise['name']} Performance",
                "description": f"You're completing {worst_exercise['completion_rate']}% of {worst_exercise['name']} exercises.",
                "actionable_steps": [
                    "Practice proper form with bodyweight or easier variations",
                    "Reduce reps and focus on quality movement",
                    "Watch tutorial videos for technique tips"
                ]
            })
        
        # Frequency recommendations
        weekly_freq = summary.get('weekly_frequency', 0)
        target_days = int(user_data.get('days_per_week', '3').split()[0])
        if weekly_freq < target_days * 0.7:
            recommendations.append({
                "category": "Workout Frequency",
                "priority": "high", 
                "title": "Increase Workout Frequency",
                "description": f"You're averaging {weekly_freq:.1f} workouts per week vs. your goal of {target_days}.",
                "actionable_steps": [
                    "Schedule workouts in your calendar like appointments",
                    "Try shorter 15-20 minute 'mini-workouts' on busy days",
                    "Find an accountability partner or use fitness apps for motivation"
                ]
            })
        
        return recommendations[:4]  # Limit to top 4 recommendations
    
    def _analyze_trends(self, performance_data, user_id, start_date):
        """Analyze performance trends over time"""
        timeline = performance_data.get('progress_timeline', [])
        
        if len(timeline) < 2:
            return {"trend": "insufficient_data", "message": "Need more data to identify trends"}
        
        # Calculate trends
        recent_weeks = timeline[-4:] if len(timeline) >= 4 else timeline
        older_weeks = timeline[:-4] if len(timeline) >= 4 else []
        
        if not older_weeks:
            return {"trend": "insufficient_data", "message": "Need more historical data"}
        
        recent_avg_workouts = statistics.mean([w['workout_count'] for w in recent_weeks])
        older_avg_workouts = statistics.mean([w['workout_count'] for w in older_weeks])
        
        recent_avg_duration = statistics.mean([w['total_duration'] for w in recent_weeks])
        older_avg_duration = statistics.mean([w['total_duration'] for w in older_weeks])
        
        # Determine trends
        workout_trend = "improving" if recent_avg_workouts > older_avg_workouts * 1.1 else \
                      "declining" if recent_avg_workouts < older_avg_workouts * 0.9 else "stable"
        
        duration_trend = "improving" if recent_avg_duration > older_avg_duration * 1.1 else \
                        "declining" if recent_avg_duration < older_avg_duration * 0.9 else "stable"
        
        return {
            "workout_frequency_trend": workout_trend,
            "duration_trend": duration_trend,
            "recent_avg_workouts_per_week": round(recent_avg_workouts, 1),
            "previous_avg_workouts_per_week": round(older_avg_workouts, 1),
            "recent_avg_duration": round(recent_avg_duration, 1),
            "previous_avg_duration": round(older_avg_duration, 1),
            "timeline_data": timeline
        }
    
    def _identify_achievements(self, performance_data, user_id):
        """Identify user achievements (computed from DB, no new tables)."""
        return build_achievements_from_db(user_id)

    def _identify_improvement_areas(self, performance_data, user_data):
        """Identify specific areas where user can improve"""
        improvement_areas = []
        
        summary = performance_data.get('summary', {})
        consistency = performance_data.get('consistency', {})
        exercise_perf = performance_data.get('exercise_performance', {})
        
        # Check completion rate
        completion_rate = summary.get('completion_rate', 0)
        if completion_rate < 60:
            improvement_areas.append({
                "area": "Exercise Completion",
                "current_performance": f"{completion_rate}%",
                "target": "75%+",
                "impact": "high",
                "description": "Focus on completing more exercises in each workout",
                "quick_wins": [
                    "Reduce exercise difficulty temporarily",
                    "Break exercises into smaller sets",
                    "Focus on form over intensity"
                ]
            })
        
        # Check consistency
        consistency_score = consistency.get('consistency_score', 0)
        if consistency_score < 70:
            improvement_areas.append({
                "area": "Workout Consistency",
                "current_performance": f"{consistency_score}%",
                "target": "80%+",
                "impact": "high",
                "description": "Establish a more regular workout schedule",
                "quick_wins": [
                    "Set fixed workout times",
                    "Prepare workout clothes the night before",
                    "Use workout reminders"
                ]
            })
        
        # Check frequency vs. goals
        weekly_freq = summary.get('weekly_frequency', 0)
        target_days = int(user_data.get('days_per_week', '3').split()[0])
        if weekly_freq < target_days * 0.8:
            improvement_areas.append({
                "area": "Workout Frequency",
                "current_performance": f"{weekly_freq:.1f} workouts/week",
                "target": f"{target_days} workouts/week",
                "impact": "medium",
                "description": "Increase weekly workout frequency to meet your goals",
                "quick_wins": [
                    "Add short 15-minute workouts",
                    "Schedule workouts in calendar",
                    "Try morning workouts for consistency"
                ]
            })
        
        # Check struggling exercises
        struggling_exercises = exercise_perf.get('struggling_exercises', [])
        if struggling_exercises and len(struggling_exercises) > 0:
            worst_exercise = struggling_exercises[0]
            if worst_exercise['completion_rate'] < 50:
                improvement_areas.append({
                    "area": f"{worst_exercise['name']} Performance",
                    "current_performance": f"{worst_exercise['completion_rate']}%",
                    "target": "70%+",
                    "impact": "medium",
                    "description": f"Improve performance on {worst_exercise['name']} exercises",
                    "quick_wins": [
                        "Practice easier variations first",
                        "Focus on proper form",
                        "Reduce reps and build up gradually"
                    ]
                })
        
        # Check workout duration
        intensity = performance_data.get('intensity', {})
        avg_duration = intensity.get('average_duration', 0)
        if avg_duration > 0 and avg_duration < 25:
            improvement_areas.append({
                "area": "Workout Duration",
                "current_performance": f"{avg_duration} minutes",
                "target": "30-45 minutes",
                "impact": "low",
                "description": "Extend workout duration for better fitness benefits",
                "quick_wins": [
                    "Add 5 minutes to each workout",
                    "Include proper warm-up time",
                    "Add one extra exercise per session"
                ]
            })
        
        return improvement_areas[:4]  # Limit to top 4 areas
    
    def _get_user_summary(self, user_data):
        """Get user profile summary for dashboard"""
        return {
            "name": user_data.get('name', 'Athlete'),
            "goal": user_data.get('goal', 'General Fitness'),
            "experience": user_data.get('experience', 'Beginner'),
            "target_days_per_week": user_data.get('days_per_week', '3 days'),
            "equipment": user_data.get('equipment', 'Bodyweight Only'),
            "age": user_data.get('age', 'N/A'),
            "preferred_style": user_data.get('style', 'Circuit Training')
        }


# Main agent function for integration with your existing system
def performance_dashboard_agent(state, llm):
    """
    Main agent function that generates performance dashboard
    
    Args:
        state: Agent state containing user_data and other context
        llm: Language model instance
    
    Returns:
        Updated state with dashboard data
    """
    try:
        user_data = state.get("user_data", {})
        time_period = state.get("dashboard_period", "30_days")  # Default to 30 days
        
        print(f"📊 Starting performance dashboard generation...")
        
        # Initialize dashboard agent
        dashboard_agent = PerformanceDashboardAgent(llm)
        
        # Generate comprehensive dashboard
        dashboard_data = dashboard_agent.generate_dashboard(user_data, time_period)
        
        if "error" in dashboard_data:
            error_message = f"❌ Dashboard generation failed: {dashboard_data['error']}"
            state["dashboard_error"] = error_message
            state["messages"].append(AIMessage(content=error_message))
            return state
        
        # Create user-friendly summary message
        summary_message = create_dashboard_summary_message(dashboard_data)
        
        # Update state with dashboard data
        state["performance_dashboard"] = dashboard_data
        state["dashboard_summary"] = summary_message
        state["messages"].append(AIMessage(content=summary_message))
        
        print("✅ Performance dashboard generated successfully")
        return state
        
    except Exception as e:
        error_message = f"❌ Error in performance dashboard agent: {str(e)}"
        print(error_message)
        state["dashboard_error"] = error_message
        state["messages"].append(AIMessage(content=error_message))
        return state


def create_dashboard_summary_message(dashboard_data):
    """Create a user-friendly summary message from dashboard data"""
    try:
        period = dashboard_data.get("period", "Recent period")
        metrics = dashboard_data.get("performance_metrics", {}).get("summary", {})
        insights = dashboard_data.get("ai_insights", "")
        achievements = dashboard_data.get("achievements", [])
        recommendations = dashboard_data.get("recommendations", [])
        
        # Build summary message
        message_parts = []
        
        # Header
        message_parts.append(f"## 📊 Your Performance Dashboard - {period}")
        message_parts.append("")
        
        # Key metrics
        message_parts.append("### 🎯 Key Metrics")
        total_workouts = metrics.get("total_workouts", 0)
        total_hours = metrics.get("total_time_hours", 0)
        completion_rate = metrics.get("completion_rate", 0)
        weekly_freq = metrics.get("weekly_frequency", 0)
        
        message_parts.append(f"- **Total Workouts:** {total_workouts}")
        message_parts.append(f"- **Time Invested:** {total_hours} hours")
        message_parts.append(f"- **Exercise Completion Rate:** {completion_rate}%")
        message_parts.append(f"- **Weekly Frequency:** {weekly_freq:.1f} workouts/week")
        message_parts.append("")
        
        # AI Insights
        if insights:
            message_parts.append("### 🤖 AI Insights")
            message_parts.append(insights)
            message_parts.append("")
        
        # Achievements
        if achievements:
            message_parts.append("### 🏆 Recent Achievements")
            for achievement in achievements[:3]:  # Show top 3
                message_parts.append(f"- {achievement['icon']} **{achievement['title']}**: {achievement['description']}")
            message_parts.append("")
        
        # Top recommendations
        if recommendations:
            message_parts.append("### 💡 Top Recommendations")
            for rec in recommendations[:2]:  # Show top 2
                priority_emoji = "🔴" if rec['priority'] == "high" else "🟡" if rec['priority'] == "medium" else "🟢"
                message_parts.append(f"- {priority_emoji} **{rec['title']}**: {rec['description']}")
            message_parts.append("")
        
        # Call to action
        message_parts.append("💪 **Keep up the great work!** Your consistency and dedication are building the foundation for long-term fitness success.")
        
        return "\n".join(message_parts)
        
    except Exception as e:
        print(f"❌ Error creating dashboard summary: {e}")
        return f"## 📊 Performance Dashboard\n\nDashboard generated successfully! Check your app for detailed insights and recommendations."


# Additional utility functions for dashboard endpoints

def get_performance_dashboard_for_api(user_id, time_period="30_days"):
    """
    Utility function to get performance dashboard data for API endpoints
    
    Args:
        user_id: User Firebase UID
        time_period: "7_days", "30_days", "90_days", "all_time"
    
    Returns:
        Dashboard data dictionary
    """
    try:
        from services.llm_engine import LLMEngine
        
        # Initialize LLM (you may want to make this configurable)
        llm = LLMEngine(provider="ollama", model="qwen2.5:3b-instruct", timeout=180)
        
        # Get user profile
        user_profile = UserProfile.query.filter_by(firebase_uid=user_id).first()
        if not user_profile:
            return {"error": "User profile not found"}
        
        # Convert user profile to dict
        user_data = {
            "firebase_uid": user_id,
            "goal": user_profile.goal,
            "experience": user_profile.experience,
            "age": user_profile.age,
            "gender": user_profile.gender,
            "height": user_profile.height,
            "weight": user_profile.weight,
            "equipment": user_profile.equipment,
            "style": user_profile.style,
            "days_per_week": user_profile.days_per_week
        }
        
        # Generate dashboard
        dashboard_agent = PerformanceDashboardAgent(llm)
        dashboard_data = dashboard_agent.generate_dashboard(user_data, time_period)
        
        return dashboard_data
        
    except Exception as e:
        print(f"❌ Error in get_performance_dashboard_for_api: {e}")
        return {"error": str(e)}


def get_dashboard_widget_data(user_id, widget_type="summary"):
    """
    Get specific widget data for dashboard components
    
    Args:
        user_id: User Firebase UID
        widget_type: "summary", "trends", "achievements", "recommendations"
    
    Returns:
        Widget-specific data
    """
    try:
        # Get full dashboard data
        dashboard_data = get_performance_dashboard_for_api(user_id, "30_days")
        
        if "error" in dashboard_data:
            return dashboard_data
        
        # Extract specific widget data
        if widget_type == "summary":
            return dashboard_data.get("performance_metrics", {}).get("summary", {})
        elif widget_type == "trends":
            return dashboard_data.get("trends", {})
        elif widget_type == "achievements":
            return dashboard_data.get("achievements", [])
        elif widget_type == "recommendations":
            return dashboard_data.get("recommendations", [])
        elif widget_type == "consistency":
            return dashboard_data.get("performance_metrics", {}).get("consistency", {})
        elif widget_type == "exercise_performance":
            return dashboard_data.get("performance_metrics", {}).get("exercise_performance", {})
        else:
            return {"error": f"Unknown widget type: {widget_type}"}
            
    except Exception as e:
        print(f"❌ Error in get_dashboard_widget_data: {e}")
        return {"error": str(e)}
    
# ---- Achievements helpers (computed from existing tables; no new tables) ----
from collections import Counter

def _longest_streak_by_consecutive_days(dates_sorted):
    if not dates_sorted:
        return 0
    best = cur = 1
    for i in range(1, len(dates_sorted)):
        gap = (dates_sorted[i] - dates_sorted[i-1]).days
        if gap == 1:
            cur += 1
            best = max(best, cur)
        elif gap > 1:
            cur = 1
    return best

def _is_week_completed_simple(program_id, week):
    total = WorkoutExercise.query.filter_by(program_id=program_id, week=week).count()
    done  = WorkoutExercise.query.filter_by(program_id=program_id, week=week, completed=True).count()
    return total > 0 and total == done

def build_achievements_from_db(user_id):
    """
    Build achievements using WorkoutLog + WorkoutExercise.completed only.
    Matches your frontend XP categories: 'milestone', 'streak', 'consistency',
    'challenge', 'improvement' (all lower-case).
    """
    # Current program
    program = WorkoutProgram.query.filter_by(user_id=user_id).order_by(desc(WorkoutProgram.id)).first()
    if not program:
        return []
    program_id = program.id

    # Logs and exercises
    logs = WorkoutLog.query.filter_by(user_id=user_id, program_id=program_id).order_by(WorkoutLog.date.asc()).all()
    exercises = WorkoutExercise.query.filter_by(program_id=program_id).all()

    dates_sorted = sorted({l.date for l in logs if getattr(l, "date", None)})
    durations = [int(l.duration or 0) for l in logs]
    workouts_by_iso_week = Counter([d.isocalendar()[:2] for d in dates_sorted])

    # Unique (week, day) with any completed exercise (no real dates here, used as fallback)
    completed_pairs = {(ex.week, ex.day) for ex in exercises if ex.completed}

    achievements = []
    def add(title, description, category, icon, unlocked_at=None, meta=None):
        achievements.append({
            "title": title,
            "description": description,
            "category": category,      # keep lower-case
            "icon": icon,
            "unlocked_at": unlocked_at,
            "meta": meta or {}
        })

    # --- Milestones by total workouts (prefer real logs; fallback to completed day-pairs)
    total_from_logs = len(dates_sorted)
    total_estimate  = max(total_from_logs, len(completed_pairs))
    for t, label, icon in [(1,"First Workout","🎉"), (5,"5 Workouts","🏅"),
                           (10,"10 Workouts","🥈"), (25,"25 Workouts","🥇"),
                           (50,"50 Workouts","🏆")]:
        if total_estimate >= t:
            unlocked_at = dates_sorted[t-1].isoformat() if total_from_logs >= t else None
            add(label, f"You've completed {t} workout{'s' if t>1 else ''}!", "milestone", icon, unlocked_at)

    # --- Streaks from real dates
    longest = _longest_streak_by_consecutive_days(dates_sorted)
    if longest >= 3:
        add("3-Day Streak", "Three days in a row—nice momentum!", "streak", "🔥",
            unlocked_at=(dates_sorted[2].isoformat() if len(dates_sorted) >= 3 else None))
    if longest >= 7:
        add("7-Day Streak", "A full week of consecutive workouts!", "streak", "⚡",
            unlocked_at=(dates_sorted[6].isoformat() if len(dates_sorted) >= 7 else None))

    # --- Completed weeks (every exercise completed)
    week_rows = db.session.query(WorkoutExercise.week)\
                .filter_by(program_id=program_id).distinct().order_by(WorkoutExercise.week).all()
    for w in [w[0] for w in week_rows]:
        if _is_week_completed_simple(program_id, w):
            add(f"Week {w} Completed", "You finished every exercise for the week.",
                "milestone", "✅", meta={"week": w})

    # --- Consistency week: any ISO week with 3+ workouts
    if any(v >= 3 for v in workouts_by_iso_week.values()):
        add("Consistent Week", "3+ workouts in one week—keep rolling!", "consistency", "📅")

    # --- Endurance (long sessions)
    if any(d >= 45 for d in durations):
        i = next((idx for idx, d in enumerate(durations) if d >= 45), None)
        add("Endurance I", "Completed a 45+ minute session.", "challenge", "⏳",
            unlocked_at=(logs[i].date.isoformat() if i is not None else None))
    if any(d >= 60 for d in durations):
        i = next((idx for idx, d in enumerate(durations) if d >= 60), None)
        add("Endurance II", "Completed a 60+ minute session.", "challenge", "⌛",
            unlocked_at=(logs[i].date.isoformat() if i is not None else None))

    # --- Comeback: ≥7-day gap then resumed
    if len(dates_sorted) >= 2:
        for i in range(1, len(dates_sorted)):
            if (dates_sorted[i] - dates_sorted[i-1]).days >= 7:
                add("Comeback", "You paused for a week and came back stronger.",
                    "improvement", "💪", unlocked_at=dates_sorted[i].isoformat())
                break

    return achievements
