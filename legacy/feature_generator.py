"""
feature_generator.py

This module generates baseline features for the synthetic ship acquisition dataset.
It uses appropriate statistical distributions conditioned on different ship types
to ensure realistic baseline values.
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List
from constants import SHIP_TYPES, SHIP_CHARACTERISTICS, FEATURES
from logger import logger

class FeatureGenerator:
    """Generates baseline features for ship acquisition projects."""

    def __init__(self, seed: int = 42):
        self.seed = seed
        np.random.seed(self.seed)

    def generate_base_features(self, num_samples: int) -> pd.DataFrame:
        """Generates raw baseline features before correlations are applied."""
        logger.info(f"Generating base features for {num_samples} projects...")
        
        # 1. Sample Ship Types using predefined weights
        ship_type_weights = {
            "Aircraft Carrier": 0.02,
            "Submarine": 0.06,
            "Destroyer": 0.10,
            "Frigate": 0.14,
            "Landing Platform Dock": 0.08,
            "Corvette": 0.14,
            "Fleet Support Ship": 0.10,
            "Mine Counter Measure Vessel": 0.10,
            "Offshore Patrol Vessel": 0.14,
            "Fast Attack Craft": 0.12
        }
        
        # Ensure weights sum to 1
        weights = [ship_type_weights[st] for st in SHIP_TYPES]
        weights = np.array(weights) / sum(weights)
        
        sampled_ship_types = np.random.choice(SHIP_TYPES, size=num_samples, p=weights)
        
        # Initialize lists for attributes
        project_ids = [f"IN-PRJ-{i+1:04d}" for i in range(num_samples)]
        costs = []
        sizes = []
        durations = []
        stakeholders = []
        complexities = []
        maturities = []
        foreign_dependencies = []
        
        # Generate attributes based on Ship Type characteristics
        for st in sampled_ship_types:
            char = SHIP_CHARACTERISTICS[st]
            
            # Triangular distributions for continuous variables
            cost = np.random.triangular(char["cost_min"], char["cost_mode"], char["cost_max"])
            size = np.random.triangular(char["size_min"], char["size_mode"], char["size_max"])
            complexity = np.random.triangular(char["complexity_min"], char["complexity_mode"], char["complexity_max"])
            maturity = np.random.triangular(char["maturity_min"], char["maturity_mode"], char["maturity_max"])
            
            # Duration (triangular, integer months)
            duration = int(round(np.random.triangular(char["duration_min"], char["duration_mode"], char["duration_max"])))
            
            # Stakeholder count (discrete uniform)
            stakeholder = int(np.random.randint(char["stakeholder_min"], char["stakeholder_max"] + 1))
            
            # Foreign dependency (Bernoulli/Binomial)
            foreign_dep = bool(np.random.binomial(1, char["foreign_dep_prob"]))
            
            costs.append(cost)
            sizes.append(size)
            durations.append(duration)
            stakeholders.append(stakeholder)
            complexities.append(complexity)
            maturities.append(maturity)
            foreign_dependencies.append(foreign_dep)
            
        # Create initial DataFrame
        df = pd.DataFrame({
            "Project_ID": project_ids,
            "Ship_Type": sampled_ship_types,
            "Project_Cost": costs,
            "Project_Size": sizes,
            "Planned_Duration": durations,
            "Stakeholder_Count": stakeholders,
            "Technical_Complexity": complexities,
            "Technology_Maturity": maturities,
            "Foreign_Dependency": foreign_dependencies
        })
        
        # Generate remaining baseline features
        # 2. Administrative delays (Poisson distributions in days)
        df["Approval_Delay"] = np.random.poisson(lam=8, size=num_samples)
        df["Tender_Delay"] = np.random.poisson(lam=10, size=num_samples)
        df["Contract_Signing_Delay"] = np.random.poisson(lam=12, size=num_samples)
        df["Funding_Delay"] = np.random.poisson(lam=6, size=num_samples)
        df["Government_Clearance_Delay"] = np.random.poisson(lam=8, size=num_samples)
        
        # 3. Procurement & Vendor parameters
        df["Vendor_Delay"] = np.random.poisson(lam=15, size=num_samples)
        # Vendor ratings/performances on scale 1 to 5 (Beta or Triangular distributions)
        df["Historical_Vendor_Rating"] = np.random.triangular(1.5, 3.8, 5.0, size=num_samples)
        df["Vendor_Performance"] = np.random.triangular(1.0, 3.5, 5.0, size=num_samples)
        
        # Imported equipment percentage (Beta distribution, scaled)
        df["Imported_Equipment"] = np.random.beta(a=2, b=5, size=num_samples) * 100.0
        
        # 4. Material and workforce shortage severity (scale 0-10)
        df["Material_Shortage"] = np.random.triangular(0, 2, 8, size=num_samples)
        df["Workforce_Shortage"] = np.random.triangular(0, 3, 9, size=num_samples)
        
        # 5. Project management & changes (Poisson counts)
        df["Requirement_Changes"] = np.random.poisson(lam=3, size=num_samples)
        df["Design_Changes"] = np.random.poisson(lam=2, size=num_samples)
        df["Documentation_Delay"] = np.random.poisson(lam=8, size=num_samples) # in days
        
        # 6. Quality & Failures (Poisson counts)
        df["QA_Issues"] = np.random.poisson(lam=2, size=num_samples)
        df["Inspection_Failures"] = np.random.poisson(lam=1, size=num_samples)
        df["FAT_Failures"] = np.random.poisson(lam=0.5, size=num_samples)
        df["SAT_Failures"] = np.random.poisson(lam=0.3, size=num_samples)
        
        # 7. Execution delays (Poisson in days)
        df["Construction_Delay"] = np.random.poisson(lam=35, size=num_samples)
        df["Testing_Delay"] = np.random.poisson(lam=15, size=num_samples)
        
        # 8. Environmental and contractual factors (Continuous / discrete)
        df["Weather_Impact"] = np.random.poisson(lam=6, size=num_samples)  # days of delay
        df["Inflation_Impact"] = np.random.poisson(lam=4, size=num_samples)  # cost/economic days delay
        df["Contract_Modifications"] = np.random.poisson(lam=2, size=num_samples)
        
        # 9. Risk register count
        df["Risk_Register_Open"] = np.random.poisson(lam=8, size=num_samples)
        
        logger.info("Base features generated successfully.")
        return df
