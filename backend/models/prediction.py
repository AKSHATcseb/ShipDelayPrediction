"""
PredictionLog ORM model.
Records ML predictions over time for trend tracking and auditing.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from backend.database import Base


class PredictionLog(Base):
    """Records an ML prediction made for a project at a point in time."""
    __tablename__ = "prediction_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    predicted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    project_progress_pct = Column(Float, nullable=True)
    delay_percentage = Column(Float, nullable=True)
    delay_months = Column(Float, nullable=True)
    risk_category = Column(String(50), nullable=True)
    confidence = Column(Float, nullable=True)
    top_drivers = Column(JSON, nullable=True)
    recommendations = Column(JSON, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="predictions")

    def __repr__(self):
        return (f"<PredictionLog(project_id={self.project_id}, "
                f"risk='{self.risk_category}', delay={self.delay_percentage}%)>")
