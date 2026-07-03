"""
Prediction API endpoints.
Provides endpoints for executing and retrieving ML predictions for projects.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.schemas.schemas import PredictionResponse, PredictionLogResponse
from backend.services.prediction_service import run_project_prediction, get_prediction_history
from backend.api.auth import get_current_user

router = APIRouter(prefix="/api/projects", tags=["Predictions"])

@router.post("/{id}/predict", response_model=PredictionResponse)
def post_prediction(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Triggers ML model inference on the current status of the project's activities."""
    res = run_project_prediction(db, id)
    if not res:
        raise HTTPException(status_code=404, detail="Project not found")
    return res

@router.get("/{id}/prediction-history", response_model=List[PredictionLogResponse])
def get_history(id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    """Fetches the history of ML risk/delay predictions made for a project over time."""
    history = get_prediction_history(db, id)
    return history


@router.post("/predict/json")
def predict_json(state: dict):
    """Runs ML inference on a serialized project state dict sent as JSON."""
    from ml.predictor import Predictor
    from ml.explainer import Explainer
    from ml.recommendation import RecommendationEngine
    from datetime import datetime
    
    # Preprocess date strings to date objects if they are strings
    def parse_dates(d):
        if isinstance(d, dict):
            for k, v in list(d.items()):
                if k in ["start_date", "planned_start_date", "planned_end_date", "actual_start_date", "actual_end_date", "snapshot_date"] and isinstance(v, str):
                    try:
                        d[k] = datetime.strptime(v.split('T')[0], "%Y-%m-%d").date()
                    except Exception:
                        pass
                else:
                    parse_dates(v)
        elif isinstance(d, list):
            for item in d:
                parse_dates(item)

    parse_dates(state)
    
    # Predict
    predictor = Predictor()
    prediction = predictor.predict(state)
    
    # Explain
    explainer = Explainer(predictor)
    explanation = explainer.explain(state, prediction)
    
    # Recommendations
    recs = RecommendationEngine.generate_recommendations(state, prediction)
    
    return {
        "delay_percentage": prediction["delay_percentage"],
        "delay_months": prediction["delay_months"],
        "risk_category": prediction["risk_category"],
        "confidence": prediction["confidence"],
        "expected_completion_date": prediction["expected_completion_date"],
        "project_progress_pct": prediction["project_progress_pct"],
        "top_drivers": explanation["Top_Risk_Drivers"],
        "recommendations": recs
    }
