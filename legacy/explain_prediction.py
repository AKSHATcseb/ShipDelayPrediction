"""
explain_prediction.py

Provides explainability for specific project predictions.
Identifies the top contributing risk features using instance deviation and model weights,
and runs a rule-based PMG (Project Management Group) recommendation engine
to provide PMG mitigation actions.
"""

from typing import Dict, Any, List
import pandas as pd
import numpy as np
from logger import logger
from predict import DEFAULT_PROJECT_VALS, fill_project_defaults
from load_model import load_model_artifact
from constants import SHIP_CHARACTERISTICS

# Define PMG Recommendation Rules
PMG_RECOMMENDATION_RULES = [
    {
        "condition": lambda inputs, pred: inputs.get("Approval_Delay", 0) > 90,
        "recommendation": "Escalate approval process: Establish a dedicated fast-track clearance desk to clear administrative bottlenecks.",
        "category": "Administrative"
    },
    {
        "condition": lambda inputs, pred: inputs.get("Tender_Delay", 0) > 90,
        "recommendation": "Streamline RFP process: Formulate standardized RFP templates and pre-qualify vendors to reduce tendering cycle times.",
        "category": "Procurement"
    },
    {
        "condition": lambda inputs, pred: inputs.get("Vendor_Performance", 5.0) < 3.2,
        "recommendation": "Increase vendor monitoring: Deploy on-site Quality Assurance teams at vendor facilities and hold weekly progress reviews.",
        "category": "Vendor Management"
    },
    {
        "condition": lambda inputs, pred: inputs.get("Requirement_Changes", 0) > 4,
        "recommendation": "Freeze design baseline: Implement a strict Configuration Control Board (CCB) and halt requirement additions for this phase.",
        "category": "Scope Control"
    },
    {
        "condition": lambda inputs, pred: inputs.get("QA_Issues", 0) > 5 or inputs.get("Inspection_Failures", 0) > 2,
        "recommendation": "Increase inspection frequency: Enhance pre-inspection quality control checklist and implement mock trials prior to formal audits.",
        "category": "Quality Assurance"
    },
    {
        "condition": lambda inputs, pred: inputs.get("Foreign_Dependency", False) is True,
        "recommendation": "Import mitigation: Establish parallel indigenous sourcing research and procure long-lead imported items early with buffer stocks.",
        "category": "Supply Chain"
    },
    {
        "condition": lambda inputs, pred: inputs.get("Technical_Complexity", 0) > 7.5,
        "recommendation": "Enhance technical supervision: Set up a Joint Technical Committee with academic/defense R&D experts to oversee complex system integration.",
        "category": "Technical Risk"
    },
    {
        "condition": lambda inputs, pred: inputs.get("Technology_Maturity", 10.0) < 6.0,
        "recommendation": "Technology de-risking: Conduct extensive prototyping and scale up testing in simulated environments before final assembly.",
        "category": "Technology Risk"
    },
    {
        "condition": lambda inputs, pred: inputs.get("FAT_Failures", 0) > 1 or inputs.get("SAT_Failures", 0) > 1,
        "recommendation": "Rigorous internal pre-trials: Standardize factory testing procedures and verify integration specs before calling official acceptance trials.",
        "category": "Acceptance Trials"
    },
    {
        "condition": lambda inputs, pred: pred.get("Predicted_Risk_Category", "") in ["High", "Critical"],
        "recommendation": "PMG Tier-2 review: Escalate the project status to Ministry of Defense / PMG Cabinet-level steering committee for resource injection.",
        "category": "Governance"
    }
]

