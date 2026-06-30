"""
Evaluator.
Computes metrics for regressors and classifiers, and compares them to select the best pipeline components.
"""

import logging
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score, f1_score, precision_score, recall_score, roc_auc_score

logger = logging.getLogger(__name__)

def mean_absolute_percentage_error(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Computes MAPE, protecting against division by zero."""
    y_true = np.where(y_true == 0, 1e-5, y_true)
    return float(np.mean(np.abs((y_true - y_pred) / y_true)) * 100.0)

def evaluate_regression_model(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """Calculates regression performance metrics."""
    return {
        "MAE": float(mean_absolute_error(y_true, y_pred)),
        "RMSE": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "R2": float(r2_score(y_true, y_pred)),
        "MAPE": mean_absolute_percentage_error(y_true, y_pred)
    }

def evaluate_classification_model(y_true: np.ndarray, y_pred: np.ndarray, y_prob: np.ndarray) -> Dict[str, float]:
    """Calculates classification performance metrics."""
    # Handle single target class cases during micro splits
    try:
        if y_prob.shape[1] > 1:
            roc_auc = float(roc_auc_score(y_true, y_prob, multi_class="ovr", average="weighted"))
        else:
            roc_auc = 0.5
    except Exception:
        roc_auc = 0.5

    return {
        "Accuracy": float(accuracy_score(y_true, y_pred)),
        "Precision": float(precision_score(y_true, y_pred, average="weighted", zero_division=0)),
        "Recall": float(recall_score(y_true, y_pred, average="weighted", zero_division=0)),
        "Weighted_F1": float(f1_score(y_true, y_pred, average="weighted", zero_division=0)),
        "ROC_AUC": roc_auc
    }

def compare_regression_models(
    models: Dict[str, Any],
    X_test: np.ndarray,
    y_test: np.ndarray,
    suffix: str = "pct"
) -> Tuple[pd.DataFrame, str, Any]:
    """Compares multiple regressors and selects the best one (highest R2)."""
    results = {}
    target_models = [m for m in models.keys() if m.endswith(suffix)]
    
    for name in target_models:
        y_pred = models[name].predict(X_test)
        results[name] = evaluate_regression_model(y_test, y_pred)
        
    df = pd.DataFrame(results).T
    best_model_name = df["R2"].idxmax()
    logger.info(f"Best Regressor ({suffix}) selected: {best_model_name} with R2 = {df.loc[best_model_name, 'R2']:.4f}")
    return df, best_model_name, models[best_model_name]

def compare_classification_models(
    models: Dict[str, Any],
    X_test: np.ndarray,
    y_test: np.ndarray
) -> Tuple[pd.DataFrame, str, Any]:
    """Compares multiple classifiers and selects the best one (highest F1)."""
    results = {}
    target_models = [m for m in models.keys() if m.endswith("cls")]
    
    for name in target_models:
        model = models[name]
        y_pred = model.predict(X_test)
        # Handle probability output formats
        if hasattr(model, "predict_proba"):
            y_prob = model.predict_proba(X_test)
        else:
            y_prob = np.zeros((len(y_test), 4))
            
        results[name] = evaluate_classification_model(y_test, y_pred, y_prob)
        
    df = pd.DataFrame(results).T
    best_model_name = df["Weighted_F1"].idxmax()
    logger.info(f"Best Classifier selected: {best_model_name} with F1 = {df.loc[best_model_name, 'Weighted_F1']:.4f}")
    return df, best_model_name, models[best_model_name]
