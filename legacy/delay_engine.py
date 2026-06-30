"""
delay_engine.py

This module contains the DelayEngine class, which implements a hierarchical delay
propagation model. The project's final delay is computed by aggregating delays across
multiple stages (Administrative, Procurement, Construction, Testing, and Acceptance/Delivery).
"""

import pandas as pd
import numpy as np
from logger import logger

class DelayEngine:
    """Computes project delays using a hierarchical propagation model."""

    def __init__(self, seed: int = 42):
        self.seed = seed
        np.random.seed(self.seed)

    def calculate_delays(self, df: pd.DataFrame) -> pd.DataFrame:
        """Computes stage-wise delays, aggregated delay in months, and delay percentage."""
        logger.info("Computing hierarchical delay propagation...")
        df = df.copy()
        
        # 1. Administrative Stage Delay (days)
        # Sum of approval, tender, contract signing, funding, and government clearance delays
        admin_delay = (
            df["Approval_Delay"] + 
            df["Tender_Delay"] + 
            df["Contract_Signing_Delay"] + 
            df["Funding_Delay"] + 
            df["Government_Clearance_Delay"]
        )
        
        # 2. Procurement Stage Delay (days)
        # Influenced by vendor delay, documentation delay, and imported equipment complexities
        procurement_delay = (
            df["Vendor_Delay"] + 
            (df["Documentation_Delay"] * 0.40) +
            (df["Imported_Equipment"] * 0.5)
        )
        
        # 3. Construction Stage Delay (days)
        # Aggregates construction delay, weather impacts, inflation impacts
        construction_delay = (
            df["Construction_Delay"] + 
            df["Weather_Impact"] + 
            df["Inflation_Impact"]
        )
        
        # 4. Testing & Evaluation Stage Delay (days)
        # Aggregates testing delay, documentation (remaining 60%), and technical complexity impacts
        testing_delay = (
            df["Testing_Delay"] + 
            (df["Documentation_Delay"] * 0.60)
        )
        
        # 5. Acceptance & Delivery Stage Delay (days)
        # Emerges from inspection failures, FAT failures, SAT failures, and stakeholder approvals
        acceptance_delay = (
            (df["Inspection_Failures"] * 8.0) +
            (df["FAT_Failures"] * 15.0) +
            (df["SAT_Failures"] * 25.0) +
            (df["Stakeholder_Count"] * 2.0)
        )
        
        # 6. Accumulate to get total delay in days
        total_delay_days = (
            admin_delay + 
            procurement_delay + 
            construction_delay + 
            testing_delay + 
            acceptance_delay
        )
        
        # Convert total delay in days to months (assume 30 days = 1 month)
        delay_months = total_delay_days / 30.0
        
        # Convert to delay percentage relative to Planned_Duration
        # Delay_Percentage = (Delay_Months / Planned_Duration) * 100
        delay_percentage = (delay_months / df["Planned_Duration"]) * 100.0
        
        # Write to DataFrame
        df["Delay_Months"] = np.round(delay_months, 2)
        df["Delay_Percentage"] = np.round(delay_percentage, 2)
        
        logger.info(f"Delays calculated. Mean delay: {df['Delay_Months'].mean():.2f} months. Mean percentage: {df['Delay_Percentage'].mean():.2f}%")
        return df
