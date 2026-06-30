"""
run_pipeline.py

Orchestrates the complete activity-level Machine Learning pipeline:
1. Procedural generation & simulation of activity-level project lifecycles.
2. Feature extraction and pre-processing.
3. Model training (Decision Trees, Random Forests, Gradient Boosting, XGBoost).
4. Evaluation and model selection.
5. Exporting model artifacts and visual diagnostic plots.
"""

import argparse
import logging
import json
import joblib
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")  # Non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from pathlib import Path

from ml.config import (
    MODEL_PATHS, DATA_DIR, MODELS_DIR, PLOTS_DIR, METRICS_JSON_PATH,
    DEFAULT_NUM_PROJECTS, RANDOM_STATE
)
from ml.dataset_builder import build_dataset
from ml.preprocessor import Preprocessor
from ml.trainer import train_regression_models, train_classification_models
from ml.evaluator import compare_regression_models, compare_classification_models

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s [%(name)s:%(lineno)d] %(message)s"
)
logger = logging.getLogger("run_pipeline")


def export_plots(
    test_df: pd.DataFrame,
    X_test_scaled: np.ndarray,
    preprocessor: Preprocessor,
    best_reg_pct: Any,
    best_reg_months: Any,
    best_cls: Any
):
    """Generates and saves visual diagnostic charts."""
    logger.info("Generating and exporting diagnostic plots...")
    
    # Extract actual test targets
    y_test_pct = test_df["target_delay_percentage"].to_numpy()
    y_test_months = test_df["target_delay_months"].to_numpy()
    y_test_risk = test_df["target_risk_category"].to_numpy()
    
    # Predictions
    pred_pct = best_reg_pct.predict(X_test_scaled)
    pred_months = best_reg_months.predict(X_test_scaled)
    pred_risk = best_cls.predict(X_test_scaled)

    # 1. Actual vs Predicted Delay Months
    plt.figure(figsize=(8, 6))
    plt.scatter(y_test_months, pred_months, alpha=0.5, color="#0f4c81")
    plt.plot([y_test_months.min(), y_test_months.max()], [y_test_months.min(), y_test_months.max()], "k--", lw=2)
    plt.xlabel("Actual Delay (Months)")
    plt.ylabel("Predicted Delay (Months)")
    plt.title("Actual vs Predicted Project Delays (Months)")
    plt.grid(True)
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / "actual_vs_predicted.png")
    plt.close()

    # 2. Residual Plot
    plt.figure(figsize=(8, 6))
    residuals = y_test_months - pred_months
    plt.scatter(pred_months, residuals, alpha=0.5, color="#b91c1c")
    plt.axhline(y=0, color="black", linestyle="--")
    plt.xlabel("Predicted Delay (Months)")
    plt.ylabel("Residuals (Actual - Predicted)")
    plt.title("Regression Residuals Diagnosis")
    plt.grid(True)
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / "residuals.png")
    plt.close()

    # 3. Feature Importance Plot
    plt.figure(figsize=(10, 8))
    # Get feature importances
    if hasattr(best_reg_months, "feature_importances_"):
        importances = best_reg_months.feature_importances_
        # Combine numeric columns + encoded one-hot categories
        num_cols = preprocessor.num_cols
        # Try to map OHE categories if fitted
        try:
            ohe = preprocessor.preprocessor.named_transformers_["cat"]
            cat_features = list(ohe.get_feature_names_out(preprocessor.cat_cols))
        except Exception:
            cat_features = ["ship_type_Destroyer", "ship_type_Frigate", "ship_type_Corvette",
                            "ship_type_Submarine", "ship_type_Aircraft_Carrier"]
        
        feature_names = num_cols + cat_features + ["foreign_dependency"]
        # Ensure name length matches importances length
        feature_names = feature_names[:len(importances)]
        
        feat_df = pd.DataFrame({
            "Feature": feature_names,
            "Importance": importances[:len(feature_names)]
        }).sort_values("Importance", ascending=False).head(15)
        
        sns.barplot(data=feat_df, x="Importance", y="Feature", palette="Blues_r")
        plt.title("Top 15 Most Influential Features (Regression)")
        plt.tight_layout()
        plt.savefig(PLOTS_DIR / "feature_importance.png")
    plt.close()

    # 4. Confusion Matrix
    from sklearn.metrics import confusion_matrix
    plt.figure(figsize=(8, 6))
    cm = confusion_matrix(y_test_risk, pred_risk)
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=["Low", "Medium", "High", "Critical"],
                yticklabels=["Low", "Medium", "High", "Critical"])
    plt.xlabel("Predicted Category")
    plt.ylabel("Actual Category")
    plt.title("Confusion Matrix: Risk Classification")
    plt.tight_layout()
    plt.savefig(PLOTS_DIR / "confusion_matrix.png")
    plt.close()
    
    logger.info(f"Visual plots generated successfully under: {PLOTS_DIR}")


