"""
Project Service.
Handles project instantiation, date scheduling, statistics, and CRUD operations.
"""

import logging
from datetime import date, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from backend.models.project import Project, ProjectStatus, ProjectPriority
from backend.models.activity import ProjectActivity, ActivityStatus
from backend.models.template import ProjectTemplate, ActivityTemplate
from backend.services.template_service import topological_order

logger = logging.getLogger(__name__)

def compute_project_dates(start_date: date, activities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Given a project start date and a list of activity definitions with dependency lists,
    calculate planned_start_date and planned_end_date for each activity.
    activities list must be in topological order.
    """
    # Map from sequence_number (or activity template id) to computed end date
    end_dates: Dict[int, date] = {}
    
    # We will build activities with planned dates
    scheduled_activities = []
    
    for act in activities:
        deps = act.get("dependency_list", [])
        
        # Start date is project start date, or the latest end date among all predecessor activities
        act_start = start_date
        if deps:
            predecessor_ends = [end_dates[dep] for dep in deps if dep in end_dates]
            if predecessor_ends:
                act_start = max(predecessor_ends)
                
        duration = act.get("default_duration_months", 1)
        act_end = act_start + timedelta(days=duration * 30)
        
        # Store for future dependent lookups
        seq = act.get("sequence_number")
        end_dates[seq] = act_end
        
        scheduled_activities.append({
            "name": act["name"],
            "category": act.get("category", "Other"),
            "sequence_number": seq,
            "parallel_group": act.get("parallel_group"),
            "dependency_list_seq": deps,  # Temp store sequence dependencies
            "planned_start_date": act_start,
            "planned_end_date": act_end,
            "default_duration_months": duration,
            "historical_risk_weight": act.get("historical_risk_weight", 50.0),
            "responsible_department": act.get("responsible_department"),
            "is_milestone": act.get("is_milestone", False),
            "is_critical_path": act.get("is_critical_path", False),
            "activity_template_id": act.get("id") # Keep original template reference
        })
        
    return scheduled_activities

def create_project(db: Session, project_data: Dict[str, Any], manager_id: Optional[int] = None) -> Project:
    """Create a new project from a template and generate all scheduled activities."""
    template_id = project_data["template_id"]
    template = db.query(ProjectTemplate).filter(ProjectTemplate.id == template_id).first()
    if not template:
        raise ValueError("Project template not found")
        
    # Get all activities of this template in topological order
    acts_dict = []
    for act in template.activity_templates:
        acts_dict.append({
            "id": act.id,
            "name": act.name,
            "category": act.category,
            "sequence_number": act.sequence_number,
            "parallel_group": act.parallel_group,
            "dependency_list": list(act.dependency_list) if act.dependency_list else [],
            "default_duration_months": act.default_duration_months,
            "historical_risk_weight": act.historical_risk_weight,
            "responsible_department": act.responsible_department,
            "is_milestone": act.is_milestone,
            "is_critical_path": act.is_critical_path
        })
        
    topo_acts = topological_order(acts_dict)
    
    # Schedule planned dates starting at project start_date
    start_date = project_data["start_date"]
    scheduled = compute_project_dates(start_date, topo_acts)
    
    # Calculate overall project expected end date
    expected_end = start_date
    if scheduled:
        expected_end = max(act["planned_end_date"] for act in scheduled)
        
    project = Project(
        project_name=project_data["project_name"],
        project_id_code=project_data["project_id_code"],
        ship_name=project_data.get("ship_name"),
        ship_class=project_data.get("ship_class"),
        ship_type=project_data.get("ship_type"),
        project_cost=project_data.get("project_cost"),
        customer=project_data.get("customer"),
        project_manager_id=manager_id,
        template_id=template_id,
        start_date=start_date,
        expected_end_date=expected_end,
        priority=ProjectPriority(project_data.get("priority", "Medium")),
        current_status=ProjectStatus.ACTIVE,  # Set active immediately upon creation
        feedback_loops=template.feedback_loops or []
    )
    db.add(project)
    db.flush() # Get project.id
    
    # Instantiate project activities
    # Map from sequence_number to live ProjectActivity.id
    seq_to_live_id = {}
    
    # Add activities
    live_activities = []
    for s_act in scheduled:
        activity = ProjectActivity(
            project_id=project.id,
            activity_template_id=s_act["activity_template_id"],
            name=s_act["name"],
            category=s_act["category"],
            sequence_number=s_act["sequence_number"],
            parallel_group=s_act["parallel_group"],
            planned_start_date=s_act["planned_start_date"],
            planned_end_date=s_act["planned_end_date"],
            current_status=ActivityStatus.NOT_STARTED,
            completion_percentage=0.0,
            assigned_department=s_act["responsible_department"],
            historical_risk_weight=s_act["historical_risk_weight"],
            is_milestone=s_act["is_milestone"],
            is_critical_path=s_act["is_critical_path"],
            dependency_list=[] # We'll populate this in a second pass using seq_to_live_id
        )
        db.add(activity)
        db.flush() # Get activity.id
        seq_to_live_id[s_act["sequence_number"]] = activity.id
        live_activities.append((activity, s_act["dependency_list_seq"]))
        
    # Second pass: Update dependencies mapping to live ProjectActivity.id
    for activity, dep_seqs in live_activities:
        live_deps = [seq_to_live_id[seq] for seq in dep_seqs if seq in seq_to_live_id]
        activity.dependency_list = live_deps
        
    db.commit()
    db.refresh(project)
    logger.info(f"Created project '{project.project_name}' from template '{template.name}'.")
    return project

def list_projects(db: Session, status: Optional[str] = None, priority: Optional[str] = None, ship_type: Optional[str] = None) -> List[Project]:
    """List all projects with optional filtering."""
    query = db.query(Project)
    if status:
        query = query.filter(Project.current_status == ProjectStatus(status))
    if priority:
        query = query.filter(Project.priority == ProjectPriority(priority))
    if ship_type:
        query = query.filter(Project.ship_type == ship_type)
    return query.order_by(Project.created_at.desc()).all()

def get_project(db: Session, project_id: int) -> Optional[Project]:
    """Get project by ID."""
    return db.query(Project).filter(Project.id == project_id).first()

def update_project(db: Session, project_id: int, updates: Dict[str, Any]) -> Optional[Project]:
    """Update project metadata."""
    project = get_project(db, project_id)
    if not project:
        return None
        
    for key, value in updates.items():
        if value is not None:
            if key == "priority":
                project.priority = ProjectPriority(value)
            elif key == "current_status":
                project.current_status = ProjectStatus(value)
            elif hasattr(project, key):
                setattr(project, key, value)
                
    db.commit()
    db.refresh(project)
    return project

def delete_project(db: Session, project_id: int) -> bool:
    """Soft delete project by setting status to Cancelled."""
    project = get_project(db, project_id)
    if not project:
        return False
    project.current_status = ProjectStatus.CANCELLED
    db.commit()
    logger.info(f"Project '{project.project_name}' marked as CANCELLED.")
    return True

def get_project_stats(project: Project) -> Dict[str, Any]:
    """Compute aggregate progress and count statistics for a project."""
    activities = project.activities
    total = len(activities)
    if total == 0:
        return {
            "overall_progress": 0.0,
            "total_activities": 0,
            "completed_activities": 0,
            "delayed_activities": 0,
            "in_progress_activities": 0,
            "not_started_activities": 0
        }
        
    completed = 0
    delayed = 0
    in_progress = 0
    not_started = 0
    total_progress = 0.0
    
    for act in activities:
        total_progress += act.completion_percentage
        if act.current_status == ActivityStatus.COMPLETED:
            completed += 1
        elif act.current_status == ActivityStatus.DELAYED:
            delayed += 1
        elif act.current_status == ActivityStatus.IN_PROGRESS:
            in_progress += 1
        elif act.current_status == ActivityStatus.NOT_STARTED:
            not_started += 1
            
    return {
        "overall_progress": round(total_progress / total, 1),
        "total_activities": total,
        "completed_activities": completed,
        "delayed_activities": delayed,
        "in_progress_activities": in_progress,
        "not_started_activities": not_started
    }
