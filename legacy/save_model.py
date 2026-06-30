"""
save_model.py

Provides functions to serialize and save trained machine learning models,
estimators, and preprocessors using pickle.
"""

from pathlib import Path
from typing import Any, Dict
from config import MODEL_PATHS, MODELS_DIR
from logger import logger
from utils import save_pickle

def save_model_artifact(model_obj: Any, name: str) -> None:
    """Saves a model to the specific path defined in config.py by key name."""
    if name in MODEL_PATHS:
        save_path = MODEL_PATHS[name]
    else:
        save_path = MODELS_DIR / f"{name}.pkl"
        
    logger.info(f"Saving model artifact '{name}' to {save_path}...")
    save_pickle(model_obj, save_path)
    logger.info(f"Model artifact '{name}' saved successfully.")

def save_all_trained_models(
    regression_models: Dict[str, Dict[str, Any]], 
    classification_models: Dict[str, Any],
    preprocessor: Any,
    best_reg_pct_model: Any,
    best_reg_months_model: Any,
    best_cls_model: Any
) -> None:
    """Saves all models, preprocessors, and best estimators to disk."""
    logger.info("Saving all pipeline models and artifacts...")
    
    # 1. Save Preprocessor
    save_model_artifact(preprocessor, "preprocessor")
    
    # 2. Save individual regression models (Percentage)
    for name, model in regression_models["Delay_Percentage"].items():
        artifact_name = f"{name}_reg_pct"
        save_model_artifact(model, artifact_name)
        
    # 3. Save individual regression models (Months)
    for name, model in regression_models["Delay_Months"].items():
        artifact_name = f"{name}_reg_months"
        save_model_artifact(model, artifact_name)
        
    # 4. Save individual classification models
    for name, model in classification_models.items():
        artifact_name = f"{name}_cls"
        save_model_artifact(model, artifact_name)
        
    # 5. Save best models
    save_model_artifact(best_reg_pct_model, "best_regression_model") # default refers to Delay_Percentage
    save_model_artifact(best_reg_months_model, "best_reg_months_model")
    save_model_artifact(best_cls_model, "best_classification_model")
    
    logger.info("All pipeline models and artifacts saved to disk.")
