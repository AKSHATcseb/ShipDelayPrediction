"""
ProjectActivity and ActivityChangeLog ORM models.
ProjectActivity represents a live activity instance within a project.
ActivityChangeLog maintains a full audit trail of every change.
"""

from datetime import datetime, timezone
from sqlalchemy import (Column, Integer, String, Float, DateTime, Date,
                        ForeignKey, Text, Boolean, JSON, Enum as SAEnum)
from sqlalchemy.orm import relationship
from backend.database import Base
import enum


class ActivityStatus(str, enum.Enum):
    """Activity execution status."""
    NOT_STARTED = "NotStarted"
    IN_PROGRESS = "InProgress"
    COMPLETED = "Completed"
    DELAYED = "Delayed"
    BLOCKED = "Blocked"
    CANCELLED = "Cancelled"


class ProjectActivity(Base):
    """A live activity instance within a running project."""
    __tablename__ = "project_activities"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    activity_template_id = Column(Integer, ForeignKey("activity_templates.id"), nullable=True)
    name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, default="Other")
    sequence_number = Column(Integer, nullable=False)
    parallel_group = Column(Integer, nullable=True)
    dependency_list = Column(JSON, default=list, nullable=False)
    # dependency_list stores activity IDs (ProjectActivity.id) that this depends on

    # Planning dates
    planned_start_date = Column(Date, nullable=True)
    planned_end_date = Column(Date, nullable=True)

    # Actual execution dates
    actual_start_date = Column(Date, nullable=True)
    actual_end_date = Column(Date, nullable=True)

    # Status tracking
    current_status = Column(SAEnum(ActivityStatus), default=ActivityStatus.NOT_STARTED, nullable=False)
    completion_percentage = Column(Float, default=0.0, nullable=False)

    # Assignment
    assigned_department = Column(String(100), nullable=True)
    assigned_officer = Column(String(255), nullable=True)
    remarks = Column(Text, nullable=True)

    # Delay & Risk
    current_delay_days = Column(Integer, default=0, nullable=False)
    duration_months = Column(Float, default=1.0, nullable=False)
    remaining_months = Column(Float, default=1.0, nullable=False)
    historical_risk_weight = Column(Float, default=50.0, nullable=False)
    predicted_risk = Column(String(50), nullable=True)

    # Flags
    is_milestone = Column(Boolean, default=False, nullable=False)
    is_critical_path = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="activities")
    change_logs = relationship(
        "ActivityChangeLog",
        back_populates="activity",
        cascade="all, delete-orphan",
        order_by="ActivityChangeLog.changed_at.desc()"
    )

    def __repr__(self):
        return f"<ProjectActivity(id={self.id}, name='{self.name}', status='{self.current_status}')>"


class ActivityChangeLog(Base):
    """Audit trail for every field change on a project activity."""
    __tablename__ = "activity_change_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    activity_id = Column(Integer, ForeignKey("project_activities.id", ondelete="CASCADE"), nullable=False)
    field_changed = Column(String(100), nullable=False)
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    changed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    change_reason = Column(Text, nullable=True)
    changed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    activity = relationship("ProjectActivity", back_populates="change_logs")

    def __repr__(self):
        return f"<ActivityChangeLog(activity_id={self.activity_id}, field='{self.field_changed}')>"
