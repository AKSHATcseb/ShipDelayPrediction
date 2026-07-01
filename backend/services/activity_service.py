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
            
            # Calculate actual delay if completed
            actual_start = act.actual_start_date or act.planned_start_date or expected_start
            actual_end = act.actual_end_date or expected_start
            actual_dur = (actual_end - actual_start).days
            target_dur_days = int((act.duration_months or 1.0) * 30)
            act.current_delay_days = max(0, actual_dur - target_dur_days)
            
        elif act.current_status in [ActivityStatus.IN_PROGRESS, ActivityStatus.DELAYED, ActivityStatus.BLOCKED]:
            # If started, its expected end is today + remaining_months * 30
            actual_start = act.actual_start_date or expected_start
            rem_months = act.remaining_months if act.remaining_months is not None else 1.0
            expected_end = date.today() + timedelta(days=int(rem_months * 30))
            
            # Record current delay days
            elapsed_days = (date.today() - actual_start).days
            expected_dur_days = elapsed_days + int(rem_months * 30)
            target_dur_days = int((act.duration_months or 1.0) * 30)
            act.current_delay_days = max(0, expected_dur_days - target_dur_days)
            
            # Also update planned_end_date to expected_end so Gantt/views show it
            act.planned_end_date = expected_end
            end_dates[act.id] = expected_end
        else:
            # Not started
            dur_months = act.duration_months if act.duration_months is not None else 1.0
            dur_days = int(dur_months * 30)
            
            # Shift planned start/end
            old_planned_start = act.planned_start_date
            act.planned_start_date = expected_start
            act.planned_end_date = expected_start + timedelta(days=dur_days)
            act.remaining_months = dur_months
            
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
    
    # Resolve status, duration, and remaining months for logic checks
    new_status_str = updates.get("current_status")
    new_status = ActivityStatus(new_status_str) if new_status_str else activity.current_status
    
    new_duration = updates.get("duration_months")
    if new_duration is None:
        new_duration = activity.duration_months or 1.0
        
    new_remaining = updates.get("remaining_months")
    if new_remaining is None:
        new_remaining = activity.remaining_months or 1.0

    # Rule: If status is COMPLETED, remaining time must be 0
    if new_status == ActivityStatus.COMPLETED:
        updates["remaining_months"] = 0.0
        new_remaining = 0.0
        updates["completion_percentage"] = 100.0
        
    # Rule 4: If remaining time exceeds duration, status becomes DELAYED
    if new_remaining > new_duration and new_status != ActivityStatus.COMPLETED:
        updates["current_status"] = ActivityStatus.DELAYED.value
        new_status = ActivityStatus.DELAYED

    # Validation checks for predecessor completion
    if new_status in [ActivityStatus.IN_PROGRESS, ActivityStatus.COMPLETED]:
        for dep_id in activity.dependency_list or []:
            dep = db.query(ProjectActivity).filter(ProjectActivity.id == dep_id).first()
            if dep and dep.current_status != ActivityStatus.COMPLETED:
                raise ValueError(f"Cannot start activity '{activity.name}'. Predecessor '{dep.name}' is not completed.")
                
    # Rule: Auto-assign actual start date when starting
    if new_status in [ActivityStatus.IN_PROGRESS, ActivityStatus.DELAYED] and not updates.get("actual_start_date") and not activity.actual_start_date:
        updates["actual_start_date"] = date.today()
        if "completion_percentage" not in updates:
            updates["completion_percentage"] = max(5.0, activity.completion_percentage)
            
    # Rule: Auto-assign actual end date & set 100% completion when completing
    if new_status == ActivityStatus.COMPLETED:
        if not updates.get("actual_start_date") and not activity.actual_start_date:
            updates["actual_start_date"] = activity.planned_start_date or date.today()
        if not updates.get("actual_end_date") and not activity.actual_end_date:
            updates["actual_end_date"] = date.today()

    # Resolve new actual start and end dates for validation
    start_date_to_check = updates["actual_start_date"] if "actual_start_date" in updates else activity.actual_start_date
    end_date_to_check = updates["actual_end_date"] if "actual_end_date" in updates else activity.actual_end_date

    # Validate actual end date is not before actual start date
    if start_date_to_check and end_date_to_check:
        if end_date_to_check < start_date_to_check:
            raise ValueError("Actual end date cannot be earlier than actual start date.")
            
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
