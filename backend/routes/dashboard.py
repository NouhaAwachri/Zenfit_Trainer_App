# backend/routes/dashboard.py - Performance Dashboard API Endpoints

from flask import Blueprint, request, jsonify
from models.user_profile import UserProfile
from models.db import db
from services.llm_engine import LLMEngine
from services.agents.performance_dashboard_agent import (
    get_performance_dashboard_for_api,
    get_dashboard_widget_data,
    PerformanceDashboardAgent
)
import json
from datetime import datetime

dashboard_bp = Blueprint("dashboard", __name__)

# Initialize LLM Engine
llm = LLMEngine(provider="ollama", model="qwen2.5:3b-instruct", timeout=180)

@dashboard_bp.route("/dashboard/full/<user_id>", methods=["GET"])
def get_full_dashboard(user_id):
    """
    Get complete performance dashboard for a user
    
    Query params:
    - period: "7_days", "30_days", "90_days", "all_time" (default: 30_days)
    """
    try:
        # Get time period from query params
        time_period = request.args.get('period', '30_days')
        
        # Validate time period
        valid_periods = ["7_days", "30_days", "90_days", "all_time"]
        if time_period not in valid_periods:
            return jsonify({"error": f"Invalid period. Must be one of: {valid_periods}"}), 400
        
        print(f"📊 Generating full dashboard for user: {user_id}, period: {time_period}")
        
        # Generate dashboard
        dashboard_data = get_performance_dashboard_for_api(user_id, time_period)
        
        if "error" in dashboard_data:
            return jsonify(dashboard_data), 404
        
        return jsonify({
            "success": True,
            "dashboard": dashboard_data,
            "generated_at": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_full_dashboard: {e}")
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route("/dashboard/summary/<user_id>", methods=["GET"])
def get_dashboard_summary(user_id):
    """Get dashboard summary with key metrics only"""
    try:
        print(f"📈 Getting dashboard summary for user: {user_id}")
        
        time_period = request.args.get('period', '30_days')
        widget_data = get_dashboard_widget_data(user_id, "summary")
        
        if "error" in widget_data:
            return jsonify(widget_data), 404
        
        return jsonify({
            "success": True,
            "period": time_period,
            "summary": widget_data
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_dashboard_summary: {e}")
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route("/dashboard/achievements/<user_id>", methods=["GET"])
def get_user_achievements(user_id):
    """Get user achievements and milestones"""
    try:
        print(f"🏆 Getting achievements for user: {user_id}")
        
        achievements = get_dashboard_widget_data(user_id, "achievements")
        
        if "error" in achievements:
            return jsonify(achievements), 404
        
        return jsonify({
            "success": True,
            "achievements": achievements,
            "total_count": len(achievements)
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_user_achievements: {e}")
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route("/dashboard/recommendations/<user_id>", methods=["GET"])
def get_user_recommendations(user_id):
    """Get personalized recommendations for improvement"""
    try:
        print(f"💡 Getting recommendations for user: {user_id}")
        
        recommendations = get_dashboard_widget_data(user_id, "recommendations")
        
        if "error" in recommendations:
            return jsonify(recommendations), 404
        
        # Sort by priority
        priority_order = {"high": 3, "medium": 2, "low": 1}
        recommendations.sort(key=lambda x: priority_order.get(x.get('priority', 'low'), 1), reverse=True)
        
        return jsonify({
            "success": True,
            "recommendations": recommendations,
            "total_count": len(recommendations)
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_user_recommendations: {e}")
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route("/dashboard/trends/<user_id>", methods=["GET"])
def get_performance_trends(user_id):
    """Get performance trends and progress over time"""
    try:
        print(f"📈 Getting performance trends for user: {user_id}")
        
        trends = get_dashboard_widget_data(user_id, "trends")
        
        if "error" in trends:
            return jsonify(trends), 404
        
        return jsonify({
            "success": True,
            "trends": trends
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_performance_trends: {e}")
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route("/dashboard/consistency/<user_id>", methods=["GET"])
def get_consistency_metrics(user_id):
    """Get detailed consistency and streak information"""
    try:
        print(f"⚡ Getting consistency metrics for user: {user_id}")
        
        consistency = get_dashboard_widget_data(user_id, "consistency")
        
        if "error" in consistency:
            return jsonify(consistency), 404
        
        return jsonify({
            "success": True,
            "consistency": consistency
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_consistency_metrics: {e}")
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route("/dashboard/exercise-performance/<user_id>", methods=["GET"])
def get_exercise_performance(user_id):
    """Get detailed exercise performance analysis"""
    try:
        print(f"💪 Getting exercise performance for user: {user_id}")
        
        exercise_perf = get_dashboard_widget_data(user_id, "exercise_performance")
        
        if "error" in exercise_perf:
            return jsonify(exercise_perf), 404
        
        return jsonify({
            "success": True,
            "exercise_performance": exercise_perf
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_exercise_performance: {e}")
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route("/dashboard/insights/<user_id>", methods=["GET"])
def get_ai_insights(user_id):
    """Generate fresh AI insights based on recent performance"""
    try:
        print(f"🤖 Generating AI insights for user: {user_id}")
        
        time_period = request.args.get('period', '30_days')
        
        # Get user profile
        user_profile = UserProfile.query.filter_by(firebase_uid=user_id).first()
        if not user_profile:
            return jsonify({"error": "User profile not found"}), 404
        
        # Convert to dict
        user_data = {
            "firebase_uid": user_id,
            "goal": user_profile.goal,
            "experience": user_profile.experience,
            "age": user_profile.age,
            "equipment": user_profile.equipment,
            "days_per_week": user_profile.days_per_week
        }
        
        # Generate insights using dashboard agent
        dashboard_agent = PerformanceDashboardAgent(llm)
        
        # Get performance data first
        performance_data = dashboard_agent._collect_performance_data(
            user_id, 
            datetime.utcnow() - (
                timedelta(days=7) if time_period == "7_days" else
                timedelta(days=30) if time_period == "30_days" else
                timedelta(days=90) if time_period == "90_days" else
                timedelta(days=365)
            ),
            datetime.utcnow()
        )
        
        # Generate AI insights
        period_name = {
            "7_days": "Last 7 Days",
            "30_days": "Last 30 Days", 
            "90_days": "Last 90 Days",
            "all_time": "All Time"
        }.get(time_period, "Recent Period")
        
        insights = dashboard_agent._generate_ai_insights(performance_data, user_data, period_name)
        
        return jsonify({
            "success": True,
            "insights": insights,
            "period": period_name,
            "generated_at": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        print(f"❌ Error in get_ai_insights: {e}")
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route("/dashboard/compare/<user_id>", methods=["GET"])
def compare_periods(user_id):
    """Compare performance between two time periods"""
    try:
        # Get query parameters
        period1 = request.args.get('period1', '30_days')  # Current period
        period2 = request.args.get('period2', '60_days')  # Comparison period
        
        print(f"📊 Comparing periods for user: {user_id} ({period1} vs {period2})")
        
        # Get dashboard data for both periods
        current_data = get_performance_dashboard_for_api(user_id, period1)
        comparison_data = get_performance_dashboard_for_api(user_id, period2)
        
        if "error" in current_data or "error" in comparison_data:
            return jsonify({"error": "Failed to get comparison data"}), 404
        
        # Extract metrics for comparison
        current_metrics = current_data.get("performance_metrics", {}).get("summary", {})
        comparison_metrics = comparison_data.get("performance_metrics", {}).get("summary", {})
        
        # Calculate changes
        comparison_result = {}
        for key in current_metrics:
            if key in comparison_metrics:
                current_val = current_metrics[key]
                comparison_val = comparison_metrics[key]
                
                if isinstance(current_val, (int, float)) and isinstance(comparison_val, (int, float)):
                    if comparison_val != 0:
                        change_percent = ((current_val - comparison_val) / comparison_val) * 100
                    else:
                        change_percent = 100 if current_val > 0 else 0
                    
                    comparison_result[key] = {
                        "current": current_val,
                        "previous": comparison_val,
                        "change": current_val - comparison_val,
                        "change_percent": round(change_percent, 1),
                        "trend": "improving" if change_percent > 5 else "declining" if change_percent < -5 else "stable"
                    }
        
        return jsonify({
            "success": True,
            "period1": period1,
            "period2": period2,
            "comparison": comparison_result,
            "summary": {
                "improving_metrics": len([m for m in comparison_result.values() if m["trend"] == "improving"]),
                "declining_metrics": len([m for m in comparison_result.values() if m["trend"] == "declining"]),
                "stable_metrics": len([m for m in comparison_result.values() if m["trend"] == "stable"])
            }
        }), 200
        
    except Exception as e:
        print(f"❌ Error in compare_periods: {e}")
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route("/dashboard/export/<user_id>", methods=["GET"])
def export_dashboard_data(user_id):
    """Export complete dashboard data for external use"""
    try:
        print(f"📤 Exporting dashboard data for user: {user_id}")
        
        time_period = request.args.get('period', '30_days')
        format_type = request.args.get('format', 'json')  # json or csv
        
        dashboard_data = get_performance_dashboard_for_api(user_id, time_period)
        
        if "error" in dashboard_data:
            return jsonify(dashboard_data), 404
        
        if format_type == 'json':
            return jsonify({
                "success": True,
                "export_data": dashboard_data,
                "export_format": "json",
                "exported_at": datetime.utcnow().isoformat()
            }), 200
        
        # For CSV format, you could implement CSV conversion here
        # For now, return JSON with CSV indication
        return jsonify({
            "success": True,
            "message": "CSV export not yet implemented",
            "data": dashboard_data
        }), 200
        
    except Exception as e:
        print(f"❌ Error in export_dashboard_data: {e}")
        return jsonify({"error": str(e)}), 500

@dashboard_bp.route("/dashboard/refresh/<user_id>", methods=["POST"])
def refresh_dashboard(user_id):
    """Force refresh dashboard data and clear any caches"""
    try:
        print(f"🔄 Refreshing dashboard for user: {user_id}")
        
        time_period = request.json.get('period', '30_days') if request.json else '30_days'
        
        # Generate fresh dashboard data
        dashboard_data = get_performance_dashboard_for_api(user_id, time_period)
        
        if "error" in dashboard_data:
            return jsonify(dashboard_data), 404
        
        return jsonify({
            "success": True,
            "message": "Dashboard refreshed successfully",
            "dashboard": dashboard_data,
            "refreshed_at": datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        print(f"❌ Error in refresh_dashboard: {e}")
        return jsonify({"error": str(e)}), 500

# Health check for dashboard service
@dashboard_bp.route("/dashboard/health", methods=["GET"])
def dashboard_health_check():
    return jsonify({
        "status": "healthy", 
        "service": "performance_dashboard",
        "version": "1.0.0",
        "features": [
            "full_dashboard",
            "summary_metrics", 
            "achievements",
            "recommendations",
            "trends_analysis",
            "ai_insights",
            "period_comparison"
        ]
    }), 200