"""
Domain constants for activity-level delay risk predictions.
"""

# 8 Core Activity Categories
ACTIVITY_CATEGORIES = [
    "Administrative",
    "Technical",
    "Procurement",
    "Construction",
    "Inspection",
    "Testing",
    "Delivery",
    "Documentation"
]

# Risk Thresholds
RISK_THRESHOLDS = {
    "Low": 20.0,
    "Medium": 40.0,
    "High": 70.0,
    "Critical": 100.0
}

# 10 Indian Navy Vessel Classes
SHIP_TYPES = [
    "Destroyer",
    "Frigate",
    "Corvette",
    "Submarine",
    "Aircraft Carrier",
    "LPD",  # Landing Platform Dock
    "Fleet Support Ship",
    "Fast Attack Craft",
    "MCMV",  # Mine Countermeasure Vessel
    "OPV"    # Offshore Patrol Vessel
]

# Ship Characteristics matching triangular distribution parameters
SHIP_CHARACTERISTICS = {
    "Destroyer": {
        "cost_mode": 12000.0, "cost_min": 8000.0, "cost_max": 18000.0,
        "duration_mode": 72, "duration_min": 60, "duration_max": 96,
        "complexity_mode": 8.0, "complexity_min": 6.5, "complexity_max": 9.5,
        "maturity_mode": 7.0, "maturity_min": 5.0, "maturity_max": 9.0,
        "foreign_dep_prob": 0.40, "stakeholder_min": 15, "stakeholder_max": 30,
        "size_mode": 7.5, "size_min": 6.0, "size_max": 8.5
    },
    "Frigate": {
        "cost_mode": 6500.0, "cost_min": 4500.0, "cost_max": 9000.0,
        "duration_mode": 60, "duration_min": 48, "duration_max": 84,
        "complexity_mode": 7.0, "complexity_min": 5.5, "complexity_max": 8.5,
        "maturity_mode": 7.5, "maturity_min": 6.0, "maturity_max": 9.0,
        "foreign_dep_prob": 0.30, "stakeholder_min": 10, "stakeholder_max": 25,
        "size_mode": 4.5, "size_min": 3.5, "size_max": 6.0
    },
    "Corvette": {
        "cost_mode": 2500.0, "cost_min": 1800.0, "cost_max": 4000.0,
        "duration_mode": 48, "duration_min": 36, "duration_max": 66,
        "complexity_mode": 5.5, "complexity_min": 4.5, "complexity_max": 7.0,
        "maturity_mode": 8.0, "maturity_min": 6.5, "maturity_max": 9.5,
        "foreign_dep_prob": 0.15, "stakeholder_min": 8, "stakeholder_max": 18,
        "size_mode": 2.2, "size_min": 1.5, "size_max": 3.0
    },
    "Submarine": {
        "cost_mode": 25000.0, "cost_min": 18000.0, "cost_max": 35000.0,
        "duration_mode": 96, "duration_min": 84, "duration_max": 120,
        "complexity_mode": 9.2, "complexity_min": 8.0, "complexity_max": 10.0,
        "maturity_mode": 5.5, "maturity_min": 4.0, "maturity_max": 7.5,
        "foreign_dep_prob": 0.60, "stakeholder_min": 18, "stakeholder_max": 35,
        "size_mode": 3.0, "size_min": 2.0, "size_max": 4.5
    },
    "Aircraft Carrier": {
        "cost_mode": 45000.0, "cost_min": 35000.0, "cost_max": 60000.0,
        "duration_mode": 120, "duration_min": 96, "duration_max": 156,
        "complexity_mode": 9.5, "complexity_min": 8.5, "complexity_max": 10.0,
        "maturity_mode": 6.0, "maturity_min": 4.5, "maturity_max": 8.0,
        "foreign_dep_prob": 0.50, "stakeholder_min": 25, "stakeholder_max": 50,
        "size_mode": 45.0, "size_min": 38.0, "size_max": 55.0
    },
    "LPD": {
        "cost_mode": 9000.0, "cost_min": 7000.0, "cost_max": 12000.0,
        "duration_mode": 72, "duration_min": 60, "duration_max": 90,
        "complexity_mode": 6.5, "complexity_min": 5.0, "complexity_max": 8.0,
        "maturity_mode": 7.5, "maturity_min": 6.0, "maturity_max": 9.0,
        "foreign_dep_prob": 0.25, "stakeholder_min": 12, "stakeholder_max": 24,
        "size_mode": 20.0, "size_min": 15.0, "size_max": 25.0
    },
    "Fleet Support Ship": {
        "cost_mode": 4500.0, "cost_min": 3500.0, "cost_max": 6000.0,
        "duration_mode": 60, "duration_min": 48, "duration_max": 72,
        "complexity_mode": 4.5, "complexity_min": 3.5, "complexity_max": 6.0,
        "maturity_mode": 8.5, "maturity_min": 7.5, "maturity_max": 9.5,
        "foreign_dep_prob": 0.10, "stakeholder_min": 8, "stakeholder_max": 16,
        "size_mode": 40.0, "size_min": 30.0, "size_max": 45.0
    },
    "Fast Attack Craft": {
        "cost_mode": 600.0, "cost_min": 400.0, "cost_max": 900.0,
        "duration_mode": 36, "duration_min": 24, "duration_max": 48,
        "complexity_mode": 4.0, "complexity_min": 3.0, "complexity_max": 5.5,
        "maturity_mode": 8.5, "maturity_min": 7.5, "maturity_max": 9.5,
        "foreign_dep_prob": 0.05, "stakeholder_min": 5, "stakeholder_max": 12,
        "size_mode": 0.35, "size_min": 0.25, "size_max": 0.5
    },
    "MCMV": {
        "cost_mode": 1800.0, "cost_min": 1200.0, "cost_max": 2600.0,
        "duration_mode": 48, "duration_min": 36, "duration_max": 60,
        "complexity_mode": 6.0, "complexity_min": 4.5, "complexity_max": 7.5,
        "maturity_mode": 7.0, "maturity_min": 5.5, "maturity_max": 8.5,
        "foreign_dep_prob": 0.35, "stakeholder_min": 8, "stakeholder_max": 15,
        "size_mode": 0.9, "size_min": 0.7, "size_max": 1.2
    },
    "OPV": {
        "cost_mode": 1200.0, "cost_min": 900.0, "cost_max": 1800.0,
        "duration_mode": 42, "duration_min": 30, "duration_max": 54,
        "complexity_mode": 4.5, "complexity_min": 3.5, "complexity_max": 5.5,
        "maturity_mode": 8.5, "maturity_min": 7.5, "maturity_max": 9.5,
        "foreign_dep_prob": 0.05, "stakeholder_min": 6, "stakeholder_max": 12,
        "size_mode": 1.8, "size_min": 1.2, "size_max": 2.2
    }
}

