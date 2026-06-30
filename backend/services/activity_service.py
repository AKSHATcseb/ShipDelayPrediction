"""
Activity Service.
Handles project activity updates, change logs, and CPM delay propagation.
"""

import logging
from datetime import date, timedelta
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from collections import defaultdict, deque

from backend.models.activity import ProjectActivity, ActivityStatus, ActivityChangeLog
from backend.models.project import Project

logger = logging.getLogger(__name__)

def get_project_activities_topo(db: Session, project_id: int) -> List[ProjectActivity]:
    """Get all activities of a project sorted in topological order of their dependencies."""
    activities = db.query(ProjectActivity).filter(ProjectActivity.project_id == project_id).all()
    
    act_map = {a.id: a for a in activities}
    adj = defaultdict(list)
    in_degree = defaultdict(int)
    
    for a in activities:
        in_degree.setdefault(a.id, 0)
        # dependency_list contains ProjectActivity.id elements
        for dep in a.dependency_list or []:
            adj[dep].append(a.id)
            in_degree[a.id] += 1
            
    # Kahn's algorithm
    queue = deque(sorted([aid for aid in act_map if in_degree[aid] == 0]))
    result = []
    while queue:
        node = queue.popleft()
        result.append(act_map[node])
        for neighbor in sorted(adj[node]):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
                
    return result

def propagate_delays(db: Session, project_id: int) -> None:
    """
    Recalculate planned dates for all future activities in topological order.
    For any activity that has not started, its new planned start is the max of
    actual/planned end dates of all predecessor activities.
    """
    topo_activities = get_project_activities_topo(db, project_id)
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return

    # Map of activity_id to its final expected end date (actual end date if completed, otherwise planned/expected end date)
    end_dates: Dict[int, date] = {}
    
    for act in topo_activities:
        # Determine predecessor end dates
        deps = act.dependency_list or []
        predecessor_ends = []
        for dep_id in deps:
            if dep_id in end_dates:
                predecessor_ends.append(end_dates[dep_id])
                
        # Calculate new expected start date
        expected_start = project.start_date
        if predecessor_ends:
            expected_start = max(predecessor_ends)
            
        # Update dates based on activity status
        if act.current_status == ActivityStatus.COMPLETED:
            # If completed, its end date is its actual end date
            end_dates[act.id] = act.actual_end_date or act.planned_end_date or expected_start
        elif act.current_status == ActivityStatus.IN_PROGRESS:
            # If in progress, its start is actual start, end is actual start + duration
            actual_start = act.actual_start_date or expected_start
            duration = (act.planned_end_date - act.planned_start_date).days if (act.planned_end_date and act.planned_start_date) else 30
            expected_end = actual_start + timedelta(days=duration)
            
            # Record current delay days
            if act.planned_end_date:
                delay = (expected_end - act.planned_end_date).days
                act.current_delay_days = max(0, delay)
            end_dates[act.id] = expected_end
        else:
            # Not started, delayed, or blocked
            duration = (act.planned_end_date - act.planned_start_date).days if (act.planned_end_date and act.planned_start_date) else 30
            
            # Shift planned start/end
            old_planned_start = act.planned_start_date
            act.planned_start_date = expected_start
            act.planned_end_date = expected_start + timedelta(days=duration)
            
            # If shift happened, record delay
            if old_planned_start:
                delay = (act.planned_start_date - old_planned_start).days
                act.current_delay_days = max(0, delay)
                
            end_dates[act.id] = act.planned_end_date

    # Update overall project expected end date
    if end_dates:
        project.expected_end_date = max(end_dates.values())
        
    db.commit()
    logger.info(f"Propagated delays for project {project_id}. New expected end: {project.expected_end_date}")

def update_activity(db: Session, activity_id: int, updates: Dict[str, Any], user_id: Optional[int] = None) -> Optional[ProjectActivity]:
    """Update a project activity's state, log changes, and trigger delay propagation."""
    activity = db.query(ProjectActivity).filter(ProjectActivity.id == activity_id).first()
    if not activity:
        return None

    # Track fields changed for audit logs
    change_reason = updates.pop("change_reason", None)
    
    # Validation checks
    new_status = updates.get("current_status")
    if new_status:
        status_enum = ActivityStatus(new_status)
        
        # Rule: Cannot start an activity if predecessors are not completed
        if status_enum in [ActivityStatus.IN_PROGRESS, ActivityStatus.COMPLETED]:
            for dep_id in activity.dependency_list or []:
                dep = db.query(ProjectActivity).filter(ProjectActivity.id == dep_id).first()
                if dep and dep.current_status != ActivityStatus.COMPLETED:
                    raise ValueError(f"Cannot start activity '{activity.name}'. Predecessor '{dep.name}' is not completed.")
        
        # Rule: Auto-assign actual start date when starting
        if status_enum == ActivityStatus.IN_PROGRESS and not activity.actual_start_date:
            updates["actual_start_date"] = date.today()
            updates["completion_percentage"] = max(5.0, activity.completion_percentage)
            
        # Rule: Auto-assign actual end date & set 100% completion when completing
        if status_enum == ActivityStatus.COMPLETED:
            if not activity.actual_start_date:
                updates["actual_start_date"] = activity.planned_start_date or date.today()
            updates["actual_end_date"] = date.today()
            updates["completion_percentage"] = 100.0
            
    # Apply updates & write changelog
    for key, value in updates.items():
        if value is not None and hasattr(activity, key):
            old_val = getattr(activity, key)
            if old_val != value:
                # Log change
                log = ActivityChangeLog(
                    activity_id=activity.id,
                    field_changed=key,
                    old_value=str(old_val) if old_val is not None else "",
                    new_value=str(value) if value is not None else "",
                    changed_by=user_id,
                    change_reason=change_reason
                )
                db.add(log)
                setattr(activity, key, value)

    db.commit()
    db.refresh(activity)
    
    # Propagate delays through critical path / dependency graph
    propagate_delays(db, activity.project_id)
    
    db.refresh(activity)
    return activity

def get_activity_history(db: Session, activity_id: int) -> List[ActivityChangeLog]:
    """Retrieve audit trail for a specific activity."""
    return db.query(ActivityChangeLog).filter(ActivityChangeLog.activity_id == activity_id).order_by(ActivityChangeLog.changed_at.desc()).all()
