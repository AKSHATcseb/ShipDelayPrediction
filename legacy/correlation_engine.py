"""
correlation_engine.py

This module contains the CorrelationEngine class, which modifies the baseline generated
features to establish realistic, complex correlations, non-linear interactions,
and compounding risk chains. It also injects controlled stochastic noise.
"""

import numpy as np
import pandas as pd
from logger import logger

class CorrelationEngine:
    """Applies complex, non-linear correlations and dependency chains to raw features."""

    def __init__(self, seed: int = 42):
        self.seed = seed
        np.random.seed(self.seed)

    def apply_correlations(self, df: pd.DataFrame) -> pd.DataFrame:
        """Modifies DataFrame columns in-place or returns a copy with correlations applied."""
        logger.info("Applying correlations, non-linear effects, and noise...")
        # Ensure all integer columns are cast to int64 to avoid pandas 2.0+ setitem dtype conflicts on Windows
        for col in df.columns:
            if pd.api.types.is_integer_dtype(df[col]):
                df[col] = df[col].astype(np.int64)
                
        # --- 1. Project Size & Cost Influence ---
        # Large/expensive projects have more stakeholders, higher complexity, and longer durations
        size_factor = (df["Project_Size"] - df["Project_Size"].mean()) / df["Project_Size"].std()
        cost_factor = (df["Project_Cost"] - df["Project_Cost"].mean()) / df["Project_Cost"].std()
        size_cost_comb = (size_factor + cost_factor) / 2.0
        
        # Increase Stakeholder Count based on size/cost
        df["Stakeholder_Count"] = df["Stakeholder_Count"] + (size_cost_comb * 5.0).round().astype(int)
        df["Stakeholder_Count"] = df["Stakeholder_Count"].clip(lower=3)
        
        # More stakeholders lead to higher Approval Delay
        df["Approval_Delay"] = df["Approval_Delay"] + (df["Stakeholder_Count"] * 1.5).round().astype(int)
        
        # --- 2. Administrative Delay Chain ---
        # Approval Delay -> Tender Delay -> Contract Delay -> Funding Delay -> Vendor Delay -> Construction Delay
        df["Tender_Delay"] = df["Tender_Delay"] + (df["Approval_Delay"] * 0.25).round().astype(int)
        df["Contract_Signing_Delay"] = df["Contract_Signing_Delay"] + (df["Tender_Delay"] * 0.20).round().astype(int)
        df["Funding_Delay"] = df["Funding_Delay"] + (df["Contract_Signing_Delay"] * 0.15).round().astype(int)
        
        # --- 3. Requirement & Design Changes Chain ---
        # Requirement Changes -> Design Changes -> Documentation Delay -> QA Issues -> FAT Failure -> Testing Delay
        # Design changes follow requirements
        df["Design_Changes"] = df["Design_Changes"] + (df["Requirement_Changes"] * 0.6).round().astype(int)
        # Documentation delay is triggered by design changes
        df["Documentation_Delay"] = df["Documentation_Delay"] + (df["Design_Changes"] * 12).round().astype(int)
        # QA issues scale up with requirement changes and design changes
        df["QA_Issues"] = df["QA_Issues"] + (df["Requirement_Changes"] * 1.2 + df["Design_Changes"] * 0.8).round().astype(int)
        
        # Non-linear effect: Requirement Changes > 5 increases QA Issues quadratically
        req_threshold = df["Requirement_Changes"] > 5
        if req_threshold.any():
            df.loc[req_threshold, "QA_Issues"] = (
                df.loc[req_threshold, "QA_Issues"] + 
                (0.35 * (df.loc[req_threshold, "Requirement_Changes"] - 5) ** 2)
            ).round().astype(int)
            
        # FAT Failures scale with QA issues
        df["FAT_Failures"] = df["FAT_Failures"] + (df["QA_Issues"] * 0.25).round().astype(int)
        
        # --- 4. Foreign Dependency Chain ---
        # Foreign Dependency -> Vendor Delay -> Material Shortage -> Construction Delay
        # Adjust Imported Equipment percentage based on Foreign Dependency
        # If Foreign_Dependency is True, shift Imported_Equipment percentage upwards
        df.loc[df["Foreign_Dependency"] == True, "Imported_Equipment"] += np.random.uniform(20.0, 45.0, size=sum(df["Foreign_Dependency"]))
        df["Imported_Equipment"] = df["Imported_Equipment"].clip(upper=100.0)
        
        # Foreign dependency increases Vendor Delay
        df.loc[df["Foreign_Dependency"] == True, "Vendor_Delay"] += np.random.poisson(lam=50, size=sum(df["Foreign_Dependency"]))
        
        # Foreign dependency increases Material Shortage (due to imports, customs, etc.)
        df.loc[df["Foreign_Dependency"] == True, "Material_Shortage"] += np.random.uniform(1.5, 3.5, size=sum(df["Foreign_Dependency"]))
        df["Material_Shortage"] = df["Material_Shortage"].clip(upper=10.0)
        
        # Non-linear interaction: Approval Delay > 120 days AND Foreign Dependency = True increases Vendor Delay significantly
        complex_interact = (df["Approval_Delay"] > 120) & (df["Foreign_Dependency"] == True)
        if complex_interact.any():
            df.loc[complex_interact, "Vendor_Delay"] += np.random.poisson(lam=75, size=sum(complex_interact))

        # --- 5. Vendor Performance Chain ---
        # Vendor performance is negatively influenced by workforce / material shortages
        performance_penalty = (df["Material_Shortage"] * 0.15 + df["Workforce_Shortage"] * 0.15)
        df["Vendor_Performance"] = df["Vendor_Performance"] - performance_penalty
        
        # Vendor Performance also correlates with Historical Vendor Rating
        df["Vendor_Performance"] = df["Vendor_Performance"] * 0.6 + df["Historical_Vendor_Rating"] * 0.4
        df["Vendor_Performance"] = df["Vendor_Performance"].clip(1.0, 5.0)
        
        # Poor Vendor Performance (rating < 3.0) -> Vendor Delay -> QA Issues -> Inspection Failures
        poor_vendor = df["Vendor_Performance"] < 3.0
        if poor_vendor.any():
            df.loc[poor_vendor, "Vendor_Delay"] += ((3.0 - df.loc[poor_vendor, "Vendor_Performance"]) * 40).round().astype(int)
            df.loc[poor_vendor, "QA_Issues"] += ((3.0 - df.loc[poor_vendor, "Vendor_Performance"]) * 2.5).round().astype(int)
            
        df["Inspection_Failures"] = df["Inspection_Failures"] + (df["QA_Issues"] * 0.35).round().astype(int)
        
        # --- 6. Complexity Impact ---
        # Higher Technical Complexity -> Inspection Failure -> Testing Delay -> Final Delay
        # Technical complexity directly inflates QA issues and risk register
        df["Risk_Register_Open"] = df["Risk_Register_Open"] + (df["Technical_Complexity"] * 1.5).round().astype(int)
        
        # Inspection failures scale with Technical Complexity
        df["Inspection_Failures"] = df["Inspection_Failures"] + (df["Technical_Complexity"] * 0.5).round().astype(int)
        
        # Non-linear effect: Technical Complexity > 8 sharply increases FAT and SAT failures
        high_complexity = df["Technical_Complexity"] > 8.0
        if high_complexity.any():
            df.loc[high_complexity, "FAT_Failures"] = (df.loc[high_complexity, "FAT_Failures"] * 1.8).round().astype(int)
            df.loc[high_complexity, "SAT_Failures"] = (df.loc[high_complexity, "SAT_Failures"] * 1.8).round().astype(int)
            
        # SAT Failures are influenced by FAT Failures and Complexity
        df["SAT_Failures"] = df["SAT_Failures"] + (df["FAT_Failures"] * 0.4).round().astype(int)
        
        # --- 7. Final Stage Delay Inflation ---
        # Construction Delay is influenced by:
        # Vendor Delay, Material Shortage, Workforce Shortage, Design Changes, Contract Modifications
        df["Construction_Delay"] = (
            df["Construction_Delay"] +
            (df["Vendor_Delay"] * 0.15) +
            (df["Material_Shortage"] * 4.0) +
            (df["Workforce_Shortage"] * 3.5) +
            (df["Design_Changes"] * 6.0) +
            (df["Contract_Modifications"] * 5.0)
        ).round().astype(int)
        
        # Testing Delay is influenced by complexity, maturity, inspection failures, and FAT/SAT failures
        # Low technology maturity increases testing delay
        maturity_penalty = (10.0 - df["Technology_Maturity"]) * 2.5
        df["Testing_Delay"] = (
            df["Testing_Delay"] +
            (df["Technical_Complexity"] * 3.0) +
            maturity_penalty +
            (df["Inspection_Failures"] * 3.0) +
            (df["FAT_Failures"] * 5.0) +
            (df["SAT_Failures"] * 8.0)
        ).round().astype(int)
        
        # --- 8. Inject Stochastic Noise (5-10%) ---
        # We inject normal noise to all continuous and delay variables to prevent perfect collinearity
        cols_to_noise = [
            "Project_Cost", "Project_Size", "Technical_Complexity", "Technology_Maturity", 
            "Approval_Delay", "Tender_Delay", "Contract_Signing_Delay", "Funding_Delay",
            "Government_Clearance_Delay", "Vendor_Delay", "Documentation_Delay", 
            "Construction_Delay", "Testing_Delay", "Weather_Impact", "Inflation_Impact"
        ]
        
        for col in cols_to_noise:
            # Generate 5-10% standard deviation relative noise
            noise_std = df[col].std() * np.random.uniform(0.05, 0.10)
            noise = np.random.normal(0, noise_std, size=len(df))
            df[col] = df[col] + noise
            
            # Ensure delay values do not drop below zero
            if col not in ["Project_Cost", "Project_Size", "Technical_Complexity", "Technology_Maturity"]:
                df[col] = df[col].apply(lambda x: max(0.0, round(x)))
            else:
                # Clip variables to reasonable range
                if col in ["Technical_Complexity", "Technology_Maturity"]:
                    df[col] = df[col].clip(1.0, 10.0)
                else:
                    df[col] = df[col].clip(lower=0.1)
                    
        logger.info("Correlations and non-linear effects successfully applied.")
        return df
