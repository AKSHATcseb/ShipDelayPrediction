"""
predict.py

Inference script for the Ship Delay Prediction pipeline.
Takes project parameters (raw inputs), fills missing attributes with ship-type
defaults, engineers features, preprocesses, and outputs predictions for:
- Delay Percentage
- Delay Months
- Risk Category
"""

import argparse
import pandas as pd
import numpy as np
from typing import Dict, Any, Union
from logger import logger
from preprocess import REVERSE_RISK_MAPPING
from load_model import load_inference_pipeline
from feature_engineering import engineer_features
from constants import SHIP_CHARACTERISTICS, SHIP_TYPES

# Default parameters mapping for filling missing values
DEFAULT_PROJECT_VALS = {
    "Project_Size": 5.0,
    "Stakeholder_Count": 15,
    "Approval_Delay": 45,
    "Tender_Delay": 60,
    "Contract_Signing_Delay": 90,
    "Funding_Delay": 30,
    "Government_Clearance_Delay": 60,
    "Vendor_Delay": 90,
    "Vendor_Performance": 3.5,
    "Imported_Equipment": 25.0,
    "Material_Shortage": 2.0,
    "Workforce_Shortage": 3.0,
    "Requirement_Changes": 3,
    "Design_Changes": 2,
    "Documentation_Delay": 40,
    "QA_Issues": 5,
    "Inspection_Failures": 2,
    "FAT_Failures": 1,
    "SAT_Failures": 1,
    "Construction_Delay": 180,
    "Testing_Delay": 90,
    "Weather_Impact": 25,
    "Inflation_Impact": 15,
    "Contract_Modifications": 2,
    "Risk_Register_Open": 8,
    "Historical_Vendor_Rating": 3.8
}

def fill_project_defaults(inputs: Dict[str, Any]) -> Dict[str, Any]:
    """Fills missing features in input dictionary based on Ship Type characteristics."""
    ship_type = inputs.get("Ship_Type", "Frigate")
    if ship_type not in SHIP_TYPES:
        logger.warning(f"Unknown Ship Type '{ship_type}'. Defaulting to 'Frigate'.")
        ship_type = "Frigate"
        inputs["Ship_Type"] = ship_type
        
    char = SHIP_CHARACTERISTICS[ship_type]
    
    # Define filled dictionary
    filled = {"Project_ID": inputs.get("Project_ID", "IN-PRJ-INFERENCE")}
    filled["Ship_Type"] = ship_type
    
    # 1. Ship Type-based defaults
    filled["Project_Cost"] = inputs.get("Project_Cost", char["cost_mode"])
    filled["Project_Size"] = inputs.get("Project_Size", char["size_mode"])
    filled["Planned_Duration"] = int(inputs.get("Planned_Duration", char["duration_mode"]))
    filled["Stakeholder_Count"] = int(inputs.get("Stakeholder_Count", int((char["stakeholder_min"] + char["stakeholder_max"]) / 2)))
    filled["Technical_Complexity"] = inputs.get("Technical_Complexity", char["complexity_mode"])
    filled["Technology_Maturity"] = inputs.get("Technology_Maturity", char["maturity_mode"])
    filled["Foreign_Dependency"] = bool(inputs.get("Foreign_Dependency", char["foreign_dep_prob"] >= 0.5))
    
    # 2. General defaults for other features
    for col, def_val in DEFAULT_PROJECT_VALS.items():
        if col not in filled:  # If not set by ship type above
            val = inputs.get(col, def_val)
            # Cast correct types
            if isinstance(def_val, int):
                filled[col] = int(val)
            elif isinstance(def_val, float):
                filled[col] = float(val)
            elif isinstance(def_val, bool):
                filled[col] = bool(val)
            else:
                filled[col] = val
                
    return filled

def predict_project_delays(project_inputs: Dict[str, Any]) -> Dict[str, Any]:
    """
    Predicts delay percentage, delay months, and risk category for a project input dictionary.
    """
    logger.info("Starting delay prediction for project...")
    
    # 1. Fill missing defaults
    full_inputs = fill_project_defaults(project_inputs)
    
    # Create single-row DataFrame
    df_raw = pd.DataFrame([full_inputs])
    
    # 2. Engineer features
    df_engineered = engineer_features(df_raw)
    
    # 3. Load ML pipeline
    preprocessor, reg_pct_model, reg_months_model, cls_model = load_inference_pipeline()
    
    # 4. Transform data
    X = preprocessor.transform(df_engineered)
    
    # 5. Predict
    pred_pct = reg_pct_model.predict(X)[0]
    pred_months = reg_months_model.predict(X)[0]
    
    # Get class predictions and probabilities
    pred_cls_idx = cls_model.predict(X)[0]
    pred_risk_tier = REVERSE_RISK_MAPPING[pred_cls_idx]
    
    try:
        pred_probs = cls_model.predict_proba(X)[0]
        confidence = float(pred_probs[pred_cls_idx])
    except Exception:
        confidence = 1.0 # fallback if probabilities are unavailable
        
    # Ensure physical consistency (delays cannot be negative)
    pred_pct = max(0.0, float(pred_pct))
    pred_months = max(0.0, float(pred_months))
    
    results = {
        "Project_ID": full_inputs["Project_ID"],
        "Ship_Type": full_inputs["Ship_Type"],
        "Predicted_Delay_Percentage": round(pred_pct, 2),
        "Predicted_Delay_Months": round(pred_months, 1),
        "Predicted_Risk_Category": pred_risk_tier,
        "Prediction_Confidence": round(confidence * 100.0, 1)
    }
    
    logger.info(f"Predictions obtained: Delay Pct: {pred_pct:.2f}%, Months: {pred_months:.1f}, Risk: {pred_risk_tier}")
    return results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Predict Ship Project Delay and Risk Category")
    parser.add_argument("--ship_type", type=str, default="Frigate", help="Ship type class")
    parser.add_argument("--cost", type=float, default=7500.0, help="Project cost in Crores")
    parser.add_argument("--duration", type=int, default=60, help="Planned duration in Months")
    parser.add_argument("--complexity", type=float, default=7.5, help="Technical Complexity (1.0 to 10.0)")
    parser.add_argument("--maturity", type=float, default=8.0, help="Technology Maturity (1.0 to 10.0)")
    parser.add_argument("--foreign_dep", type=bool, default=True, help="Foreign dependency (True/False)")
    parser.add_argument("--approval_delay", type=int, default=120, help="Approval delay in days")
    parser.add_argument("--vendor_delay", type=int, default=150, help="Vendor delay in days")
    parser.add_argument("--req_changes", type=int, default=8, help="Number of requirement changes")
    
    args = parser.parse_args()
    
    sample_input = {
        "Ship_Type": args.ship_type,
        "Project_Cost": args.cost,
        "Planned_Duration": args.duration,
        "Technical_Complexity": args.complexity,
        "Technology_Maturity": args.maturity,
        "Foreign_Dependency": args.foreign_dep,
        "Approval_Delay": args.approval_delay,
        "Vendor_Delay": args.vendor_delay,
        "Requirement_Changes": args.req_changes
    }
    
    prediction = predict_project_delays(sample_input)
    print("\n" + "="*50)
    print("           SHIP ACQUISITION DELAY PREDICTION")
    print("="*50)
    for k, v in prediction.items():
        print(f"{k:<30}: {v}")
    print("="*50 + "\n")
