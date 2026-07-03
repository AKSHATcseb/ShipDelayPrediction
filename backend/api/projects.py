"""
Project API endpoints.
Provides endpoints for project instantiation and retrieval.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from backend.database import get_db
from backend.schemas.schemas import ProjectResponse, ProjectCreate, ProjectUpdate
from backend.services.project_service import (
    create_project, list_projects, get_project, update_project, delete_project, get_project_stats
)
from backend.api.auth import get_current_user, require_admin, require_pm, require_pm_or_viewer

router = APIRouter(prefix="/api/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse])
def get_projects(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    ship_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user = Depends(require_pm_or_viewer)
):
    """List all projects with optional filtering."""
    projects = list_projects(db, status=status, priority=priority, ship_type=ship_type)
    res = []
    for p in projects:
        stats = get_project_stats(p)
        res.append(ProjectResponse(
            id=p.id,
            project_name=p.project_name,
            project_id_code=p.project_id_code,
            ship_name=p.ship_name,
            ship_class=p.ship_class,
            ship_type=p.ship_type,
            project_cost=p.project_cost,
            customer=p.customer,
            template_id=p.template_id,
            template_name=p.template.name if p.template else None,
            start_date=p.start_date,
            expected_end_date=p.expected_end_date,
            priority=p.priority.value,
            current_status=p.current_status.value,
            overall_progress=stats["overall_progress"],
            total_activities=stats["total_activities"],
            completed_activities=stats["completed_activities"],
            delayed_activities=stats["delayed_activities"],
            created_at=p.created_at,
            updated_at=p.updated_at,
            feedback_loops=p.feedback_loops or []
        ))
    return res

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def post_project(request: ProjectCreate, db: Session = Depends(get_db), current_user = Depends(require_pm)):
    """Create a new project from a template. Auto-generates and schedules activities."""
    try:
        project = create_project(db, request.model_dump(), manager_id=current_user.id)
        stats = get_project_stats(project)
        return ProjectResponse(
            id=project.id,
            project_name=project.project_name,
            project_id_code=project.project_id_code,
            ship_name=project.ship_name,
            ship_class=project.ship_class,
            ship_type=project.ship_type,
            project_cost=project.project_cost,
            customer=project.customer,
            template_id=project.template_id,
            template_name=project.template.name if project.template else None,
            start_date=project.start_date,
            expected_end_date=project.expected_end_date,
            priority=project.priority.value,
            current_status=project.current_status.value,
            overall_progress=stats["overall_progress"],
            total_activities=stats["total_activities"],
            completed_activities=stats["completed_activities"],
            delayed_activities=stats["delayed_activities"],
            created_at=project.created_at,
            updated_at=project.updated_at,
            feedback_loops=project.feedback_loops or []
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{id}", response_model=ProjectResponse)
def get_project_by_id(id: int, db: Session = Depends(get_db), current_user = Depends(require_pm_or_viewer)):
    """Get project info by ID."""
    project = get_project(db, id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    stats = get_project_stats(project)
    return ProjectResponse(
        id=project.id,
        project_name=project.project_name,
        project_id_code=project.project_id_code,
        ship_name=project.ship_name,
        ship_class=project.ship_class,
        ship_type=project.ship_type,
        project_cost=project.project_cost,
        customer=project.customer,
        template_id=project.template_id,
        template_name=project.template.name if project.template else None,
        start_date=project.start_date,
        expected_end_date=project.expected_end_date,
        priority=project.priority.value,
        current_status=project.current_status.value,
        overall_progress=stats["overall_progress"],
        total_activities=stats["total_activities"],
        completed_activities=stats["completed_activities"],
        delayed_activities=stats["delayed_activities"],
        created_at=project.created_at,
        updated_at=project.updated_at,
        feedback_loops=project.feedback_loops or []
    )

@router.put("/{id}", response_model=ProjectResponse)
def put_project(id: int, request: ProjectUpdate, db: Session = Depends(get_db), current_user = Depends(require_pm)):
    """Update project metadata."""
    project = update_project(db, id, request.model_dump(exclude_unset=True))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    stats = get_project_stats(project)
    return ProjectResponse(
        id=project.id,
        project_name=project.project_name,
        project_id_code=project.project_id_code,
        ship_name=project.ship_name,
        ship_class=project.ship_class,
        ship_type=project.ship_type,
        project_cost=project.project_cost,
        customer=project.customer,
        template_id=project.template_id,
        template_name=project.template.name if project.template else None,
        start_date=project.start_date,
        expected_end_date=project.expected_end_date,
        priority=project.priority.value,
        current_status=project.current_status.value,
        overall_progress=stats["overall_progress"],
        total_activities=stats["total_activities"],
        completed_activities=stats["completed_activities"],
        delayed_activities=stats["delayed_activities"],
        created_at=project.created_at,
        updated_at=project.updated_at,
        feedback_loops=project.feedback_loops or []
    )

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def cancel_project(id: int, db: Session = Depends(get_db), current_user = Depends(require_pm)):
    """Mark a project as CANCELLED (Admin only)."""
    success = delete_project(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"message": "Project cancelled successfully"}
