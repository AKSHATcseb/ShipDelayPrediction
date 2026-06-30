"""
risk_classifier.py

This module contains the RiskClassifier class, which categorizes projects into risk categories
(Low, Medium, High, Critical) based on the calculated delay percentage.
"""

import pandas as pd
import numpy as np
from constants import RISK_LOW, RISK_MEDIUM, RISK_HIGH, RISK_CRITICAL
from logger import logger

class RiskClassifier:
    """Classifies project delay risks into categories based on delay percentages."""

    @staticmethod
    def classify_risk(delay_percentage: float) -> str:
        """Classifies a single delay percentage value into a risk tier."""
        if delay_percentage <= 20.0:
            return RISK_LOW
        elif delay_percentage <= 40.0:
            return RISK_MEDIUM
        elif delay_percentage <= 70.0:
            return RISK_HIGH
        else:
            return RISK_CRITICAL

    def apply_risk_classification(self, df: pd.DataFrame) -> pd.DataFrame:
        """Applies risk classification to the entire DataFrame."""
        logger.info("Applying risk classification to projects...")
        df = df.copy()
        
        df["Risk_Category"] = df["Delay_Percentage"].apply(self.classify_risk)
        
        # Log distribution
        dist = df["Risk_Category"].value_counts(normalize=True) * 100.0
        logger.info("Risk Category Distribution:")
        for cat, pct in dist.items():
            logger.info(f" - {cat}: {pct:.2f}%")
            
        return df
