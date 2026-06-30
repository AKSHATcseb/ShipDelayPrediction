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
    "Nomination Procurement": [
        {"name": "Cabinet Committee Approval (AoN)", "category": "Administrative", "sequence_number": 1, "dependency_list": [], "default_duration_months": 6, "historical_risk_weight": 35.0, "responsible_department": "Cabinet Committee", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Establishment of Staff Requirements", "category": "Technical", "sequence_number": 2, "dependency_list": [1], "default_duration_months": 3, "historical_risk_weight": 40.0, "responsible_department": "Naval Staff", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Vendor Nomination Clearance", "category": "Administrative", "sequence_number": 3, "dependency_list": [2], "default_duration_months": 2, "historical_risk_weight": 25.0, "responsible_department": "Procurement Dept", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Commercial Negotiation (CNC)", "category": "Procurement", "sequence_number": 4, "dependency_list": [3], "default_duration_months": 5, "historical_risk_weight": 70.0, "responsible_department": "CNC Committee", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Contract Signing", "category": "Administrative", "sequence_number": 5, "dependency_list": [4], "default_duration_months": 2, "historical_risk_weight": 15.0, "responsible_department": "Ministry Secretariat", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Design Review & Approval", "category": "Technical", "sequence_number": 6, "dependency_list": [5], "default_duration_months": 4, "historical_risk_weight": 55.0, "responsible_department": "Design Directorate", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Steel Cutting Ceremony", "category": "Construction", "sequence_number": 7, "dependency_list": [6], "default_duration_months": 1, "historical_risk_weight": 10.0, "responsible_department": "Shipyard", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Hull Fabrication & Assembly", "category": "Construction", "sequence_number": 8, "dependency_list": [7], "default_duration_months": 18, "historical_risk_weight": 60.0, "responsible_department": "Shipyard", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Propulsion System Fitting", "category": "Construction", "sequence_number": 9, "dependency_list": [8], "default_duration_months": 6, "historical_risk_weight": 50.0, "responsible_department": "Shipyard", "is_milestone": False, "is_critical_path": True, "parallel_group": 1},
        {"name": "Electrical Systems Layout", "category": "Construction", "sequence_number": 10, "dependency_list": [8], "default_duration_months": 5, "historical_risk_weight": 40.0, "responsible_department": "Shipyard", "is_milestone": False, "is_critical_path": False, "parallel_group": 1},
        {"name": "Combat Systems Integration", "category": "Technical", "sequence_number": 11, "dependency_list": [9, 10], "default_duration_months": 8, "historical_risk_weight": 75.0, "responsible_department": "Integration Bureau", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Harbor Acceptance Trials (HAT)", "category": "Testing", "sequence_number": 12, "dependency_list": [11], "default_duration_months": 3, "historical_risk_weight": 45.0, "responsible_department": "Inspection Commission", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Sea Acceptance Trials (SAT)", "category": "Testing", "sequence_number": 13, "dependency_list": [12], "default_duration_months": 4, "historical_risk_weight": 65.0, "responsible_department": "Inspection Commission", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Final Inspection & Sign-off", "category": "Inspection", "sequence_number": 14, "dependency_list": [13], "default_duration_months": 2, "historical_risk_weight": 30.0, "responsible_department": "Navy HQ", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Delivery & Commissioning", "category": "Delivery", "sequence_number": 15, "dependency_list": [14], "default_duration_months": 1, "historical_risk_weight": 10.0, "responsible_department": "Navy HQ", "is_milestone": True, "is_critical_path": True, "parallel_group": None}
    ],
    "Competitive Procurement": [
        {"name": "AoN Approval", "category": "Administrative", "sequence_number": 1, "dependency_list": [], "default_duration_months": 6, "historical_risk_weight": 35.0, "responsible_department": "Cabinet Committee", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "RFI Issue & Analysis", "category": "Documentation", "sequence_number": 2, "dependency_list": [1], "default_duration_months": 3, "historical_risk_weight": 20.0, "responsible_department": "Procurement Dept", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "RFP Formulation", "category": "Documentation", "sequence_number": 3, "dependency_list": [2], "default_duration_months": 4, "historical_risk_weight": 40.0, "responsible_department": "Naval Staff", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "RFP Bidding Period", "category": "Procurement", "sequence_number": 4, "dependency_list": [3], "default_duration_months": 5, "historical_risk_weight": 30.0, "responsible_department": "Procurement Dept", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Technical Evaluation (TEC)", "category": "Technical", "sequence_number": 5, "dependency_list": [4], "default_duration_months": 6, "historical_risk_weight": 65.0, "responsible_department": "TEC Committee", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Commercial Bid Opening & L1 Determination", "category": "Procurement", "sequence_number": 6, "dependency_list": [5], "default_duration_months": 2, "historical_risk_weight": 25.0, "responsible_department": "TOC Committee", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Commercial Negotiations (CNC)", "category": "Procurement", "sequence_number": 7, "dependency_list": [6], "default_duration_months": 6, "historical_risk_weight": 80.0, "responsible_department": "CNC Committee", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Contract Signing", "category": "Administrative", "sequence_number": 8, "dependency_list": [7], "default_duration_months": 3, "historical_risk_weight": 20.0, "responsible_department": "Ministry Secretariat", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Detailed Design Review", "category": "Technical", "sequence_number": 9, "dependency_list": [8], "default_duration_months": 5, "historical_risk_weight": 50.0, "responsible_department": "Design Directorate", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Equipment Procurement & Shipping", "category": "Procurement", "sequence_number": 10, "dependency_list": [9], "default_duration_months": 12, "historical_risk_weight": 70.0, "responsible_department": "Procurement Dept", "is_milestone": False, "is_critical_path": False, "parallel_group": 1},
        {"name": "Keel Laying", "category": "Construction", "sequence_number": 11, "dependency_list": [9], "default_duration_months": 2, "historical_risk_weight": 15.0, "responsible_department": "Shipyard", "is_milestone": True, "is_critical_path": True, "parallel_group": 1},
        {"name": "Block Assembly & Structural Fabrication", "category": "Construction", "sequence_number": 12, "dependency_list": [11], "default_duration_months": 16, "historical_risk_weight": 55.0, "responsible_department": "Shipyard", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Vessel Launching", "category": "Construction", "sequence_number": 13, "dependency_list": [12, 10], "default_duration_months": 2, "historical_risk_weight": 25.0, "responsible_department": "Shipyard", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Outfitting & Piping", "category": "Construction", "sequence_number": 14, "dependency_list": [13], "default_duration_months": 12, "historical_risk_weight": 45.0, "responsible_department": "Shipyard", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Harbor Trials (HAT)", "category": "Testing", "sequence_number": 15, "dependency_list": [14], "default_duration_months": 4, "historical_risk_weight": 50.0, "responsible_department": "Inspection Commission", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Sea Trials (SAT)", "category": "Testing", "sequence_number": 16, "dependency_list": [15], "default_duration_months": 5, "historical_risk_weight": 60.0, "responsible_department": "Inspection Commission", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Delivery & Commissioning", "category": "Delivery", "sequence_number": 17, "dependency_list": [16], "default_duration_months": 2, "historical_risk_weight": 15.0, "responsible_department": "Navy HQ", "is_milestone": True, "is_critical_path": True, "parallel_group": None}
    ],
    "Emergency Procurement": [
        {"name": "Emergency AoN Fast-track", "category": "Administrative", "sequence_number": 1, "dependency_list": [], "default_duration_months": 1, "historical_risk_weight": 15.0, "responsible_department": "Cabinet Committee", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Single Source RFQ Issue", "category": "Documentation", "sequence_number": 2, "dependency_list": [1], "default_duration_months": 1, "historical_risk_weight": 10.0, "responsible_department": "Procurement Dept", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Direct Contract Negotiations", "category": "Procurement", "sequence_number": 3, "dependency_list": [2], "default_duration_months": 1, "historical_risk_weight": 40.0, "responsible_department": "CNC Committee", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Contract Signing & Clearance", "category": "Administrative", "sequence_number": 4, "dependency_list": [3], "default_duration_months": 1, "historical_risk_weight": 15.0, "responsible_department": "Ministry Secretariat", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Immediate Inventory Allocation", "category": "Procurement", "sequence_number": 5, "dependency_list": [4], "default_duration_months": 2, "historical_risk_weight": 35.0, "responsible_department": "Procurement Dept", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Fast-track Commissioning Trials", "category": "Testing", "sequence_number": 6, "dependency_list": [5], "default_duration_months": 2, "historical_risk_weight": 40.0, "responsible_department": "Inspection Commission", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Handover & Active Deployment", "category": "Delivery", "sequence_number": 7, "dependency_list": [6], "default_duration_months": 1, "historical_risk_weight": 10.0, "responsible_department": "Navy HQ", "is_milestone": True, "is_critical_path": True, "parallel_group": None}
    ],
    "Indigenous Procurement": [
        {"name": "In-house Conception & Feasibility", "category": "Technical", "sequence_number": 1, "dependency_list": [], "default_duration_months": 4, "historical_risk_weight": 25.0, "responsible_department": "Design Directorate", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Indigenous AoN Clearance", "category": "Administrative", "sequence_number": 2, "dependency_list": [1], "default_duration_months": 6, "historical_risk_weight": 30.0, "responsible_department": "Cabinet Committee", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Detailed Ship Design & Blueprinting", "category": "Technical", "sequence_number": 3, "dependency_list": [2], "default_duration_months": 8, "historical_risk_weight": 60.0, "responsible_department": "Design Directorate", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Local Vendor Development Approval", "category": "Procurement", "sequence_number": 4, "dependency_list": [3], "default_duration_months": 5, "historical_risk_weight": 55.0, "responsible_department": "Procurement Dept", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Indigenization Prototype Clearance", "category": "Technical", "sequence_number": 5, "dependency_list": [4], "default_duration_months": 6, "historical_risk_weight": 70.0, "responsible_department": "Inspection Commission", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Local Material Supply Agreement", "category": "Procurement", "sequence_number": 6, "dependency_list": [5], "default_duration_months": 3, "historical_risk_weight": 40.0, "responsible_department": "Procurement Dept", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Vessel Frame assembly", "category": "Construction", "sequence_number": 7, "dependency_list": [6], "default_duration_months": 12, "historical_risk_weight": 40.0, "responsible_department": "Shipyard", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Local Fitting & Integration", "category": "Construction", "sequence_number": 8, "dependency_list": [7], "default_duration_months": 9, "historical_risk_weight": 50.0, "responsible_department": "Shipyard", "is_milestone": False, "is_critical_path": True, "parallel_group": None},
        {"name": "Integrated Systems Trials", "category": "Testing", "sequence_number": 9, "dependency_list": [8], "default_duration_months": 4, "historical_risk_weight": 55.0, "responsible_department": "Inspection Commission", "is_milestone": True, "is_critical_path": True, "parallel_group": None},
        {"name": "Delivery & Induction", "category": "Delivery", "sequence_number": 10, "dependency_list": [9], "default_duration_months": 2, "historical_risk_weight": 15.0, "responsible_department": "Navy HQ", "is_milestone": True, "is_critical_path": True, "parallel_group": None}
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
    "ship_type"
]
