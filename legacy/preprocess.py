"""
preprocess.py

This module contains the Preprocessor class, which handles data cleaning, scaling,
categorical encoding, outlier handling, and target variable formatting for both
model training and inference.
"""

import pandas as pd
import numpy as np
from typing import Tuple, Dict, Any, List
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from logger import logger

# Ordinal mapping for classification target
RISK_MAPPING = {
    "Low": 0,
    "Medium": 1,
    "High": 2,
    "Critical": 3
}
REVERSE_RISK_MAPPING = {v: k for k, v in RISK_MAPPING.items()}

from feature_engineering import get_engineered_feature_names

class Preprocessor:
    """Preprocesses ship acquisition data for machine learning models."""

    def __init__(self):
        self.scaler = StandardScaler()
        self.encoder = OneHotEncoder(handle_unknown='ignore', sparse_output=False)
        self.fitted = False
        
        # Categorical columns
        self.cat_cols = ["Ship_Type"]
        
        # Features that are boolean
        self.bool_cols = ["Foreign_Dependency"]
        
        # Numeric columns that will be scaled (excluding ID, categorical, boolean, and targets)
        self.num_cols = [
            "Project_Cost", "Project_Size", "Planned_Duration", "Stakeholder_Count",
            "Approval_Delay", "Tender_Delay", "Contract_Signing_Delay", "Funding_Delay",
            "Government_Clearance_Delay", "Vendor_Delay", "Vendor_Performance",
            "Imported_Equipment", "Material_Shortage", "Workforce_Shortage",
            "Requirement_Changes", "Design_Changes", "Documentation_Delay",
            "QA_Issues", "Inspection_Failures", "FAT_Failures", "SAT_Failures",
            "Construction_Delay", "Testing_Delay", "Weather_Impact", "Inflation_Impact",
            "Contract_Modifications", "Technical_Complexity", "Technology_Maturity",
            "Risk_Register_Open", "Historical_Vendor_Rating"
        ] + get_engineered_feature_names()
        
        self.feature_names_out: List[str] = []

    def fit(self, df: pd.DataFrame) -> 'Preprocessor':
        """Fits the scaler and encoder on the training dataset."""
        logger.info("Fitting Preprocessor on data...")
        
        # Fit scaler on numeric columns
        self.scaler.fit(df[self.num_cols])
        
        # Fit encoder on categorical columns
        self.encoder.fit(df[self.cat_cols])
        
        # Define output feature names list
        cat_feature_names = self.encoder.get_feature_names_out(self.cat_cols).tolist()
        self.feature_names_out = self.num_cols + self.bool_cols + cat_feature_names
        
        self.fitted = True
        logger.info(f"Preprocessor fitted. Total features output size: {len(self.feature_names_out)}")
        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """Transforms a DataFrame using the fitted preprocessor."""
        if not self.fitted:
            raise ValueError("Preprocessor has not been fitted yet. Please call fit() first.")
            
        # Scale numeric features
        scaled_num = self.scaler.transform(df[self.num_cols])
        
        # One-hot encode categorical features
        encoded_cat = self.encoder.transform(df[self.cat_cols])
        
        # Convert boolean columns to 0/1 float array
        bool_arr = df[self.bool_cols].astype(float).values
        
        # Concatenate all features
        X = np.hstack([scaled_num, bool_arr, encoded_cat])
        return X

    def fit_transform(self, df: pd.DataFrame) -> np.ndarray:
        """Fits on data and then transforms it."""
        return self.fit(df).transform(df)

    def extract_targets(self, df: pd.DataFrame) -> Dict[str, np.ndarray]:
        """Extracts the regression and classification targets from the dataset."""
        targets = {}
        
        if "Delay_Percentage" in df.columns:
            targets["Delay_Percentage"] = df["Delay_Percentage"].values
        if "Delay_Months" in df.columns:
            targets["Delay_Months"] = df["Delay_Months"].values
        if "Risk_Category" in df.columns:
            # Map risk categories to integers
            targets["Risk_Category"] = df["Risk_Category"].map(RISK_MAPPING).values
            
        return targets

    def handle_outliers(self, df: pd.DataFrame, columns: List[str] = None, quantile: float = 0.99) -> pd.DataFrame:
        """Clips outliers in numeric features to a specified quantile to avoid extreme leverage points."""
        logger.info(f"Handling outliers using {quantile} quantile clipping...")
        df_capped = df.copy()
        
        cols_to_cap = columns if columns else self.num_cols
        for col in cols_to_cap:
            upper_limit = df_capped[col].quantile(quantile)
            lower_limit = df_capped[col].quantile(1 - quantile)
            
            # For delay and count columns, lower limit is 0 anyway, but we check cost/size/complexity
            df_capped[col] = df_capped[col].clip(lower=lower_limit, upper=upper_limit)
            
        return df_capped
