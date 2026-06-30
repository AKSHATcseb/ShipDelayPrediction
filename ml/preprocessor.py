"""
Preprocessor.
Handles feature scaling, category encoding, and target extraction.
"""

import numpy as np
import pandas as pd
from typing import Tuple
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer

from ml.constants import ML_FEATURE_NAMES

class Preprocessor:
    def __init__(self):
        self.num_cols = [c for c in ML_FEATURE_NAMES if c not in ["ship_type", "foreign_dependency"]]
        self.cat_cols = ["ship_type"]
        self.preprocessor = None

    def fit(self, df: pd.DataFrame) -> "Preprocessor":
        """Fits the scaling and encoding transforms on training data."""
        self.preprocessor = ColumnTransformer(
            transformers=[
                ("num", StandardScaler(), self.num_cols),
                ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), self.cat_cols)
            ],
            remainder="passthrough" # Keep boolean foreign_dependency column intact
        )
        # Drop target columns to prevent leakage during fit
        feature_df = df[ML_FEATURE_NAMES]
        self.preprocessor.fit(feature_df)
        return self

    def transform(self, df: pd.DataFrame) -> np.ndarray:
        """Transforms input DataFrame into scaled/encoded NumPy array."""
        feature_df = df[ML_FEATURE_NAMES]
        return self.preprocessor.transform(feature_df)

    def fit_transform(self, df: pd.DataFrame) -> np.ndarray:
        """Fits and transforms training data."""
        self.fit(df)
        return self.transform(df)

    @staticmethod
    def extract_targets(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Extracts targets from dataset: delay percentage, delay months, and risk category."""
        y_pct = df["target_delay_percentage"].to_numpy().astype(np.float64)
        y_months = df["target_delay_months"].to_numpy().astype(np.float64)
        y_risk = df["target_risk_category"].to_numpy().astype(np.int64)
        return y_pct, y_months, y_risk
