"""
constants.py

This module contains all constant definitions, project settings, ship types characteristics,
and target columns used across the synthetic dataset generator and machine learning pipeline.
"""

# List of Ship Types to generate
SHIP_TYPES = [
    "Destroyer",
    "Frigate",
    "Corvette",
    "Submarine",
    "Aircraft Carrier",
    "Landing Platform Dock",
    "Fleet Support Ship",
    "Fast Attack Craft",
    "Mine Counter Measure Vessel",
    "Offshore Patrol Vessel"
]

# Baseline characteristics for each Ship Type.
# These values act as parameters for generating distributions.
# Cost is in Crores (INR), Duration is in Months, Size is Tonnage / 1000,
# Technical Complexity (1-10), Technology Maturity (1-10),
# Foreign Dependency (0-1), Stakeholder Count (int).
SHIP_CHARACTERISTICS = {
    "Aircraft Carrier": {
        "cost_min": 25000.0, "cost_max": 50000.0, "cost_mode": 35000.0,
        "duration_min": 84, "duration_max": 144, "duration_mode": 120,
        "size_min": 35.0, "size_max": 45.0, "size_mode": 40.0,
        "complexity_min": 8.0, "complexity_max": 10.0, "complexity_mode": 9.5,
        "maturity_min": 3.0, "maturity_max": 7.0, "maturity_mode": 5.0,
        "foreign_dep_prob": 0.85, "stakeholder_min": 35, "stakeholder_max": 60
    },
    "Submarine": {
        "cost_min": 15000.0, "cost_max": 30000.0, "cost_mode": 22000.0,
        "duration_min": 72, "duration_max": 120, "duration_mode": 96,
        "size_min": 2.0, "size_max": 4.5, "size_mode": 3.2,
        "complexity_min": 8.5, "complexity_max": 10.0, "complexity_mode": 9.2,
        "maturity_min": 4.0, "maturity_max": 8.0, "maturity_mode": 6.0,
        "foreign_dep_prob": 0.75, "stakeholder_min": 20, "stakeholder_max": 40
    },
    "Destroyer": {
        "cost_min": 8000.0, "cost_max": 18000.0, "cost_mode": 12000.0,
        "duration_min": 60, "duration_max": 96, "duration_mode": 72,
        "size_min": 6.0, "size_max": 8.5, "size_mode": 7.2,
        "complexity_min": 7.0, "complexity_max": 9.0, "complexity_mode": 8.0,
        "maturity_min": 5.0, "maturity_max": 8.5, "maturity_mode": 7.0,
        "foreign_dep_prob": 0.60, "stakeholder_min": 15, "stakeholder_max": 30
    },
    "Frigate": {
        "cost_min": 5000.0, "cost_max": 10000.0, "cost_mode": 7500.0,
        "duration_min": 48, "duration_max": 84, "duration_mode": 60,
        "size_min": 3.5, "size_max": 6.5, "size_mode": 5.0,
        "complexity_min": 6.0, "complexity_max": 8.0, "complexity_mode": 7.0,
        "maturity_min": 6.0, "maturity_max": 9.0, "maturity_mode": 7.5,
        "foreign_dep_prob": 0.50, "stakeholder_min": 12, "stakeholder_max": 25
    },
    "Landing Platform Dock": {
        "cost_min": 4000.0, "cost_max": 8000.0, "cost_mode": 6000.0,
        "duration_min": 48, "duration_max": 84, "duration_mode": 60,
        "size_min": 15.0, "size_max": 25.0, "size_mode": 20.0,
        "complexity_min": 5.0, "complexity_max": 7.0, "complexity_mode": 6.0,
        "maturity_min": 6.0, "maturity_max": 9.0, "maturity_mode": 8.0,
        "foreign_dep_prob": 0.40, "stakeholder_min": 15, "stakeholder_max": 25
    },
    "Corvette": {
        "cost_min": 15000.0 / 10.0, "cost_max": 35000.0 / 10.0, "cost_mode": 25000.0 / 10.0, # 1500 to 3500 Cr
        "duration_min": 36, "duration_max": 60, "duration_mode": 48,
        "size_min": 1.2, "size_max": 2.5, "size_mode": 1.8,
        "complexity_min": 4.5, "complexity_max": 6.5, "complexity_mode": 5.5,
        "maturity_min": 7.0, "maturity_max": 9.5, "maturity_mode": 8.5,
        "foreign_dep_prob": 0.30, "stakeholder_min": 10, "stakeholder_max": 20
    },
    "Fleet Support Ship": {
        "cost_min": 2000.0, "cost_max": 4500.0, "cost_mode": 3000.0,
        "duration_min": 36, "duration_max": 72, "duration_mode": 54,
        "size_min": 20.0, "size_max": 40.0, "size_mode": 30.0,
        "complexity_min": 3.0, "complexity_max": 5.5, "complexity_mode": 4.0,
        "maturity_min": 7.0, "maturity_max": 9.5, "maturity_mode": 8.5,
        "foreign_dep_prob": 0.20, "stakeholder_min": 10, "stakeholder_max": 20
    },
    "Mine Counter Measure Vessel": {
        "cost_min": 1000.0, "cost_max": 3000.0, "cost_mode": 1800.0,
        "duration_min": 36, "duration_max": 72, "duration_mode": 48,
        "size_min": 0.8, "size_max": 1.5, "size_mode": 1.0,
        "complexity_min": 5.0, "complexity_max": 7.5, "complexity_mode": 6.0,
        "maturity_min": 5.0, "maturity_max": 8.0, "maturity_mode": 6.5,
        "foreign_dep_prob": 0.65, "stakeholder_min": 8, "stakeholder_max": 18
    },
    "Offshore Patrol Vessel": {
        "cost_min": 500.0, "cost_max": 1500.0, "cost_mode": 800.0,
        "duration_min": 24, "duration_max": 48, "duration_mode": 36,
        "size_min": 1.0, "size_max": 2.2, "size_mode": 1.5,
        "complexity_min": 2.5, "complexity_max": 4.5, "complexity_mode": 3.5,
        "maturity_min": 8.0, "maturity_max": 10.0, "maturity_mode": 9.0,
        "foreign_dep_prob": 0.15, "stakeholder_min": 6, "stakeholder_max": 12
    },
    "Fast Attack Craft": {
        "cost_min": 100.0, "cost_max": 400.0, "cost_mode": 200.0,
        "duration_min": 18, "duration_max": 36, "duration_mode": 24,
        "size_min": 0.2, "size_max": 0.6, "size_mode": 0.4,
        "complexity_min": 2.0, "complexity_max": 4.0, "complexity_mode": 3.0,
        "maturity_min": 8.5, "maturity_max": 10.0, "maturity_mode": 9.5,
        "foreign_dep_prob": 0.10, "stakeholder_min": 4, "stakeholder_max": 10
    }
}

