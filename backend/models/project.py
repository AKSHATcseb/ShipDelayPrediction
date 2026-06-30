"""
Project ORM model.
Represents a ship acquisition project created from a template.
"""

from datetime import datetime, timezone
from sqlalchemy import (Column, Integer, String, Float, DateTime, Date,
                        ForeignKey, Text, Enum as SAEnum, JSON)
from sqlalchemy.orm import relationship
from backend.database import Base
import enum


class ProjectStatus(str, enum.Enum):
    """Project lifecycle status."""
    PLANNING = "Planning"
    ACTIVE = "Active"
    ON_HOLD = "OnHold"
    COMPLETED = "Completed"
    CANCELLED = "Cancelled"


class ProjectPriority(str, enum.Enum):
    """Project priority level."""
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class Project(Base):
    """A ship acquisition project instance created from a template."""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_name = Column(String(255), nullable=False, index=True)
    project_id_code = Column(String(50), unique=True, nullable=False, index=True)
    ship_name = Column(String(255), nullable=True)
    ship_class = Column(String(100), nullable=True)
    ship_type = Column(String(100), nullable=True)
    project_cost = Column(Float, nullable=True)  # in Crores INR
    customer = Column(String(255), nullable=True)
    project_manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    template_id = Column(Integer, ForeignKey("project_templates.id"), nullable=True)
    start_date = Column(Date, nullable=True)
    expected_end_date = Column(Date, nullable=True)
    priority = Column(SAEnum(ProjectPriority), default=ProjectPriority.MEDIUM, nullable=False)
    current_status = Column(SAEnum(ProjectStatus), default=ProjectStatus.PLANNING, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                        onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    feedback_loops = Column(JSON, default=list, nullable=True)

    # Relationships
    template = relationship("ProjectTemplate", back_populates="projects")
    activities = relationship(
        "ProjectActivity",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="ProjectActivity.sequence_number"
    )
    predictions = relationship(
        "PredictionLog",
        back_populates="project",
        cascade="all, delete-orphan",
        order_by="PredictionLog.predicted_at.desc()"
    )

    def __repr__(self):
        return f"<Project(id={self.id}, name='{self.project_name}', code='{self.project_id_code}')>"
