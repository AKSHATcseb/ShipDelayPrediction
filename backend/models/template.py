"""
Project Template and Activity Template ORM models.
Templates define reusable ship acquisition workflows.
"""

from datetime import datetime, timezone
from sqlalchemy import (Column, Integer, String, Boolean, Float, DateTime,
                        ForeignKey, Text, JSON)
from sqlalchemy.orm import relationship
from backend.database import Base


class ProjectTemplate(Base):
    """A reusable project workflow template (e.g., Nomination, Competitive)."""
    __tablename__ = "project_templates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_archived = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    feedback_loops = Column(JSON, default=list, nullable=True)

    # Relationships
    activity_templates = relationship(
        "ActivityTemplate",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="ActivityTemplate.sequence_number"
    )
    projects = relationship("Project", back_populates="template")

    def __repr__(self):
        return f"<ProjectTemplate(id={self.id}, name='{self.name}')>"


class ActivityTemplate(Base):
    """A single activity/task definition within a project template."""
    __tablename__ = "activity_templates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    template_id = Column(Integer, ForeignKey("project_templates.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(50), nullable=False, default="Other")
    # Category values: Administrative, Technical, Procurement, Construction,
    #                   Inspection, Testing, Delivery, Documentation, Other
    sequence_number = Column(Integer, nullable=False)
    parallel_group = Column(Integer, nullable=True)
    # JSON list of activity_template IDs that this activity depends on
    dependency_list = Column(JSON, default=list, nullable=False)
    default_duration_months = Column(Integer, nullable=False, default=1)
    historical_risk_weight = Column(Float, default=50.0, nullable=False)  # 0-100
    responsible_department = Column(String(100), nullable=True)
    is_milestone = Column(Boolean, default=False, nullable=False)
    is_critical_path = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    template = relationship("ProjectTemplate", back_populates="activity_templates")

    def __repr__(self):
        return f"<ActivityTemplate(id={self.id}, name='{self.name}', seq={self.sequence_number})>"
