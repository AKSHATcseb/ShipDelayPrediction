"""
Project Generator.
Instantiates project specs and baseline activity schedules using ship type profiles.
"""

import numpy as np
from datetime import date, timedelta
from typing import List, Dict, Any

from ml.constants import SHIP_TYPES, SHIP_CHARACTERISTICS, DEFAULT_TEMPLATES
from backend.services.project_service import compute_project_dates

class ProjectGenerator:
    def __init__(self, seed: int = 42):
        self.rng = np.random.default_rng(seed)

    def generate_project(self, template: List[Dict[str, Any]], project_id: int) -> Dict[str, Any]:
        """
        Creates a randomized Project and schedules its activities.
        Samples specs based on triangular distributions of random vessel type.
        """
        # Pick a random ship type
        ship_type = self.rng.choice(SHIP_TYPES)
        char = SHIP_CHARACTERISTICS[ship_type]

        # Draw cost, size, complexity, maturity from triangular distributions
        cost = float(self.rng.triangular(char["cost_min"], char["cost_mode"], char["cost_max"]))
        planned_duration = int(self.rng.triangular(char["duration_min"], char["duration_mode"], char["duration_max"]))
        complexity = float(self.rng.triangular(char["complexity_min"], char["complexity_mode"], char["complexity_max"]))
        maturity = float(self.rng.triangular(char["maturity_min"], char["maturity_mode"], char["maturity_max"]))
        size = float(self.rng.triangular(char["size_min"], char["size_mode"], char["size_max"]))
        
        # Foreign dependency probability
        foreign_dep = bool(self.rng.random() < char["foreign_dep_prob"])
        
        # Historical Vendor Performance Rating (1.5 - 5.0 scale)
        vendor_rating = float(self.rng.triangular(1.5, 4.0, 5.0))

        # Project priority
        priority = self.rng.choice(["Low", "Medium", "High", "Critical"], p=[0.15, 0.45, 0.30, 0.10])

        # Baseline start date (some date between 2018 and 2024)
        start_year = self.rng.choice([2018, 2019, 2020, 2021, 2022, 2023, 2024])
        start_month = self.rng.integers(1, 13)
        start_day = self.rng.integers(1, 29)
        start_dt = date(start_year, start_month, start_day)

        # Scale template activities durations to fit the overall sampled project duration.
        # This keeps the schedule internally consistent with the overall project plan.
        total_default_dur = sum(a["default_duration_months"] for a in template)
        # Scale template durations directly in months
        scale_factor = planned_duration / max(1, total_default_dur)

        scaled_template = []
        for act in template:
            scaled_dur = int(max(1, round(act["default_duration_months"] * scale_factor)))
            new_act = dict(act)
            new_act["default_duration_months"] = scaled_dur
            scaled_template.append(new_act)

        # Compute scheduled planned dates using Project Service function
        scheduled_activities = compute_project_dates(start_dt, scaled_template)

        # Add project ID and actual details
        proj_code = f"IN-PRJ-{project_id:04d}"
        
        project_instance = {
            "project_name": f"INS {ship_type} {project_id}",
            "project_id_code": proj_code,
            "ship_name": f"INS {ship_type} {project_id}",
            "ship_class": f"Class-{project_id}",
            "ship_type": ship_type,
            "project_cost": round(cost, 1),
            "project_size": round(size, 1),
            "priority": priority,
            "start_date": start_dt,
            "planned_duration_months": planned_duration,
            "technical_complexity": round(complexity, 1),
            "technology_maturity": round(maturity, 1),
            "foreign_dependency": foreign_dep,
            "vendor_rating": round(vendor_rating, 2),
            "activities": []
        }

        # Map sequence number to activity list index
        seq_to_idx = {act["sequence_number"]: i for i, act in enumerate(scheduled_activities)}

        # Format and save activities
        for i, s_act in enumerate(scheduled_activities):
            # Map sequence dependency lists to index-level dependency lists
            deps = [seq_to_idx[seq] for seq in s_act["dependency_list_seq"] if seq in seq_to_idx]
            
            project_instance["activities"].append({
                "name": s_act["name"],
                "category": s_act["category"],
                "sequence_number": s_act["sequence_number"],
                "parallel_group": s_act["parallel_group"],
                "planned_start_date": s_act["planned_start_date"],
                "planned_end_date": s_act["planned_end_date"],
                "dependency_list": deps, # Index dependencies
                "historical_risk_weight": s_act["historical_risk_weight"],
                "is_milestone": s_act["is_milestone"],
                "is_critical_path": s_act["is_critical_path"],
                "current_status": "NotStarted",
                "completion_percentage": 0.0,
                "current_delay_days": 0,
                "actual_start_date": None,
                "actual_end_date": None,
                "remarks": ""
            })

        # Generate loops/rework cycles for project instances
        project_instance["feedback_loops"] = self._generate_loops(project_instance["activities"])

        return project_instance

    def _generate_loops(self, activities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        loops = []
        num_acts = len(activities)
        if num_acts < 5:
            return loops

        roll = self.rng.random()
        
        # If we have very few activities, only support Single Loop or No Loop
        if num_acts < 12:
            if roll < 0.30:
                return loops
            else:
                # Single Loop
                dest_idx = int(self.rng.integers(1, max(2, num_acts // 2)))
                src_idx = int(self.rng.integers(max(2, num_acts // 2) + 1, num_acts - 1))
                dest_seq = activities[dest_idx]["sequence_number"]
                src_seq = activities[src_idx]["sequence_number"]
                
                loop_type = self.rng.choice(["QA Correction Loop", "Rework Loop", "Review Loop", "Engineering Approval Loop"])
                loops.append({
                    "sourceActivity": str(src_seq),
                    "destinationActivity": str(dest_seq),
                    "dependencyType": "Loop",
                    "loopFlag": True,
                    "loopConfiguration": {
                        "maxIterations": int(self.rng.integers(2, 5)),
                        "expectedAvgIterations": float(self.rng.triangular(1.0, 1.5, 2.5)),
                        "exitCondition": loop_type + " Completed",
                        "loopProbability": float(self.rng.uniform(0.15, 0.40)),
                        "isMandatory": bool(self.rng.random() < 0.3)
                    }
                })
                return loops

        # Full procedural generation for larger projects (num_acts >= 12)
        # 25% chance of No Loop
        if roll < 0.25:
            return loops
        
        # 35% chance of Single Loop
        elif roll < 0.60:
            dest_idx = int(self.rng.integers(1, num_acts // 2))
            src_idx = int(self.rng.integers(num_acts // 2 + 1, num_acts - 1))
            dest_seq = activities[dest_idx]["sequence_number"]
            src_seq = activities[src_idx]["sequence_number"]
            
            loop_type = self.rng.choice(["QA Correction Loop", "Rework Loop", "Review Loop", "Engineering Approval Loop"])
            loops.append({
                "sourceActivity": str(src_seq),
                "destinationActivity": str(dest_seq),
                "dependencyType": "Loop",
                "loopFlag": True,
                "loopConfiguration": {
                    "maxIterations": int(self.rng.integers(2, 5)),
                    "expectedAvgIterations": float(self.rng.triangular(1.0, 1.5, 2.5)),
                    "exitCondition": loop_type + " Completed",
                    "loopProbability": float(self.rng.uniform(0.15, 0.40)),
                    "isMandatory": bool(self.rng.random() < 0.3)
                }
            })
            
        # 25% chance of Multiple Independent Loops
        elif roll < 0.85:
            # Loop 1: early in the project
            dest1_idx = int(self.rng.integers(1, 3))
            src1_idx = int(self.rng.integers(3, 6))
            dest1_seq = activities[dest1_idx]["sequence_number"]
            src1_seq = activities[src1_idx]["sequence_number"]
            
            # Loop 2: later in the project
            dest2_idx = int(self.rng.integers(6, 9))
            src2_idx = int(self.rng.integers(9, num_acts - 1))
            dest2_seq = activities[dest2_idx]["sequence_number"]
            src2_seq = activities[src2_idx]["sequence_number"]
            
            loops.append({
                "sourceActivity": str(src1_seq),
                "destinationActivity": str(dest1_seq),
                "dependencyType": "Loop",
                "loopFlag": True,
                "loopConfiguration": {
                    "maxIterations": 3,
                    "expectedAvgIterations": 1.5,
                    "exitCondition": "Engineering Approval Loop Passed",
                    "loopProbability": 0.25,
                    "isMandatory": False
                }
            })
            loops.append({
                "sourceActivity": str(src2_seq),
                "destinationActivity": str(dest2_seq),
                "dependencyType": "Loop",
                "loopFlag": True,
                "loopConfiguration": {
                    "maxIterations": 4,
                    "expectedAvgIterations": 2.0,
                    "exitCondition": "Testing Loop Approved",
                    "loopProbability": 0.35,
                    "isMandatory": True
                }
            })
            
        # 15% chance of Nested Loop
        else:
            dest_outer = activities[1]["sequence_number"]
            src_outer = activities[num_acts - 2]["sequence_number"]
            dest_inner = activities[3]["sequence_number"]
            src_inner = activities[num_acts - 4]["sequence_number"]
            
            loops.append({
                "sourceActivity": str(src_outer),
                "destinationActivity": str(dest_outer),
                "dependencyType": "Loop",
                "loopFlag": True,
                "loopConfiguration": {
                    "maxIterations": 3,
                    "expectedAvgIterations": 1.8,
                    "exitCondition": "Review Loop Final Signoff",
                    "loopProbability": 0.25,
                    "isMandatory": False
                }
            })
            loops.append({
                "sourceActivity": str(src_inner),
                "destinationActivity": str(dest_inner),
                "dependencyType": "Loop",
                "loopFlag": True,
                "loopConfiguration": {
                    "maxIterations": 4,
                    "expectedAvgIterations": 2.0,
                    "exitCondition": "QA Correction Loop Pass",
                    "loopProbability": 0.35,
                    "isMandatory": True
                }
            })
            
        return loops
