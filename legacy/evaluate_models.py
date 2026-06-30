"""
evaluate_models.py

This module handles evaluation of regression and classification models.
It calculates standard metrics (MAE, MSE, RMSE, R2, MAPE, Accuracy, Precision, Recall, F1, ROC-AUC),
identifies the best performing models, and returns comparison summaries.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score, mean_absolute_percentage_error,
    accuracy_score, precision_recall_fscore_support, roc_auc_score, confusion_matrix
)
from logger import logger

def evaluate_regression_model(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Calculates regression metrics for a given set of predictions."""
    mae = mean_absolute_error(y_true, y_pred)
    mse = mean_squared_error(y_true, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_true, y_pred)
    
    # Avoid division by zero in MAPE
    try:
        mape = mean_absolute_percentage_error(y_true, y_pred) * 100.0
    except Exception:
        mape = np.mean(np.abs((y_true - y_pred) / (y_true + 1e-5))) * 100.0
        
    return {
        "MAE": mae,
        "MSE": mse,
        "RMSE": rmse,
        "R2": r2,
        "MAPE": mape
    }

def evaluate_classification_model(
    y_true: np.ndarray, 
    y_pred: np.ndarray, 
    y_prob: np.ndarray, 
    num_classes: int = 4
) -> Dict[str, Any]:
    """Calculates classification metrics for a given set of predictions."""
    accuracy = accuracy_score(y_true, y_pred)
    
    # Calculate precision, recall, and f1 (weighted and macro average)
    precision_w, recall_w, f1_w, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted', zero_division=0)
    precision_m, recall_m, f1_m, _ = precision_recall_fscore_support(y_true, y_pred, average='macro', zero_division=0)
    
    # Calculate ROC-AUC (one-vs-rest, weighted)
    try:
        # Check if y_prob has probabilities for all classes
        if y_prob.shape[1] == num_classes:
            roc_auc = roc_auc_score(y_true, y_prob, multi_class='ovr', average='weighted')
        else:
            roc_auc = 0.0
            logger.warning("ROC-AUC calculation skipped due to class mismatch in prediction probabilities.")
    except Exception as e:
        roc_auc = 0.0
        logger.warning(f"ROC-AUC calculation failed: {e}")
        
    conf_mat = confusion_matrix(y_true, y_pred)
    
    return {
        "Accuracy": accuracy,
        "Weighted_Precision": precision_w,
        "Weighted_Recall": recall_w,
        "Weighted_F1": f1_w,
        "Macro_Precision": precision_m,
        "Macro_Recall": recall_m,
        "Macro_F1": f1_m,
        "ROC_AUC": roc_auc,
        "Confusion_Matrix": conf_mat.tolist() # Convert numpy array to list for JSON compatibility
    }

def compare_regression_models(
    models: Dict[str, Any], 
    X_test: np.ndarray, 
    y_test: np.ndarray
) -> Tuple[pd.DataFrame, str, Any]:
    """
    Evaluates a dictionary of regression models and identifies the best model using R2 score.
    Returns a comparison DataFrame, name of the best model, and the best model object itself.
    """
    results = {}
    for name, model in models.items():
        y_pred = model.predict(X_test)
        metrics = evaluate_regression_model(y_test, y_pred)
        results[name] = metrics
        
    df_results = pd.DataFrame(results).T
    logger.info(f"Regression Comparison Results:\n{df_results.to_string()}")
    
    # Select best model based on R2 score
    best_model_name = df_results["R2"].idxmax()
    best_model = models[best_model_name]
    logger.info(f"Best regression model selected: {best_model_name} (R2={df_results.loc[best_model_name, 'R2']:.4f})")
    
    return df_results, best_model_name, best_model

def compare_classification_models(
    models: Dict[str, Any], 
    X_test: np.ndarray, 
    y_test: np.ndarray
) -> Tuple[pd.DataFrame, str, Any]:
    """
    Evaluates a dictionary of classification models and identifies the best model using F1 score.
    Returns a comparison DataFrame, name of the best model, and the best model object itself.
    """
    results = {}
    for name, model in models.items():
        y_pred = model.predict(X_test)
        
        # Get probability output
        try:
            y_prob = model.predict_proba(X_test)
        except AttributeError:
            # For models like Decision Tree with low depth or custom architectures without proba, construct dummy proba
            logger.warning(f"predict_proba not available for {name}. Constructing one-hot probabilities.")
            y_prob = np.eye(4)[y_pred]
            
        metrics = evaluate_classification_model(y_test, y_pred, y_prob)
        # Flatten confusion matrix or remove it from display DF
        metrics_display = {k: v for k, v in metrics.items() if k != "Confusion_Matrix"}
        results[name] = metrics_display
        
    df_results = pd.DataFrame(results).T
    logger.info(f"Classification Comparison Results:\n{df_results.to_string()}")
    
    # Select best model based on Weighted F1-score
    best_model_name = df_results["Weighted_F1"].idxmax()
    best_model = models[best_model_name]
    logger.info(f"Best classification model selected: {best_model_name} (Weighted F1={df_results.loc[best_model_name, 'Weighted_F1']:.4f})")
    
    return df_results, best_model_name, best_model
