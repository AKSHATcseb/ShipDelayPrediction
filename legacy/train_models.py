"""
train_models.py

This module contains the logic for training multiple Machine Learning models
for both regression and classification tasks. It trains models on preprocessed features
to predict Delay_Months, Delay_Percentage, and Risk_Category.
"""

from typing import Dict, Any, Tuple
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import (
    RandomForestClassifier, RandomForestRegressor,
    GradientBoostingClassifier, GradientBoostingRegressor
)
from logger import logger
from utils import check_xgboost_installed

def train_regression_models(
    X_train: Any, 
    y_train_percentage: Any, 
    y_train_months: Any,
    random_state: int = 42
) -> Dict[str, Dict[str, Any]]:
    """
    Trains multiple regression models for both Delay_Percentage and Delay_Months.
    Returns a dictionary of trained models mapped by target and algorithm name.
    """
    logger.info("Starting training of regression models...")
    trained_models = {
        "Delay_Percentage": {},
        "Delay_Months": {}
    }
    
    # 1. Regressors definitions
    regressors_def = {
        "decision_tree": lambda: DecisionTreeRegressor(random_state=random_state, max_depth=8),
        "random_forest": lambda: RandomForestRegressor(random_state=random_state, n_estimators=100, max_depth=12),
        "gradient_boosting": lambda: GradientBoostingRegressor(random_state=random_state, n_estimators=100, learning_rate=0.1)
    }
    
    # Check if XGBoost is available
    if check_xgboost_installed():
        from xgboost import XGBRegressor
        regressors_def["xgboost"] = lambda: XGBRegressor(
            random_state=random_state, 
            n_estimators=100, 
            learning_rate=0.1,
            eval_metric="rmse"
        )
        logger.info("XGBoost Regressor detected and added to the training pipeline.")
        
    # 2. Train for each target
    targets = {
        "Delay_Percentage": y_train_percentage,
        "Delay_Months": y_train_months
    }
    
    for target_name, y_train in targets.items():
        for name, model_fn in regressors_def.items():
            logger.info(f"Training {name} regressor for {target_name}...")
            model = model_fn()
            model.fit(X_train, y_train)
            trained_models[target_name][name] = model
            logger.info(f"{name} regressor for {target_name} trained successfully.")
            
    return trained_models

def train_classification_models(
    X_train: Any, 
    y_train_risk: Any, 
    random_state: int = 42
) -> Dict[str, Any]:
    """
    Trains multiple classification models for Risk_Category prediction.
    Returns a dictionary of trained classification models.
    """
    logger.info("Starting training of classification models...")
    trained_models = {}
    
    # 1. Classifiers definitions
    classifiers_def = {
        "decision_tree": lambda: DecisionTreeClassifier(random_state=random_state, max_depth=6),
        "random_forest": lambda: RandomForestClassifier(random_state=random_state, n_estimators=100, max_depth=10),
        "gradient_boosting": lambda: GradientBoostingClassifier(random_state=random_state, n_estimators=100, learning_rate=0.1)
    }
    
    # Check if XGBoost is available
    if check_xgboost_installed():
        from xgboost import XGBClassifier
        classifiers_def["xgboost"] = lambda: XGBClassifier(
            random_state=random_state, 
            n_estimators=100, 
            learning_rate=0.1,
            use_label_encoder=False,
            eval_metric="mlogloss",
            num_class=4
        )
        logger.info("XGBoost Classifier detected and added to the training pipeline with 4 class structure.")
        
    # 2. Train models
    for name, model_fn in classifiers_def.items():
        logger.info(f"Training {name} classifier for Risk_Category...")
        model = model_fn()
        model.fit(X_train, y_train_risk)
        trained_models[name] = model
        logger.info(f"{name} classifier trained successfully.")
        
    return trained_models