def explain_prediction_details(
    project_inputs: Dict[str, Any], 
    prediction_results: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Explains the prediction by identifying the top drivers for delay.
    Uses instance-level feature deviation from normal baselines combined with model feature importance.
    """
    logger.info("Explaining prediction using feature deviation and model weights...")
    
    # Fill in input defaults to ensure we have values for all features
    full_inputs = fill_project_defaults(project_inputs)
    
    # 1. Load best model to get feature importances
    try:
        best_reg = load_model_artifact("best_regression_model")
        preprocessor = load_model_artifact("preprocessor")
        
        # Extract features and importances
        feature_names = preprocessor.feature_names_out
        
        if hasattr(best_reg, "feature_importances_"):
            importances = best_reg.feature_importances_
        else:
            # Fallback uniform importances if model doesn't support them
            importances = np.ones(len(feature_names)) / len(feature_names)
            
        feature_imp_map = dict(zip(feature_names, importances))
    except Exception as e:
        logger.warning(f"Could not load feature importances from model: {e}. Using fallback explanation.")
        feature_imp_map = {}
        
    # 2. Compute deviation from standard defaults
    # Features that increase delay risk when they are HIGH: delays, changes, complexity, foreign dep
    # Features that increase delay risk when they are LOW: performance, maturity, ratings
    risk_drivers = []
    
    for key, val in full_inputs.items():
        if key in ["Project_ID", "Ship_Type"]:
            continue
            
        # Get baseline default value
        default_val = DEFAULT_PROJECT_VALS.get(key, None)
        if default_val is None:
            # Check ship type specific defaults
            char = SHIP_CHARACTERISTICS.get(full_inputs["Ship_Type"], {})
            if key == "Project_Cost":
                default_val = char.get("cost_mode", 1000)
            elif key == "Planned_Duration":
                default_val = char.get("duration_mode", 36)
            elif key == "Project_Size":
                default_val = char.get("size_mode", 2.0)
            elif key == "Technical_Complexity":
                default_val = char.get("complexity_mode", 5.0)
            elif key == "Technology_Maturity":
                default_val = char.get("maturity_mode", 8.0)
            elif key == "Foreign_Dependency":
                default_val = char.get("foreign_dep_prob", 0.5)
            else:
                default_val = 0.0
                
        # Calculate risk impact score based on deviation
        importance_weight = feature_imp_map.get(key, 0.02) # Default small weight
        
        # Check direction of risk
        deviation = 0.0
        is_risk_driver = False
        
        # Low is risky
        if key in ["Vendor_Performance", "Technology_Maturity", "Historical_Vendor_Rating"]:
            if float(val) < float(default_val):
                # How much lower?
                deviation = (float(default_val) - float(val)) / float(default_val)
                is_risk_driver = True
        # High is risky
        elif isinstance(val, (int, float)):
            if float(val) > float(default_val):
                # How much higher?
                denom = float(default_val) if float(default_val) > 0 else 1.0
                deviation = (float(val) - float(default_val)) / denom
                is_risk_driver = True
        # Boolean Foreign Dependency
        elif isinstance(val, bool):
            if val is True and default_val is False:
                deviation = 1.0
                is_risk_driver = True
                
        if is_risk_driver and deviation > 0.05:
            # Score is deviation multiplied by model importance weight
            risk_score = deviation * importance_weight
            risk_drivers.append({
                "feature": key,
                "value": val,
                "baseline": default_val,
                "deviation_pct": round(deviation * 100.0, 1),
                "importance_weight": round(importance_weight, 4),
                "risk_score": risk_score
            })
            
    # Sort risk drivers by risk score descending
    risk_drivers.sort(key=lambda x: x["risk_score"], reverse=True)
    top_drivers = risk_drivers[:5] # Keep top 5
    
    # 3. Generate PMG Recommendations based on rules
    recommendations = []
    for rule in PMG_RECOMMENDATION_RULES:
        if rule["condition"](full_inputs, prediction_results):
            recommendations.append({
                "category": rule["category"],
                "recommendation": rule["recommendation"]
            })
            
    # Fallback default recommendation if none triggered
    if not recommendations:
        recommendations.append({
            "category": "General",
            "recommendation": "Maintain standard project management milestones and perform regular review meetings."
        })
        
    explanation = {
        "Project_ID": prediction_results["Project_ID"],
        "Risk_Category": prediction_results["Predicted_Risk_Category"],
        "Top_Risk_Drivers": top_drivers,
        "PMG_Recommendations": recommendations
    }
    
    logger.info(f"Explanation generated with {len(top_drivers)} risk drivers and {len(recommendations)} recommendations.")
    return explanation

def print_explanation_report(explanation: Dict[str, Any]) -> None:
    """Prints a beautiful summary report of the predictions and explanations."""
    print("\n" + "="*60)
    print("        PROJECT MANAGEMENT GROUP (PMG) RISK EXPLANATION REPORT")
    print("="*60)
    print(f"Project ID    : {explanation['Project_ID']}")
    print(f"Risk Category : {explanation['Risk_Category']}")
    print("-"*60)
    print("TOP DELAY RISK FACTORS:")
    
    for idx, driver in enumerate(explanation["Top_Risk_Drivers"]):
        print(f" {idx+1}. {driver['feature'].replace('_', ' '):<25} | Value: {driver['value']} (Baseline: {driver['baseline']}) | Deviation: +{driver['deviation_pct']}%")
        
    print("-"*60)
    print("RECOMMENDED PMG MITIGATION ACTIONS:")
    for idx, rec in enumerate(explanation["PMG_Recommendations"]):
        print(f" [{rec['category']}] -> {rec['recommendation']}")
    print("="*60 + "\n")
