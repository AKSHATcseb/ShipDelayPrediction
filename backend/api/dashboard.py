"""
Dashboard API endpoints.
Provides summary metrics, Gantt data, and chart metrics for the frontend interface.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from datetime import date, timedelta
from collections import Counter

from backend.database import get_db
from backend.models.project import Project, ProjectStatus
from backend.models.activity import ProjectActivity, ActivityStatus
from backend.services.project_service import get_project_stats
from backend.api.auth import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_summary(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Computes summary metrics for all projects in the system."""
    projects = db.query(Project).all()
    
    total = len(projects)
    active = 0
    completed = 0
    delayed = 0
    on_hold = 0
    
    risk_counts = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    delays_pct = []
    
    recent_activities = []
    upcoming_milestones = []
    project_health_list = []
    
    for p in projects:
        stats = get_project_stats(p)
        
        # Count by status
        if p.current_status == ProjectStatus.ACTIVE:
            active += 1
            if stats["delayed_activities"] > 0:
                delayed += 1
        elif p.current_status == ProjectStatus.COMPLETED:
            completed += 1
        elif p.current_status == ProjectStatus.ON_HOLD:
            on_hold += 1
            
        # Get latest prediction metrics
        latest_pred = p.predictions[0] if p.predictions else None
        if latest_pred:
            risk = latest_pred.risk_category
            risk_counts[risk] = risk_counts.get(risk, 0) + 1
            delays_pct.append(latest_pred.delay_percentage)
            
            project_health_list.append({
                "id": p.id,
                "project_name": p.project_name,
                "project_id_code": p.project_id_code,
                "progress": stats["overall_progress"],
                "predicted_delay_pct": latest_pred.delay_percentage,
                "predicted_delay_months": latest_pred.delay_months,
                "risk_category": risk,
                "confidence": latest_pred.confidence
            })
        else:
            # Fallback risk mapping
            risk_counts["Low"] += 1
            
    # Compute average delay
    avg_delay_pct = round(sum(delays_pct) / max(1, len(delays_pct)), 1) if delays_pct else 0.0

    # Get 5 recently updated activities
    recent_acts = db.query(ProjectActivity).order_by(ProjectActivity.updated_at.desc()).limit(5).all()
    for ra in recent_acts:
        recent_activities.append({
            "id": ra.id,
            "project_id": ra.project_id,
            "project_name": ra.project.project_name,
            "activity_name": ra.name,
            "status": ra.current_status.value,
            "progress": ra.completion_percentage,
            "updated_at": ra.updated_at
        })

    # Get 5 upcoming milestones
    milestones = db.query(ProjectActivity).filter(
        ProjectActivity.is_milestone == True,
        ProjectActivity.current_status != ActivityStatus.COMPLETED
    ).order_by(ProjectActivity.planned_end_date.asc()).limit(5).all()
    
    for ms in milestones:
        upcoming_milestones.append({
            "id": ms.id,
            "project_id": ms.project_id,
            "project_name": ms.project.project_name,
            "milestone_name": ms.name,
            "planned_end_date": ms.planned_end_date,
            "status": ms.current_status.value
        })

    return {
        "total_projects": total,
        "active_projects": active,
        "completed_projects": completed,
        "delayed_projects": delayed,
        "on_hold_projects": on_hold,
        "avg_delay_percentage": avg_delay_pct,
        "risk_distribution": risk_counts,
        "recent_activities": recent_activities,
        "upcoming_milestones": upcoming_milestones,
        "project_health": project_health_list
    }

@router.get("/gantt/{id}")
def get_gantt_chart(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Prepares structured data for visualizing project schedules on Gantt charts."""
    project = db.query(Project).filter(Project.id == id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    gantt_activities = []
    gantt_dependencies = []

    for act in project.activities:
        gantt_activities.append({
            "id": str(act.id),
            "text": act.name,
            "start_date": act.actual_start_date.isoformat() if act.actual_start_date else (act.planned_start_date.isoformat() if act.planned_start_date else None),
            "end_date": act.actual_end_date.isoformat() if act.actual_end_date else (act.planned_end_date.isoformat() if act.planned_end_date else None),
            "progress": act.completion_percentage / 100.0,
            "status": act.current_status.value,
            "category": act.category,
            "is_milestone": act.is_milestone,
            "is_critical": act.is_critical_path,
            "assignee": act.assigned_officer or "Unassigned"
        })

        for dep_id in act.dependency_list or []:
            gantt_dependencies.append({
                "id": f"link_{dep_id}_{act.id}",
                "source": str(dep_id),
                "target": str(act.id),
                "type": "0"  # Standard Finish-to-Start (FS) link
            })

    return {
        "activities": gantt_activities,
        "dependencies": gantt_dependencies
    }
