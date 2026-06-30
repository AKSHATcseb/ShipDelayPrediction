"""
Activity Simulator.
Simulates daily execution of individual activities, injecting delays and errors based on risk factors.
"""

import numpy as np
from datetime import date, timedelta
from typing import Dict, Any, Tuple

class ActivitySimulator:
    def __init__(self, seed: int = 42):
        self.rng = np.random.default_rng(seed)

    def simulate_activity(
        self,
        activity: Dict[str, Any],
        project_start_date: date,
        complexity: float,
        maturity: float,
        foreign_dep: bool,
        vendor_rating: float
    ) -> Dict[str, Any]:
        """
        Simulate the execution duration of a single activity.
        Determines actual_start, actual_end, delays, and status.
        """
        planned_start = activity["planned_start_date"]
        planned_end = activity["planned_end_date"]
        planned_duration = (planned_end - planned_start).days
        
        # Base probability of delay event modulated by risk factors
        risk_weight = activity["historical_risk_weight"] / 100.0
        
        # Modifiers based on project characteristics
        mod = 1.0
        if activity["category"] in ["Technical", "Testing", "Inspection"]:
            mod += (complexity - 5.0) * 0.10
            mod += (7.0 - maturity) * 0.15
        if activity["category"] in ["Procurement", "Documentation"]:
            if foreign_dep:
                mod += 0.25
            mod += (4.0 - vendor_rating) * 0.20

        # Blended delay probability
        delay_prob = min(0.95, max(0.02, risk_weight * mod))
        
        # Draw actual duration
        if self.rng.random() < delay_prob:
            # Delay event occurred. Sample delay multiplier
            # Using lognormal distribution for realistic asymmetric delay spikes
            delay_factor = self.rng.lognormal(mean=0.3, sigma=0.5)
            # Clip between 1.05x and 4.0x
            delay_factor = min(4.0, max(1.05, delay_factor))
            actual_duration = int(round(planned_duration * delay_factor))
            
            # Select random remarks based on category
            remarks = self.rng.choice([
                "Delayed due to vendor supply bottleneck.",
                "Approval process held up for clarification.",
                "Technical failure in prototype testing.",
                "Workforce shortages at construction yard.",
                "Design revision request by naval inspection team.",
                "Severe weather halted outdoor fabrication.",
                "Custom clearance delays on long-lead imported components."
            ])
            status = "Completed" if self.rng.random() < 0.95 else "Delayed"
        else:
            # On-time or early completion
            early_pct = self.rng.uniform(-0.15, 0.02) # Can finish up to 15% early
            actual_duration = int(max(2, round(planned_duration * (1.0 + early_pct))))
            remarks = "Completed on schedule."
            status = "Completed"

        delay_days = max(0, actual_duration - planned_duration)

        return {
            "actual_duration": actual_duration,
            "delay_days": delay_days,
            "remarks": remarks,
            "status": status
        }
class ProjectExecutionSimulator:
    def __init__(self, seed: int = 42):
        self.rng = np.random.default_rng(seed)
        self.act_sim = ActivitySimulator(seed)

    def simulate_project_execution(self, project: Dict[str, Any]) -> Dict[str, Any]:
        """
        Simulates the execution of all activities in topological order.
        Cascades delays to subsequent activities using date propagation.
        """
        sim_project = dict(project)
        sim_project["activities"] = [dict(a) for a in project["activities"]]
        
        # Track actual end date of each activity by index
        actual_ends = {}
        
        for idx, act in enumerate(sim_project["activities"]):
            deps = act["dependency_list"]
            
            # Actual start date is the max of the actual end dates of all predecessors
            # Or project start date if there are no predecessors
            act_start = sim_project["start_date"]
            if deps:
                predecessor_ends = [actual_ends[dep] for dep in deps if dep in actual_ends]
                if predecessor_ends:
                    act_start = max(predecessor_ends)
            
            act["actual_start_date"] = act_start
            
            # Simulate actual duration
            sim_res = self.act_sim.simulate_activity(
                activity=act,
                project_start_date=sim_project["start_date"],
                complexity=sim_project["technical_complexity"],
                maturity=sim_project["technology_maturity"],
                foreign_dep=sim_project["foreign_dependency"],
                vendor_rating=sim_project["vendor_rating"]
            )
            
            act_end = act_start + timedelta(days=sim_res["actual_duration"])
            act["actual_end_date"] = act_end
            act["current_delay_days"] = sim_res["delay_days"]
            act["current_status"] = sim_res["status"]
            act["completion_percentage"] = 100.0
            act["remarks"] = sim_res["remarks"]
            
            actual_ends[idx] = act_end
            
        return sim_project
