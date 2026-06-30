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