# Default Template Definitions with Sequence, Category, Dependencies & historical weights
# Dependencies refer to sequence numbers (1-indexed sequence_number keys)
DEFAULT_TEMPLATES = {
    "DAP Nomination Shipbuilding": [
        {"name": "Acceptance of Necessity (AoN)", "category": "Administrative", "sequence_number": 1, "dependency_list": [], "default_duration_months": 3, "historical_risk_weight": 35.0, "responsible_department": "Cabinet Committee/MoD", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Promulgation of PSR", "category": "Technical", "sequence_number": 2, "dependency_list": [1], "default_duration_months": 18, "historical_risk_weight": 40.0, "responsible_department": "SHQ", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Completion of Preliminary/Functional Design", "category": "Technical", "sequence_number": 3, "dependency_list": [2], "default_duration_months": 3, "historical_risk_weight": 45.0, "responsible_department": "SHQ/Shipyard", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Preliminary Build Specification (PBS)", "category": "Technical", "sequence_number": 4, "dependency_list": [3], "default_duration_months": 6, "historical_risk_weight": 35.0, "responsible_department": "SHQ/Shipyard", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Build Strategy Submission & Approval", "category": "Technical", "sequence_number": 5, "dependency_list": [4], "default_duration_months": 3, "historical_risk_weight": 30.0, "responsible_department": "Shipyard", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Budgetary & Estimated Cost Submission", "category": "Administrative", "sequence_number": 6, "dependency_list": [5], "default_duration_months": 6, "historical_risk_weight": 30.0, "responsible_department": "Shipyard", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Contract Negotiations (CNC Stage) & CFA Approval", "category": "Procurement", "sequence_number": 7, "dependency_list": [6], "default_duration_months": 2, "historical_risk_weight": 65.0, "responsible_department": "CNC Committee/MoD", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Signing of Contract", "category": "Administrative", "sequence_number": 8, "dependency_list": [7], "default_duration_months": 2, "historical_risk_weight": 15.0, "responsible_department": "SHQ/Shipyard", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Detailed Design & Equipment Selection", "category": "Technical", "sequence_number": 9, "dependency_list": [8], "default_duration_months": 6, "historical_risk_weight": 50.0, "responsible_department": "Shipyard", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Steel Cutting (Hull Construction Start)", "category": "Construction", "sequence_number": 10, "dependency_list": [9], "default_duration_months": 1, "historical_risk_weight": 10.0, "responsible_department": "Shipyard", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Hull Fabrication & Assembly", "category": "Construction", "sequence_number": 11, "dependency_list": [10], "default_duration_months": 18, "historical_risk_weight": 55.0, "responsible_department": "Shipyard", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Launching of the Vessel", "category": "Construction", "sequence_number": 12, "dependency_list": [11], "default_duration_months": 2, "historical_risk_weight": 25.0, "responsible_department": "Shipyard", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Outfitting & Piping Integration", "category": "Construction", "sequence_number": 13, "dependency_list": [12], "default_duration_months": 12, "historical_risk_weight": 40.0, "responsible_department": "Shipyard", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Harbor Acceptance Trials (HAT)", "category": "Testing", "sequence_number": 14, "dependency_list": [13], "default_duration_months": 4, "historical_risk_weight": 45.0, "responsible_department": "Inspection Commission", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Sea Acceptance Trials (SAT)", "category": "Testing", "sequence_number": 15, "dependency_list": [14], "default_duration_months": 5, "historical_risk_weight": 60.0, "responsible_department": "Inspection Commission", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Delivery & Commissioning", "category": "Delivery", "sequence_number": 16, "dependency_list": [15], "default_duration_months": 2, "historical_risk_weight": 15.0, "responsible_department": "Navy HQ", "is_milestone": True, "is_critical_path": True, "parallel_group": None}
    ],
    "DAP Competitive Shipbuilding": [
        {"name": "Conception, OSR & Concept Design", "category": "Technical", "sequence_number": 1, "dependency_list": [], "default_duration_months": 4, "historical_risk_weight": 25.0, "responsible_department": "Design Directorate", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Acceptance of Necessity (AoN) Approval", "category": "Administrative", "sequence_number": 2, "dependency_list": [1], "default_duration_months": 6, "historical_risk_weight": 35.0, "responsible_department": "Cabinet Committee/MoD", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "RFI Issue & Analysis", "category": "Documentation", "sequence_number": 3, "dependency_list": [2], "default_duration_months": 3, "historical_risk_weight": 20.0, "responsible_department": "Procurement Dept", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "RFP Formulation & Capacity Assessment", "category": "Documentation", "sequence_number": 4, "dependency_list": [3], "default_duration_months": 4, "historical_risk_weight": 30.0, "responsible_department": "Naval Staff", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Solicitation of Offers (RFP Bidding)", "category": "Procurement", "sequence_number": 5, "dependency_list": [4], "default_duration_months": 5, "historical_risk_weight": 35.0, "responsible_department": "Procurement Dept", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Technical & Financial Evaluation (TEC & FPET)", "category": "Technical", "sequence_number": 6, "dependency_list": [5], "default_duration_months": 6, "historical_risk_weight": 60.0, "responsible_department": "TEC/FPET Committees", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Commercial Negotiations (CNC)", "category": "Procurement", "sequence_number": 7, "dependency_list": [6], "default_duration_months": 6, "historical_risk_weight": 75.0, "responsible_department": "CNC Committee", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Award & Contract Signing", "category": "Administrative", "sequence_number": 8, "dependency_list": [7], "default_duration_months": 2, "historical_risk_weight": 20.0, "responsible_department": "SHQ/Shipyard", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Detailed Design & Equipment Order", "category": "Technical", "sequence_number": 9, "dependency_list": [8], "default_duration_months": 6, "historical_risk_weight": 50.0, "responsible_department": "Shipyard", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Keel Laying Ceremony", "category": "Construction", "sequence_number": 10, "dependency_list": [9], "default_duration_months": 2, "historical_risk_weight": 15.0, "responsible_department": "Shipyard", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Block Assembly & Fabrication", "category": "Construction", "sequence_number": 11, "dependency_list": [10], "default_duration_months": 16, "historical_risk_weight": 55.0, "responsible_department": "Shipyard", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Launching of the Vessel", "category": "Construction", "sequence_number": 12, "dependency_list": [11], "default_duration_months": 2, "historical_risk_weight": 25.0, "responsible_department": "Shipyard", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Outfitting & Piping", "category": "Construction", "sequence_number": 13, "dependency_list": [12], "default_duration_months": 12, "historical_risk_weight": 45.0, "responsible_department": "Shipyard", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Harbor Acceptance Trials (HAT)", "category": "Testing", "sequence_number": 14, "dependency_list": [13], "default_duration_months": 4, "historical_risk_weight": 45.0, "responsible_department": "Inspection Commission", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Sea Acceptance Trials (SAT)", "category": "Testing", "sequence_number": 15, "dependency_list": [14], "default_duration_months": 5, "historical_risk_weight": 60.0, "responsible_department": "Inspection Commission", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Delivery & Commissioning", "category": "Delivery", "sequence_number": 16, "dependency_list": [15], "default_duration_months": 2, "historical_risk_weight": 15.0, "responsible_department": "Navy HQ", "is_milestone": True, "is_critical_path": True, "parallel_group": None}
    ]
}

# The ML feature names list used by prep and model
ML_FEATURE_NAMES = [
    "project_progress_pct",
    "activities_completed",
    "activities_delayed",
    "activities_blocked",
    "critical_activities_delayed",
    "avg_delay_days",
    "max_delay_days",
    "total_delay_till_date",
    "schedule_variance",
    "critical_path_length_remaining",
    "parallel_activities_running",
    "pending_milestones",
    "approval_delay_total",
    "vendor_delay_total",
    "requirement_changes",
    "design_changes",
    "qa_issues",
    "fat_failures",
    "sat_failures",
    "technical_complexity",
    "technology_maturity",
    "foreign_dependency",
    "vendor_rating",
    "remaining_planned_duration",
    "project_health_score",
    "open_risks",
    "project_cost",
    "planned_duration_months",
    # Loop-related features
    "loop_count",
    "activities_in_loops",
    "max_loop_depth",
    "avg_loop_length",
    "loop_iteration_limit",
    "historical_loop_iterations",
    "loop_delay_ratio",
    "loop_completion_efficiency",
    "critical_loop_presence",
    "pct_critical_in_loop",
    "loop_dependency_density",
    "rework_frequency",
    "ship_type"
]
