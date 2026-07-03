"""
Template API endpoints.
Provides CRUD endpoints for project templates and activity templates.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.schemas.schemas import (
    TemplateResponse, TemplateDetailResponse, TemplateCreate, TemplateUpdate,
    ActivityTemplateCreate, ActivityTemplateResponse, ActivityTemplateUpdate
)
from backend.services.template_service import (
    create_template, get_template, list_templates, update_template,
    duplicate_template, archive_template, add_activity_to_template,
    update_activity_template, delete_activity_template, update_full_template
)
from backend.api.auth import get_current_user, require_admin, require_admin_or_pm

router = APIRouter(prefix="/api/templates", tags=["Project Templates"])

@router.get("", response_model=List[TemplateResponse])
def get_templates(include_archived: bool = False, db: Session = Depends(get_db), current_user = Depends(require_admin_or_pm)):
    """List all templates."""
    templates = list_templates(db, include_archived=include_archived)
    # Convert to response schema, adding activity counts
    res = []
    for t in templates:
        res.append(TemplateResponse(
            id=t.id,
            name=t.name,
            description=t.description,
            is_archived=t.is_archived,
            activity_count=len(t.activity_templates),
            created_at=t.created_at,
            updated_at=t.updated_at,
            feedback_loops=t.feedback_loops or []
        ))
    return res

@router.post("", response_model=TemplateDetailResponse, status_code=status.HTTP_201_CREATED)
def post_template(request: TemplateCreate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    """Create a new template with activities."""
    try:
        activities_data = [act.model_dump() for act in request.activities]
        template = create_template(db, request.name, request.description, activities_data, created_by=current_user.id, feedback_loops=request.feedback_loops)
        return template
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{id}", response_model=TemplateDetailResponse)
def get_template_by_id(id: int, db: Session = Depends(get_db), current_user = Depends(require_admin_or_pm)):
    """Get detailed template info including all activity steps."""
    template = get_template(db, id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@router.put("/{id}", response_model=TemplateResponse)
def put_template(id: int, request: TemplateUpdate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    """Update template metadata."""
    template = update_template(db, id, request.name, request.description)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return TemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        is_archived=template.is_archived,
        activity_count=len(template.activity_templates),
        created_at=template.created_at,
        updated_at=template.updated_at
    )

@router.put("/{id}/full", response_model=TemplateDetailResponse)
def put_full_template(id: int, request: TemplateCreate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    """Replace all activities, loops and details of an existing template."""
    try:
        activities_data = [act.model_dump() for act in request.activities]
        template = update_full_template(db, id, request.name, request.description, activities_data, feedback_loops=request.feedback_loops)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        return template
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{id}/duplicate", response_model=TemplateDetailResponse)
def post_duplicate_template(id: int, new_name: str, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    """Duplicate an existing template under a new name."""
    template = duplicate_template(db, id, new_name)
    if not template:
        raise HTTPException(status_code=404, detail="Source template not found")
    return template

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_template(id: int, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    """Soft delete (archive) a template (Admin only)."""
    success = archive_template(db, id)
    if not success:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template archived successfully"}

@router.post("/{id}/activities", response_model=ActivityTemplateResponse)
def post_activity(id: int, request: ActivityTemplateCreate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    """Add a new activity step to a template."""
    try:
        activity = add_activity_to_template(db, id, request.model_dump())
        if not activity:
            raise HTTPException(status_code=404, detail="Template not found")
        return activity
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{id}/activities/{act_id}", response_model=ActivityTemplateResponse)
def put_activity(id: int, act_id: int, request: ActivityTemplateUpdate, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    """Edit details of a specific activity template."""
    activity = update_activity_template(db, act_id, request.model_dump(exclude_unset=True))
    if not activity:
        raise HTTPException(status_code=404, detail="Activity template not found")
    return activity

@router.delete("/{id}/activities/{act_id}", status_code=status.HTTP_200_OK)
def remove_activity(id: int, act_id: int, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    """Remove a specific activity step from a template (Admin only)."""
    success = delete_activity_template(db, act_id)
    if not success:
        raise HTTPException(status_code=404, detail="Activity template not found")
    return {"message": "Activity step deleted successfully"}
