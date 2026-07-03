"""
Activity API endpoints.
Provides endpoints for executing and updating project activity instances.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.schemas.schemas import ActivityResponse, ActivityUpdate, ChangeLogResponse
from backend.services.activity_service import update_activity, get_activity_history, get_project_activities_topo
from backend.api.auth import get_current_user, require_pm, require_pm_or_viewer

router = APIRouter(prefix="/api/projects", tags=["Activities"])

@router.get("/{pid}/activities", response_model=List[ActivityResponse])
def get_activities(pid: int, db: Session = Depends(get_db), current_user = Depends(require_pm_or_viewer)):
    """List all activities of a project sorted in topological sequence."""
    activities = get_project_activities_topo(db, pid)
    return activities

@router.put("/{pid}/activities/{aid}", response_model=ActivityResponse)
def put_activity(
    pid: int,
    aid: int,
    request: ActivityUpdate,
    db: Session = Depends(get_db),
    current_user = Depends(require_pm)
):
    """Update execution details (actual dates, status, % complete) of a project activity."""
    try:
        activity = update_activity(
            db,
            aid,
            request.model_dump(exclude_unset=True),
            user_id=current_user.id
        )
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        return activity
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{pid}/activities/{aid}/history", response_model=List[ChangeLogResponse])
def get_history(pid: int, aid: int, db: Session = Depends(get_db), current_user = Depends(require_pm_or_viewer)):
    """Retrieve the full edit history and change log for a project activity."""
    history = get_activity_history(db, aid)
    return history
