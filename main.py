"""
main.py

The main orchestration script for the Ship Delay Prediction ML Pipeline.
Runs data generation, validation, engineering, model training, evaluation,
visualization, dashboard data export, and outputs sample inference report.
"""

import argparse
from pathlib import Path
import pandas as pd
import numpy as np

from logger import logger
from config import RAW_DATA_PATH, ensure_directories
from utils import set_random_seed, check_xgboost_installed

from generate_dataset import run_dataset_generation
from dataset_validator import DatasetValidator
from feature_engineering import engineer_features
from preprocess import Preprocessor
from train_models import train_regression_models, train_classification_models
from evaluate_models import compare_regression_models, compare_classification_models
from save_model import save_all_trained_models
from predict import predict_project_delays
from explain_prediction import explain_prediction_details, print_explanation_report

from visualization import (
    plot_correlation_heatmap, plot_delay_distribution, plot_risk_distribution,
    plot_confusion_matrix, plot_roc_curve, plot_residual_plot, plot_actual_vs_predicted,
    plot_feature_importance
)
from dashboard_data import generate_dashboard_metadata

def run_pipeline(size: int = 5000, seed: int = 42) -> None:
    """Executes the entire end-to-end machine learning pipeline."""
    logger.info("="*60)
    logger.info("   STARTING SHIP ACQUISITION DELAY ML PIPELINE")
    logger.info("="*60)
    
    # 0. Set seed & directories
    set_random_seed(seed)
    ensure_directories()
    
    # 1. Phase 1: Dataset Generation
    logger.info("--- PHASE 1: DATA GENERATION ---")
    df_raw = run_dataset_generation(size=size, seed=seed)
    
    # 2. Data Validation
    logger.info("--- DATA VALIDATION & REPAIR ---")
    validator = DatasetValidator()
    df_validated, is_valid = validator.validate(df_raw, repair=True)
    if is_valid:
        logger.info("Data validation succeeded.")
    else:
        logger.warning("Data validation repaired structural violations.")
        
    # 3. Exploratory Data Visualization
    logger.info("--- GENERATING EXPLORATORY VISUALIZATIONS ---")
    plot_correlation_heatmap(df_validated)
    plot_delay_distribution(df_validated)
    plot_risk_distribution(df_validated)
    
    # 4. Feature Engineering
    logger.info("--- FEATURE ENGINEERING ---")
    df_engineered = engineer_features(df_validated)
    
    # 5. Preprocessing & Data Splits
    logger.info("--- PREPROCESSING & SPLITTING ---")
    preprocessor = Preprocessor()
    X = preprocessor.fit_transform(df_engineered)
    targets = preprocessor.extract_targets(df_engineered)
    
    # Extract target vectors
    y_pct = targets["Delay_Percentage"]
    y_months = targets["Delay_Months"]
    y_risk = targets["Risk_Category"]
    
    # Split into train/test (80:20 split)
    from sklearn.model_selection import train_test_split
    X_train, X_test, y_train_pct, y_test_pct = train_test_split(X, y_pct, test_size=0.2, random_state=seed)
    _, _, y_train_months, y_test_months = train_test_split(X, y_months, test_size=0.2, random_state=seed)
    _, _, y_train_risk, y_test_risk = train_test_split(X, y_risk, test_size=0.2, random_state=seed, stratify=y_risk)
    
    # 6. Phase 2: Model Training
    logger.info("--- PHASE 2: MODEL TRAINING ---")
    reg_models = train_regression_models(X_train, y_train_pct, y_train_months, random_state=seed)
    cls_models = train_classification_models(X_train, y_train_risk, random_state=seed)
    
    # 7. Model Evaluation & Selection
    logger.info("--- MODEL EVALUATION & COMPARISON ---")
    
    # Compare percentage regressors
    logger.info("Evaluating Delay Percentage Regressors:")
    df_reg_pct, best_reg_pct_name, best_reg_pct = compare_regression_models(
        reg_models["Delay_Percentage"], X_test, y_test_pct
    )
    
    # Compare months regressors
    logger.info("Evaluating Delay Months Regressors:")
    df_reg_months, best_reg_months_name, best_reg_months = compare_regression_models(
        reg_models["Delay_Months"], X_test, y_test_months
    )
    
    # Compare risk classifiers
    logger.info("Evaluating Risk Classifiers:")
    df_cls, best_cls_name, best_cls = compare_classification_models(
        cls_models, X_test, y_test_risk
    )
    
    # 8. Plot Model Evaluations & Diagnoses
    logger.info("--- GENERATING MODEL PERFORMANCE PLOTS ---")
    
    # Prediction arrays from best models
    y_pred_pct = best_reg_pct.predict(X_test)
    y_pred_cls = best_cls.predict(X_test)
    
    try:
        y_prob_cls = best_cls.predict_proba(X_test)
    except AttributeError:
        y_prob_cls = np.eye(4)[y_pred_cls]
        
    # Standard plots
    from sklearn.metrics import confusion_matrix as sk_confusion_matrix
    cm = sk_confusion_matrix(y_test_risk, y_pred_cls)
    classes = ["Low", "Medium", "High", "Critical"]
    
    plot_confusion_matrix(cm, classes)
    plot_roc_curve(y_test_risk, y_prob_cls, classes)
    plot_residual_plot(y_test_pct, y_pred_pct)
    plot_actual_vs_predicted(y_test_pct, y_pred_pct)
    
    # Feature importance
    if hasattr(best_reg_pct, "feature_importances_"):
        plot_feature_importance(best_reg_pct.feature_importances_, preprocessor.feature_names_out)
    elif hasattr(best_reg_pct, "coef_"):
        plot_feature_importance(np.abs(best_reg_pct.coef_), preprocessor.feature_names_out)
        
    # 9. Dashboard Metadata Export
    logger.info("--- EXPORTING DASHBOARD METRICS ---")
    feat_importances = best_reg_pct.feature_importances_ if hasattr(best_reg_pct, "feature_importances_") else np.ones(len(preprocessor.feature_names_out)) / len(preprocessor.feature_names_out)
    
    generate_dashboard_metadata(
        df_raw=df_validated,
        reg_pct_comparison=df_reg_pct,
        reg_months_comparison=df_reg_months,
        cls_comparison=df_cls,
        best_reg_name=best_reg_pct_name,
        best_cls_name=best_cls_name,
        feature_names=preprocessor.feature_names_out,
        feature_importances=feat_importances
    )
    
    # 10. Save Models
    logger.info("--- SAVING TRAINED PIPELINE MODELS ---")
    save_all_trained_models(
        regression_models=reg_models,
        classification_models=cls_models,
        preprocessor=preprocessor,
        best_reg_pct_model=best_reg_pct,
        best_reg_months_model=best_reg_months,
        best_cls_model=best_cls
    )
    
    logger.info("="*60)
    logger.info("   PIPELINE COMPLETION REPORT SUCCESSFUL")
    logger.info("="*60)
    
    # 11. Run a sample prediction and print risk explanation report
    logger.info("Running test prediction for verification...")
    test_project = {
        "Ship_Type": "Destroyer",
        "Project_Cost": 13500.0,
        "Planned_Duration": 72,
        "Technical_Complexity": 8.5,
        "Technology_Maturity": 5.0,
        "Foreign_Dependency": True,
        "Approval_Delay": 135,
        "Vendor_Delay": 120,
        "Requirement_Changes": 6
    }
    
    prediction = predict_project_delays(test_project)
    explanation = explain_prediction_details(test_project, prediction)
    print_explanation_report(explanation)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="End-to-End Ship Delay Prediction Pipeline Orchestrator")
    parser.add_argument("--size", type=int, default=1000, help="Size of synthetic dataset to generate (default: 1000 for quick run)")
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default: 42)")
    args = parser.parse_args()
    
    run_pipeline(size=args.size, seed=args.seed)
