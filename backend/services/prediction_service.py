"""
Prediction Service.
Interfaces the FastAPI backend database with the ML predictor.
Constructs project state dicts and logs prediction metrics.
"""

import logging
from datetime import date
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.models.project import Project, ProjectStatus
from backend.models.activity import ProjectActivity, ActivityStatus
from backend.models.prediction import PredictionLog
from ml.predictor import Predictor
from ml.explainer import Explainer
from ml.recommendation import RecommendationEngine

logger = logging.getLogger(__name__)

def construct_project_state(project: Project) -> Dict[str, Any]:
    """Formats SQLAlchemy models into the dict format expected by FeatureExtractor."""
    activities = []
    
    # Map live ProjectActivity.id to index-level dependency references
    act_id_to_idx = {act.id: idx for idx, act in enumerate(project.activities)}

    for act in project.activities:
        # Convert dependency lists from database ID values to index references
        deps = [act_id_to_idx[dep_id] for dep_id in act.dependency_list or [] if dep_id in act_id_to_idx]
        
        activities.append({
            "name": act.name,
            "category": act.category,
            "sequence_number": act.sequence_number,
            "parallel_group": act.parallel_group,
            "planned_start_date": act.planned_start_date,
            "planned_end_date": act.planned_end_date,
            "dependency_list": deps,
            "historical_risk_weight": act.historical_risk_weight,
            "is_milestone": act.is_milestone,
            "is_critical_path": act.is_critical_path,
            "current_status": act.current_status.value,
            "completion_percentage": act.completion_percentage,
            "current_delay_days": act.current_delay_days,
            "actual_start_date": act.actual_start_date,
            "actual_end_date": act.actual_end_date,
            "remarks": act.remarks or ""
        })

    # Estimate vendor rating based on priority and cost bounds if not explicitly stored
    # Using cost scaling as proxy for size/supplier vendor rating
    vendor_rating = 4.2
    if project.project_cost and project.project_cost > 10000:
        vendor_rating = 3.6  # Large projects tend to have more OEM complexity

    return {
        "project_name": project.project_name,
        "project_id_code": project.project_id_code,
        "ship_type": project.ship_type or "Submarine",
        "project_cost": project.project_cost or 5000.0,
        "project_size": 3.0,
        "priority": project.priority.value,
        "start_date": project.start_date or date.today(),
        "planned_duration_months": int(round((project.expected_end_date - project.start_date).days / 30.0)) if (project.expected_end_date and project.start_date) else 60,
        "technical_complexity": 8.0,
        "technology_maturity": 6.5,
        "foreign_dependency": True,
        "vendor_rating": vendor_rating,
        "overall_progress_pct": 0.0, # Will be computed by FeatureExtractor
        "snapshot_date": date.today(),
        "feedback_loops": project.feedback_loops or [],
        "activities": activities
    }

def run_project_prediction(db: Session, project_id: int) -> Optional[Dict[str, Any]]:
    """Runs ML inference on a project's current state and saves results to PredictionLog."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        return None

    # Construct state dictionary
    state = construct_project_state(project)
    
    # Predict
    predictor = Predictor()
    prediction = predictor.predict(state)
    
    # Explain
    explainer = Explainer(predictor)
    explanation = explainer.explain(state, prediction)
    
    # Recommendations
    recs = RecommendationEngine.generate_recommendations(state, prediction)
    
    # Store in database PredictionLog
    log = PredictionLog(
        project_id=project.id,
        project_progress_pct=prediction["project_progress_pct"],
        delay_percentage=prediction["delay_percentage"],
        delay_months=prediction["delay_months"],
        risk_category=prediction["risk_category"],
        confidence=prediction["confidence"],
        top_drivers=explanation["Top_Risk_Drivers"],
        recommendations=recs
    )
    db.add(log)
    
    # Update activity-level predicted risk tier
    # Low/Med/High/Critical assigned to activities depending on status & delay
    for act in project.activities:
        if act.current_status == ActivityStatus.COMPLETED:
            act.predicted_risk = "Low"
        elif act.current_status in [ActivityStatus.DELAYED, ActivityStatus.BLOCKED]:
            act.predicted_risk = prediction["risk_category"]
        else:
            # If not started, inherit base template risk
            if act.historical_risk_weight > 70.0:
                act.predicted_risk = "High"
            elif act.historical_risk_weight > 40.0:
                act.predicted_risk = "Medium"
            else:
                act.predicted_risk = "Low"

    db.commit()
    logger.info(f"Generated predictions for project {project.project_id_code}. Risk: {prediction['risk_category']}.")
    
    return {
        "delay_percentage": prediction["delay_percentage"],
        "delay_months": prediction["delay_months"],
        "risk_category": prediction["risk_category"],
        "confidence": prediction["confidence"],
        "expected_completion_date": prediction["expected_completion_date"],
        "top_drivers": explanation["Top_Risk_Drivers"],
        "recommendations": recs,
        "project_progress_pct": prediction["project_progress_pct"]
    }

def get_prediction_history(db: Session, project_id: int) -> List[PredictionLog]:
    """Fetches historical predictions made for a project over time."""
    return db.query(PredictionLog).filter(PredictionLog.project_id == project_id).order_by(PredictionLog.predicted_at.desc()).all()
