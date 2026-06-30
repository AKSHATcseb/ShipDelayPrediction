"""
load_model.py

Provides functions to deserialize and load machine learning models,
estimators, and preprocessors from disk.
"""

from pathlib import Path
from typing import Any
from config import MODEL_PATHS, MODELS_DIR
from logger import logger
from utils import load_pickle

def load_model_artifact(name: str) -> Any:
    """Loads a model from the specific path defined in config.py by key name."""
    if name in MODEL_PATHS:
        load_path = MODEL_PATHS[name]
    else:
        # Check custom files
        load_path = MODELS_DIR / f"{name}.pkl"
        
    logger.info(f"Loading model artifact '{name}' from {load_path}...")
    model_obj = load_pickle(load_path)
    logger.info(f"Model artifact '{name}' loaded successfully.")
    return model_obj

def load_inference_pipeline() -> tuple:
    """
    Loads all core components required for running inference:
    1. Preprocessor
    2. Best regression model (Percentage)
    3. Best regression model (Months)
    4. Best classification model (Risk Tier)
    Returns: (preprocessor, best_reg_pct, best_reg_months, best_cls)
    """
    logger.info("Loading full inference pipeline...")
    
    preprocessor = load_model_artifact("preprocessor")
    best_reg_pct = load_model_artifact("best_regression_model")
    
    # Check custom keys
    try:
        best_reg_months = load_model_artifact("best_reg_months_model")
    except FileNotFoundError:
        # Fallback if months model is saved under other names
        best_reg_months = load_model_artifact("best_regression_model")
        
    best_cls = load_model_artifact("best_classification_model")
    
    logger.info("Inference pipeline successfully loaded from disk.")
    return preprocessor, best_reg_pct, best_reg_months, best_cls
