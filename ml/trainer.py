"""
Trainer.
Fits multiple regressors and classifiers for predicting delay percentages, months, and risk tiers.
"""

import logging
from typing import Dict
import numpy as np
from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, GradientBoostingRegressor, GradientBoostingClassifier
import xgboost as xgb

logger = logging.getLogger(__name__)

def train_regression_models(X: np.ndarray, y_pct: np.ndarray, y_months: np.ndarray, seed: int = 42) -> Dict[str, Any]:
    """Trains regression models for both delay percentage and delay months."""
    logger.info("Training regression models...")
    
    models = {
        # Percentage Regression
        "dt_reg_pct": DecisionTreeRegressor(max_depth=8, random_state=seed),
        "rf_reg_pct": RandomForestRegressor(n_estimators=100, max_depth=12, random_state=seed, n_jobs=-1),
        "gb_reg_pct": GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, random_state=seed),
        "xgb_reg_pct": xgb.XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=seed, n_jobs=-1),

        # Months Regression
        "dt_reg_months": DecisionTreeRegressor(max_depth=8, random_state=seed),
        "rf_reg_months": RandomForestRegressor(n_estimators=100, max_depth=12, random_state=seed, n_jobs=-1),
        "gb_reg_months": GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, random_state=seed),
        "xgb_reg_months": xgb.XGBRegressor(n_estimators=100, learning_rate=0.1, random_state=seed, n_jobs=-1)
    }

    # Fit percentage models
    for name in ["dt_reg_pct", "rf_reg_pct", "gb_reg_pct", "xgb_reg_pct"]:
        logger.info(f"Fitting {name}...")
        models[name].fit(X, y_pct)

    # Fit months models
    for name in ["dt_reg_months", "rf_reg_months", "gb_reg_months", "xgb_reg_months"]:
        logger.info(f"Fitting {name}...")
        models[name].fit(X, y_months)

    return models

def train_classification_models(X: np.ndarray, y_risk: np.ndarray, seed: int = 42) -> Dict[str, Any]:
    """Trains classification models for project risk category."""
    logger.info("Training classification models...")

    models = {
        "dt_cls": DecisionTreeClassifier(max_depth=6, random_state=seed),
        "rf_cls": RandomForestClassifier(n_estimators=100, max_depth=10, random_state=seed, n_jobs=-1),
        "gb_cls": GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, random_state=seed),
        "xgb_cls": xgb.XGBClassifier(n_estimators=100, learning_rate=0.1, num_class=4, objective="multi:softprob", random_state=seed, n_jobs=-1)
    }

    for name, model in models.items():
        logger.info(f"Fitting {name}...")
        model.fit(X, y_risk)

    return models
