"""
Predictor.
Loads trained pipeline models and runs real-time inference on active project instances.
"""

import logging
import joblib
import pandas as pd
import numpy as np
from datetime import date, timedelta
from typing import Dict, Any, Optional

from ml.config import MODEL_PATHS
from ml.feature_extractor import FeatureExtractor
from ml.constants import RISK_THRESHOLDS

logger = logging.getLogger(__name__)

class Predictor:
    _instance = None

    def __new__(cls, *args, **kwargs):
        """Singleton pattern for loading models only once."""
        if not cls._instance:
            cls._instance = super(Predictor, cls).__new__(cls, *args, **kwargs)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        # Load pipelines
        try:
            self.preprocessor = joblib.load(MODEL_PATHS["preprocessor"])
            self.reg_pct = joblib.load(MODEL_PATHS["best_reg_pct"])
            self.reg_months = joblib.load(MODEL_PATHS["best_reg_months"])
            self.cls = joblib.load(MODEL_PATHS["best_cls"])
            self.models_loaded = True
            logger.info("Successfully loaded ML prediction models.")
        except FileNotFoundError:
            self.models_loaded = False
            logger.warning("ML models not found on disk. Run training first.")
            
        self._initialized = True

    def predict(self, project_state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Runs inference on current project execution status.
        Args:
           project_state: dict containing start_date, ship_type, project_cost, planned_duration_months,
                          technical_complexity, technology_maturity, foreign_dependency, vendor_rating,
                          and a list of 'activities' dicts with current_status, completion_percentage, actual dates.
        """
        if not self.models_loaded:
            # Fallback to a rule-based mock predictor if models aren't ready
            return self._rule_based_fallback(project_state)

        # 1. Compute features
        features = FeatureExtractor.extract_features(project_state)
        df_row = pd.DataFrame([features])

        # 2. Preprocess features
        X_scaled = self.preprocessor.transform(df_row)

        # 3. Model Predictions
        pred_pct = float(self.reg_pct.predict(X_scaled)[0])
        pred_months = float(self.reg_months.predict(X_scaled)[0])
        pred_risk_idx = int(self.cls.predict(X_scaled)[0])
        
        # Confidence estimation based on class probabilities
        if hasattr(self.cls, "predict_proba"):
            probs = self.cls.predict_proba(X_scaled)[0]
            confidence = float(np.max(probs) * 100.0)
        else:
            confidence = 85.0

        risk_categories = ["Low", "Medium", "High", "Critical"]
        predicted_risk = risk_categories[pred_risk_idx]

        # Clamp metrics
        pred_pct = max(0.0, pred_pct)
        pred_months = max(0.0, pred_months)

        # Calculate expected completion date
        start_date = project_state["start_date"]
        planned_dur_months = project_state["planned_duration_months"]
        expected_days = int(round((planned_dur_months * 30.0) + (pred_months * 30.0)))
        expected_completion = start_date + timedelta(days=expected_days)

        return {
            "delay_percentage": round(pred_pct, 1),
            "delay_months": round(pred_months, 1),
            "risk_category": predicted_risk,
            "confidence": round(confidence, 1),
            "expected_completion_date": expected_completion,
            "project_progress_pct": features["project_progress_pct"]
        }

    def _rule_based_fallback(self, project_state: Dict[str, Any]) -> Dict[str, Any]:
        """Simple rule-based fallback predictor when no model files are present."""
        features = FeatureExtractor.extract_features(project_state)
        
        # Base delays from current activity status
        delayed_count = features["activities_delayed"]
        blocked_count = features["activities_blocked"]
        critical_delayed = features["critical_activities_delayed"]
        total_delay_till_date = features["total_delay_till_date"]

        # Predict delays
        base_delay_days = total_delay_till_date + (delayed_count * 15) + (blocked_count * 30) + (critical_delayed * 45)
        
        # Adjust based on complexity & foreign dependency
        mult = 1.0
        if project_state.get("foreign_dependency", False):
            mult += 0.2
        mult += (project_state.get("technical_complexity", 5.0) - 5.0) * 0.08
        
        predicted_delay_days = base_delay_days * mult
        predicted_months = round(predicted_delay_days / 30.0, 1)
        
        planned_days = project_state["planned_duration_months"] * 30
        predicted_pct = round((predicted_delay_days / planned_days) * 100.0, 1)

        # Categorize
        if predicted_pct <= RISK_THRESHOLDS["Low"]:
            risk = "Low"
        elif predicted_pct <= RISK_THRESHOLDS["Medium"]:
            risk = "Medium"
        elif predicted_pct <= RISK_THRESHOLDS["High"]:
            risk = "High"
        else:
            risk = "Critical"

        expected_completion = project_state["start_date"] + timedelta(days=int(planned_days + predicted_delay_days))

        return {
            "delay_percentage": predicted_pct,
            "delay_months": predicted_months,
            "risk_category": risk,
            "confidence": 75.0,
            "expected_completion_date": expected_completion,
            "project_progress_pct": features["project_progress_pct"]
        }