# Features present in the dataset
FEATURES = [
    "Project_ID",
    "Ship_Type",
    "Project_Cost",
    "Project_Size",
    "Planned_Duration",
    "Stakeholder_Count",
    "Approval_Delay",
    "Tender_Delay",
    "Contract_Signing_Delay",
    "Funding_Delay",
    "Government_Clearance_Delay",
    "Vendor_Delay",
    "Vendor_Performance",
    "Foreign_Dependency",
    "Imported_Equipment",
    "Material_Shortage",
    "Workforce_Shortage",
    "Requirement_Changes",
    "Design_Changes",
    "Documentation_Delay",
    "QA_Issues",
    "Inspection_Failures",
    "FAT_Failures",
    "SAT_Failures",
    "Construction_Delay",
    "Testing_Delay",
    "Weather_Impact",
    "Inflation_Impact",
    "Contract_Modifications",
    "Technical_Complexity",
    "Technology_Maturity",
    "Risk_Register_Open",
    "Historical_Vendor_Rating",
    "Delay_Percentage",
    "Delay_Months",
    "Risk_Category"
]

# Risk Categories and thresholds
RISK_LOW = "Low"
RISK_MEDIUM = "Medium"
RISK_HIGH = "High"
RISK_CRITICAL = "Critical"

RISK_THRESHOLDS = {
    RISK_LOW: (0.0, 20.0),
    RISK_MEDIUM: (20.0, 40.0),
    RISK_HIGH: (40.0, 70.0),
    RISK_CRITICAL: (70.0, float('inf'))
}

# Seed for reproducibility
DEFAULT_RANDOM_SEED = 42
