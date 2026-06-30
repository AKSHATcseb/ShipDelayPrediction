"""
Explainer.
Identifies primary risk drivers using feature deviation analysis and model weights.
"""

import numpy as np
from typing import Dict, Any, List
import pandas as pd
from ml.feature_extractor import FeatureExtractor
from ml.constants import ML_FEATURE_NAMES

class Explainer:
    def __init__(self, predictor=None):
        self.predictor = predictor

    def explain(self, project_state: Dict[str, Any], prediction: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculates feature deviations to flag the top 5 risk drivers for the project.
        """
        # 1. Compute current features
        features = FeatureExtractor.extract_features(project_state)
        
        # 2. Baseline averages for comparison
        baselines = {
            "project_progress_pct": 50.0,
            "activities_completed": 8.0,
            "activities_delayed": 1.5,
            "activities_blocked": 0.2,
            "critical_activities_delayed": 0.5,
            "avg_delay_days": 10.0,
            "max_delay_days": 25.0,
            "total_delay_till_date": 45.0,
            "schedule_variance": 0.0,
            "critical_path_length_remaining": 360.0,
            "parallel_activities_running": 1.5,
            "pending_milestones": 2.0,
            "approval_delay_total": 12.0,
            "vendor_delay_total": 15.0,
            "requirement_changes": 2.0,
            "design_changes": 2.5,
            "qa_issues": 1.2,
            "fat_failures": 0.5,
            "sat_failures": 0.3,
            "technical_complexity": 6.5,
            "technology_maturity": 7.5,
            "foreign_dependency": 0.25,
            "vendor_rating": 3.8,
            "remaining_planned_duration": 360.0,
            "project_health_score": 90.0,
            "open_risks": 2.0,
            "project_cost": 8000.0,
            "planned_duration_months": 60.0
        }

        # Model feature importance weights (fallback if model weights are not extractable)
        # These are structured to prioritize actual delay and risk indicators
        weights = {
            "critical_activities_delayed": 0.18,
            "total_delay_till_date": 0.15,
            "activities_blocked": 0.12,
            "activities_delayed": 0.10,
            "max_delay_days": 0.08,
            "avg_delay_days": 0.07,
            "vendor_delay_total": 0.06,
            "approval_delay_total": 0.05,
            "requirement_changes": 0.04,
            "qa_issues": 0.04,
            "fat_failures": 0.03,
            "sat_failures": 0.03,
            "technical_complexity": 0.02,
            "foreign_dependency": 0.02,
            "project_cost": 0.01
        }

        # Try to read feature importances from the classifier
        if self.predictor and self.predictor.models_loaded:
            model = self.predictor.cls
            if hasattr(model, "feature_importances_"):
                # Map preprocessor feature names to importances
                try:
                    num_len = len(self.predictor.preprocessor.num_cols)
                    for i, col in enumerate(self.predictor.preprocessor.num_cols):
                        if col in weights:
                            weights[col] = float(model.feature_importances_[i])
                except Exception:
                    pass

        # Compute deviations for features of interest
        drivers = []
        for feat, val in features.items():
            if feat not in baselines or feat not in weights:
                continue

            base = baselines[feat]
            weight = weights[feat]

            # Calculate relative positive deviation
            if feat in ["project_health_score", "vendor_rating", "technology_maturity"]:
                # Lower values are worse/risky
                deviation = (base - val) / (base + 0.1)
            else:
                # Higher values are worse/risky
                deviation = (val - base) / (base + 0.1)

            # Map negative deviations to 0 (no elevated risk contribution)
            deviation = max(0.0, deviation)
            risk_score = deviation * weight

            if risk_score > 0.001:
                drivers.append({
                    "feature": feat,
                    "value": round(val, 2),
                    "baseline": round(base, 2),
                    "deviation_pct": round(deviation * 100.0, 1),
                    "risk_score": round(risk_score * 10.0, 2)  # Scale to 0-10
                })

        # Sort by risk score descending, return top 5
        drivers.sort(key=lambda x: x["risk_score"], reverse=True)
        top_drivers = drivers[:5]

        # If empty, add a default profile
        if not top_drivers:
            top_drivers.append({
                "feature": "technical_complexity",
                "value": features["technical_complexity"],
                "baseline": baselines["technical_complexity"],
                "deviation_pct": 0.0,
                "risk_score": 0.1
            })

        return {"Top_Risk_Drivers": top_drivers}