def main():
    parser = argparse.ArgumentParser(description="Indian Navy Ship Acquisition Delay Risk ML Pipeline")
    parser.add_argument("--projects", type=int, default=DEFAULT_NUM_PROJECTS, help="Number of projects to simulate")
    parser.add_argument("--seed", type=int, default=RANDOM_STATE, help="Random seed for reproducibility")
    args = parser.parse_args()

    # 1. Procedural generation & event simulation
    train_df, test_df = build_dataset(num_projects=args.projects, seed=args.seed)

    # 2. Preprocess & Scale features
    preprocessor = Preprocessor()
    X_train_scaled = preprocessor.fit_transform(train_df)
    X_test_scaled = preprocessor.transform(test_df)

    y_train_pct, y_train_months, y_train_risk = preprocessor.extract_targets(train_df)
    y_test_pct, y_test_months, y_test_risk = preprocessor.extract_targets(test_df)

    # 3. Model Training
    reg_models = train_regression_models(X_train_scaled, y_train_pct, y_train_months, seed=args.seed)
    cls_models = train_classification_models(X_train_scaled, y_train_risk, seed=args.seed)

    # 4. Model selection and metrics comparison
    df_reg_pct, best_reg_pct_name, best_reg_pct = compare_regression_models(
        reg_models, X_test_scaled, y_test_pct, suffix="pct"
    )
    df_reg_m, best_reg_m_name, best_reg_months = compare_regression_models(
        reg_models, X_test_scaled, y_test_months, suffix="months"
    )
    df_cls, best_cls_name, best_cls = compare_classification_models(
        cls_models, X_test_scaled, y_test_risk
    )

    # 5. Save best pipelines to disk
    logger.info("Saving best model pipelines to models/...")
    joblib.dump(preprocessor, MODEL_PATHS["preprocessor"])
    joblib.dump(best_reg_pct, MODEL_PATHS["best_reg_pct"])
    joblib.dump(best_reg_months, MODEL_PATHS["best_reg_months"])
    joblib.dump(best_cls, MODEL_PATHS["best_cls"])
    
    # Save individual models too for compliance with config paths
    for name, model in reg_models.items():
        joblib.dump(model, MODEL_PATHS[name])
    for name, model in cls_models.items():
        joblib.dump(model, MODEL_PATHS[name])

    # 6. Generate plots
    export_plots(test_df, X_test_scaled, preprocessor, best_reg_pct, best_reg_months, best_cls)

    # 7. Write metrics to dashboard JSON
    metrics = {
        "model_comparison": {
            "best_regression_model": best_reg_m_name,
            "best_classification_model": best_cls_name,
            "regression_percentage_metrics": df_reg_pct.to_dict(orient="index"),
            "regression_months_metrics": df_reg_m.to_dict(orient="index"),
            "classification_metrics": df_cls.to_dict(orient="index")
        },
        "dataset_summary": {
            "total_projects": args.projects,
            "total_snapshots": len(train_df) + len(test_df),
            "avg_delay_months": float(round(np.mean(df_row := train_df["target_delay_months"]), 1)),
            "avg_delay_pct": float(round(np.mean(train_df["target_delay_percentage"]), 1)),
            "ship_type_breakdown": train_df.groupby("ship_type").size().to_dict()
        }
    }
    
    # Ensure types are JSON serializable
    # Convert keys and np types
    def clean_dict(d):
        if not isinstance(d, dict):
            return d
        res = {}
        for k, v in d.items():
            k_str = str(k)
            if isinstance(v, dict):
                res[k_str] = clean_dict(v)
            elif isinstance(v, (np.float32, np.float64)):
                res[k_str] = float(v)
            elif isinstance(v, (np.int32, np.int64)):
                res[k_str] = int(v)
            else:
                res[k_str] = v
        return res

    clean_metrics = clean_dict(metrics)
    with open(METRICS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(clean_metrics, f, indent=4)
    logger.info(f"Saved pipeline metrics JSON: {METRICS_JSON_PATH}")
    
    logger.info("ML PIPELINE PIPELINE ORCHESTRATION COMPLETE SUCCESSFULLY!")


if __name__ == "__main__":
    from typing import Any
    main()
