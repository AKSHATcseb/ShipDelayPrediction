"""
dashboard_data.py

Extracts and exports pipeline results, model comparison reports,
feature importances, and dataset summaries to a standardized JSON structure
so they can be consumed by external visualization dashboards.
"""

import json
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, Any, List
from config import DATA_DIR
from logger import logger

def generate_dashboard_metadata(
    df_raw: pd.DataFrame,
    reg_pct_comparison: pd.DataFrame,
    reg_months_comparison: pd.DataFrame,
    cls_comparison: pd.DataFrame,
    best_reg_name: str,
    best_cls_name: str,
    feature_names: List[str],
    feature_importances: np.ndarray,
    save_path: Path = DATA_DIR / "dashboard_metrics.json"
) -> Dict[str, Any]:
    """
    Compiles data summaries and model evaluation results, then writes them to JSON.
    """
    logger.info(f"Generating dashboard metadata to: {save_path}")
    
    # 1. Dataset stats
    total_projects = len(df_raw)
    avg_delay_months = float(df_raw["Delay_Months"].mean())
    avg_delay_pct = float(df_raw["Delay_Percentage"].mean())
    
    # Ship Type breakdown
    ship_type_stats = []
    for ship, group in df_raw.groupby("Ship_Type"):
        ship_type_stats.append({
            "Ship_Type": ship,
            "Count": int(len(group)),
            "Avg_Cost_Cr": float(group["Project_Cost"].mean()),
            "Avg_Duration_Months": float(group["Planned_Duration"].mean()),
            "Avg_Delay_Months": float(group["Delay_Months"].mean()),
            "Avg_Delay_Percentage": float(group["Delay_Percentage"].mean())
        })
        
    # Risk Category breakdown
    risk_counts = df_raw["Risk_Category"].value_counts().to_dict()
    risk_stats = {k: int(v) for k, v in risk_counts.items()}
    
    # 2. Model comparisons
    # Convert dataframes to dictionaries
    reg_pct_dict = reg_pct_comparison.round(4).to_dict(orient="index")
    reg_months_dict = reg_months_comparison.round(4).to_dict(orient="index")
    cls_dict = cls_comparison.round(4).to_dict(orient="index")
    
    # 3. Top Feature Importances
    df_imp = pd.DataFrame({
        "Feature": feature_names,
        "Importance": feature_importances
    }).sort_values(by="Importance", ascending=False)
    
    top_features = []
    for _, row in df_imp.head(15).iterrows():
        top_features.append({
            "Feature": row["Feature"],
            "Importance": float(row["Importance"])
        })
        
    # Compile everything
    dashboard_data = {
        "dataset_summary": {
            "total_projects": total_projects,
            "avg_delay_months": round(avg_delay_months, 2),
            "avg_delay_pct": round(avg_delay_pct, 2),
            "ship_type_breakdown": ship_type_stats,
            "risk_tier_breakdown": risk_stats
        },
        "model_comparison": {
            "best_regression_model": best_reg_name,
            "best_classification_model": best_cls_name,
            "regression_percentage_metrics": reg_pct_dict,
            "regression_months_metrics": reg_months_dict,
            "classification_metrics": cls_dict
        },
        "feature_importances": top_features
    }
    
    # Save to file
    save_path.parent.mkdir(parents=True, exist_ok=True)
    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(dashboard_data, f, indent=4)
        
    logger.info("Dashboard metadata JSON exported successfully.")
    return dashboard_data
