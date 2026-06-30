"""
dataset_validator.py

This module contains the DatasetValidator class, which validates the generated dataset.
It verifies types, ranges, non-negativity, checks for duplicates and nulls,
and applies automatic repairs to ensure data integrity before model training.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple
from logger import logger
from constants import FEATURES, RISK_LOW, RISK_MEDIUM, RISK_HIGH, RISK_CRITICAL

class DatasetValidator:
    """Validates and repairs ship delay prediction datasets."""

    def __init__(self):
        # Define ranges for numerical variables
        self.expected_ranges = {
            "Project_Cost": (10.0, 100000.0), # In Crores
            "Project_Size": (0.05, 100.0),    # Tonnage / 1000
            "Planned_Duration": (6, 240),      # Months
            "Stakeholder_Count": (2, 100),
            "Technical_Complexity": (1.0, 10.0),
            "Technology_Maturity": (1.0, 10.0),
            "Historical_Vendor_Rating": (1.0, 5.0),
            "Vendor_Performance": (1.0, 5.0),
            "Imported_Equipment": (0.0, 100.0),
            "Material_Shortage": (0.0, 10.0),
            "Workforce_Shortage": (0.0, 10.0)
        }

    def validate(self, df: pd.DataFrame, repair: bool = True) -> Tuple[pd.DataFrame, bool]:
        """
        Validates the dataset. If repair=True, attempts to fix correctable errors.
        Returns a tuple of (validated_df, is_valid).
        """
        logger.info("Starting dataset validation...")
        df_clean = df.copy()
        errors_found = False
        
        # 1. Check for expected columns
        missing_cols = [col for col in FEATURES if col not in df_clean.columns]
        if missing_cols:
            logger.error(f"Validation Error: Missing columns: {missing_cols}")
            return df_clean, False

        # 2. Check for missing values
        null_counts = df_clean.isnull().sum()
        cols_with_nulls = null_counts[null_counts > 0]
        if not cols_with_nulls.empty:
            errors_found = True
            logger.warning(f"Validation Warning: Missing values detected:\n{cols_with_nulls}")
            if repair:
                logger.info("Repairing missing values (imputing modes/means)...")
                for col in cols_with_nulls.index:
                    if df_clean[col].dtype == 'object':
                        mode_val = df_clean[col].mode()[0]
                        df_clean[col] = df_clean[col].fillna(mode_val)
                    else:
                        mean_val = df_clean[col].mean()
                        df_clean[col] = df_clean[col].fillna(mean_val)

        # 3. Check for duplicate Project_IDs
        dup_count = df_clean["Project_ID"].duplicated().sum()
        if dup_count > 0:
            errors_found = True
            logger.warning(f"Validation Warning: Found {dup_count} duplicate Project_IDs.")
            if repair:
                logger.info("Repairing duplicate Project_IDs by generating unique IDs...")
                df_clean["Project_ID"] = [f"IN-PRJ-{i+1:04d}" for i in range(len(df_clean))]

        # 4. Check data types and force casting
        try:
            df_clean["Project_ID"] = df_clean["Project_ID"].astype(str)
            df_clean["Ship_Type"] = df_clean["Ship_Type"].astype(str)
            df_clean["Risk_Category"] = df_clean["Risk_Category"].astype(str)
            df_clean["Foreign_Dependency"] = df_clean["Foreign_Dependency"].astype(bool)
            
            # Numeric columns
            float_cols = ["Project_Cost", "Project_Size", "Technical_Complexity", 
                          "Technology_Maturity", "Historical_Vendor_Rating", 
                          "Vendor_Performance", "Imported_Equipment", 
                          "Material_Shortage", "Workforce_Shortage", 
                          "Delay_Percentage", "Delay_Months"]
            for col in float_cols:
                df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce').astype(float)
                
            # Integer columns
            int_cols = [
                "Planned_Duration", "Stakeholder_Count", "Approval_Delay", "Tender_Delay",
                "Contract_Signing_Delay", "Funding_Delay", "Government_Clearance_Delay",
                "Vendor_Delay", "Requirement_Changes", "Design_Changes", "Documentation_Delay",
                "QA_Issues", "Inspection_Failures", "FAT_Failures", "SAT_Failures",
                "Construction_Delay", "Testing_Delay", "Weather_Impact", "Inflation_Impact",
                "Contract_Modifications", "Risk_Register_Open"
            ]
            for col in int_cols:
                # Fill na values from coercion with 0 before casting to int
                df_clean[col] = pd.to_numeric(df_clean[col], errors='coerce').fillna(0).round().astype(int)
        except Exception as e:
            logger.error(f"Validation Error during type casting: {e}")
            return df_clean, False

        # 5. Check and repair non-negativity for delay-related features
        non_negative_cols = [
            "Project_Cost", "Project_Size", "Planned_Duration", "Stakeholder_Count",
            "Approval_Delay", "Tender_Delay", "Contract_Signing_Delay", "Funding_Delay",
            "Government_Clearance_Delay", "Vendor_Delay", "Requirement_Changes", 
            "Design_Changes", "Documentation_Delay", "QA_Issues", "Inspection_Failures", 
            "FAT_Failures", "SAT_Failures", "Construction_Delay", "Testing_Delay", 
            "Weather_Impact", "Inflation_Impact", "Contract_Modifications", 
            "Risk_Register_Open", "Delay_Percentage", "Delay_Months"
        ]
        
        for col in non_negative_cols:
            neg_mask = df_clean[col] < 0
            if neg_mask.any():
                errors_found = True
                logger.warning(f"Validation Warning: Found negative values in {col}.")
                if repair:
                    logger.info(f"Repairing negative values in {col} (clipping to 0 or min allowable)...")
                    min_val = 1 if col in ["Planned_Duration", "Stakeholder_Count"] else 0
                    df_clean[col] = df_clean[col].clip(lower=min_val)

        # 6. Validate expected ranges and clamp values
        for col, (min_val, max_val) in self.expected_ranges.items():
            out_of_bounds = (df_clean[col] < min_val) | (df_clean[col] > max_val)
            if out_of_bounds.any():
                errors_found = True
                logger.warning(f"Validation Warning: Values out of bounds in {col} (Expected [{min_val}, {max_val}]).")
                if repair:
                    logger.info(f"Repairing out of bounds values in {col} by clipping...")
                    df_clean[col] = df_clean[col].clip(min_val, max_val)

        # 7. Check category integrity
        valid_risk_categories = {RISK_LOW, RISK_MEDIUM, RISK_HIGH, RISK_CRITICAL}
        invalid_risk = ~df_clean["Risk_Category"].isin(valid_risk_categories)
        if invalid_risk.any():
            errors_found = True
            logger.warning("Validation Warning: Invalid Risk_Category values detected.")
            if repair:
                logger.info("Recalculating Risk_Category values based on Delay_Percentage...")
                from risk_classifier import RiskClassifier
                df_clean["Risk_Category"] = df_clean["Delay_Percentage"].apply(RiskClassifier.classify_risk)

        logger.info(f"Validation completed. Repairs applied: {repair}. Errors found: {errors_found}")
        return df_clean, not errors_found
