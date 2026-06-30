"""
Pydantic schemas for request/response validation across all API endpoints.
"""

from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from datetime import date, datetime


# ──────────────────────────────────────────────
# AUTH SCHEMAS
# ──────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=255)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str
    is_first_login: bool

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=255)
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "Viewer"


# ──────────────────────────────────────────────
# TEMPLATE SCHEMAS
# ──────────────────────────────────────────────

class ActivityTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: str = "Other"
    sequence_number: int = Field(..., ge=1)
    parallel_group: Optional[int] = None
    dependency_list: List[int] = Field(default_factory=list)
    default_duration_months: int = Field(1, ge=0)
    historical_risk_weight: float = Field(50.0, ge=0.0, le=100.0)
    responsible_department: Optional[str] = None
    is_milestone: bool = False
    is_critical_path: bool = False


class ActivityTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    sequence_number: Optional[int] = None
    parallel_group: Optional[int] = None
    dependency_list: Optional[List[int]] = None
    default_duration_months: Optional[int] = None
    historical_risk_weight: Optional[float] = None
    responsible_department: Optional[str] = None
    is_milestone: Optional[bool] = None
    is_critical_path: Optional[bool] = None


class ActivityTemplateResponse(BaseModel):
    id: int
    template_id: int
    name: str
    description: Optional[str] = None
    category: str
    sequence_number: int
    parallel_group: Optional[int] = None
    dependency_list: List[int] = []
    default_duration_months: int
    historical_risk_weight: float
    responsible_department: Optional[str] = None
    is_milestone: bool
    is_critical_path: bool

    class Config:
        from_attributes = True


class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    activities: List[ActivityTemplateCreate] = Field(default_factory=list)
    feedback_loops: Optional[List[dict]] = Field(default_factory=list)


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class TemplateResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_archived: bool
    activity_count: int = 0
    created_at: datetime
    updated_at: datetime
    feedback_loops: Optional[List[dict]] = []

    class Config:
        from_attributes = True


class TemplateDetailResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    activities: List[ActivityTemplateResponse] = []
    feedback_loops: Optional[List[dict]] = []

    @model_validator(mode="before")
    @classmethod
    def map_activity_templates(cls, data):
        if hasattr(data, "activity_templates") and not hasattr(data, "activities"):
            data.activities = data.activity_templates
        elif isinstance(data, dict) and "activity_templates" in data and "activities" not in data:
            data["activities"] = data["activity_templates"]
        return data

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# PROJECT SCHEMAS
# ──────────────────────────────────────────────

class ProjectCreate(BaseModel):
    project_name: str = Field(..., min_length=1, max_length=255)
    project_id_code: str = Field(..., min_length=1, max_length=50)
    ship_name: Optional[str] = None
    ship_class: Optional[str] = None
    ship_type: Optional[str] = None
    project_cost: Optional[float] = None
    customer: Optional[str] = None
    template_id: int
    start_date: date
    expected_end_date: Optional[date] = None
    priority: str = "Medium"


class ProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    ship_name: Optional[str] = None
    ship_class: Optional[str] = None
    ship_type: Optional[str] = None
    project_cost: Optional[float] = None
    customer: Optional[str] = None
    expected_end_date: Optional[date] = None
    priority: Optional[str] = None
    current_status: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    project_name: str
    project_id_code: str
    ship_name: Optional[str] = None
    ship_class: Optional[str] = None
    ship_type: Optional[str] = None
    project_cost: Optional[float] = None
    customer: Optional[str] = None
    template_id: Optional[int] = None
    template_name: Optional[str] = None
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    priority: str
    current_status: str
    overall_progress: float = 0.0
    total_activities: int = 0
    completed_activities: int = 0
    delayed_activities: int = 0
    created_at: datetime
    updated_at: datetime
    feedback_loops: Optional[List[dict]] = []

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# ACTIVITY SCHEMAS
# ──────────────────────────────────────────────

class ActivityUpdate(BaseModel):
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    current_status: Optional[str] = None
    completion_percentage: Optional[float] = Field(None, ge=0.0, le=100.0)
    assigned_department: Optional[str] = None
    assigned_officer: Optional[str] = None
    remarks: Optional[str] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    change_reason: Optional[str] = None


class ActivityResponse(BaseModel):
    id: int
    project_id: int
    activity_template_id: Optional[int] = None
    name: str
    category: str
    sequence_number: int
    parallel_group: Optional[int] = None
    dependency_list: List[int] = []
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    actual_start_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    current_status: str
    completion_percentage: float
    assigned_department: Optional[str] = None
    assigned_officer: Optional[str] = None
    remarks: Optional[str] = None
    current_delay_days: int
    historical_risk_weight: float
    predicted_risk: Optional[str] = None
    is_milestone: bool
    is_critical_path: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChangeLogResponse(BaseModel):
    id: int
    activity_id: int
    field_changed: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_by: Optional[int] = None
    change_reason: Optional[str] = None
    changed_at: datetime

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# PREDICTION SCHEMAS
# ──────────────────────────────────────────────

class PredictionResponse(BaseModel):
    delay_percentage: float
    delay_months: float
    risk_category: str
    confidence: float
    expected_completion_date: Optional[date] = None
    top_drivers: List[dict] = []
    recommendations: List[dict] = []
    project_progress_pct: float = 0.0


class PredictionLogResponse(BaseModel):
    id: int
    project_id: int
    predicted_at: datetime
    project_progress_pct: Optional[float] = None
    delay_percentage: Optional[float] = None
    delay_months: Optional[float] = None
    risk_category: Optional[str] = None
    confidence: Optional[float] = None

    class Config:
        from_attributes = True


# ──────────────────────────────────────────────
# DASHBOARD SCHEMAS
# ──────────────────────────────────────────────

class DashboardSummary(BaseModel):
    total_projects: int = 0
    active_projects: int = 0
    completed_projects: int = 0
    delayed_projects: int = 0
    on_hold_projects: int = 0
    avg_delay_percentage: float = 0.0
    risk_distribution: dict = {}
    recent_activities: List[dict] = []
    upcoming_milestones: List[dict] = []
    project_health: List[dict] = []


class GanttData(BaseModel):
    activities: List[dict] = []
    dependencies: List[dict] = []
    milestones: List[dict] = []


# Resolve forward reference
TokenResponse.model_rebuild()
