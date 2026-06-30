"""
Simulation Engine.
Day-by-day project execution simulator for generating realistic snapshots.
"""

import numpy as np
from datetime import date, timedelta
from typing import Dict, Any, List, Tuple
from ml.activity_simulator import ActivitySimulator

class SimulationEngine:
    def __init__(self, seed: int = 42):
        self.rng = np.random.default_rng(seed)
        self.act_sim = ActivitySimulator(seed)

    def simulate_day_by_day(self, project: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Runs a day-by-day simulation of the project.
        Returns:
          1. A list of snapshots capturing project state at different progress milestones (15%, 30%, 50%, 70%, 85%, 95%, 100%).
          2. The final completed project state dict.
        """
        sim_project = dict(project)
        # Deep copy activities
        sim_project["activities"] = [dict(a) for a in project["activities"]]
        
        # Determine total planned days
        start_date = sim_project["start_date"]
        
        # List to hold the output snapshots
        snapshots = []
        snapshot_milestones = [15.0, 30.0, 50.0, 70.0, 85.0, 95.0, 100.0]
        captured_milestones = set()

        # Get topological sorting indices
        num_activities = len(sim_project["activities"])
        
        # State arrays for each activity index:
        # Status: 0=NotStarted, 1=InProgress, 2=Completed, 3=Delayed/Blocked
        statuses = [0] * num_activities
        actual_starts = [None] * num_activities
        actual_ends = [None] * num_activities
        completion_pcts = [0.0] * num_activities
        delays = [0] * num_activities
        remarks = [""] * num_activities
        
        # Precompute duration and dependency requirements
        durations = []
        for act in sim_project["activities"]:
            planned_dur = (act["planned_end_date"] - act["planned_start_date"]).days
            durations.append(max(5, planned_dur))
            
        actual_durations = [0] * num_activities
        remaining_days = [0] * num_activities

        # Day counter
        current_day = 0
        project_completed = False

        while not project_completed:
            current_date = start_date + timedelta(days=current_day)
            
            # Check for activities that can start
            for idx in range(num_activities):
                if statuses[idx] == 0:  # Not Started
                    # Check if all predecessors are completed
                    predecessors = sim_project["activities"][idx]["dependency_list"]
                    can_start = True
                    for pred in predecessors:
                        if statuses[pred] != 2:  # Predecessor not completed
                            can_start = False
                            break
                    
                    if can_start:
                        statuses[idx] = 1  # In Progress
                        actual_starts[idx] = current_date
                        
                        # Decide actual duration at start time using activity simulator
                        act = sim_project["activities"][idx]
                        sim_res = self.act_sim.simulate_activity(
                            activity=act,
                            project_start_date=start_date,
                            complexity=sim_project["technical_complexity"],
                            maturity=sim_project["technology_maturity"],
                            foreign_dep=sim_project["foreign_dependency"],
                            vendor_rating=sim_project["vendor_rating"]
                        )
                        actual_durations[idx] = sim_res["actual_duration"]
                        remaining_days[idx] = sim_res["actual_duration"]
                        delays[idx] = sim_res["delay_days"]
                        remarks[idx] = sim_res["remarks"]

            # Progress running activities by 1 day
            for idx in range(num_activities):
                if statuses[idx] == 1:  # In Progress
                    remaining_days[idx] -= 1
                    # Update completion percentage
                    pct = round(max(5.0, min(99.0, (1.0 - (remaining_days[idx] / actual_durations[idx])) * 100.0)), 1)
                    completion_pcts[idx] = pct
                    
                    # Check if completed
                    if remaining_days[idx] <= 0:
                        statuses[idx] = 2  # Completed
                        actual_ends[idx] = current_date
                        completion_pcts[idx] = 100.0

            # Calculate overall project progress % weighted by planned duration
            total_planned_dur = sum(durations)
            completed_planned_dur = sum(durations[i] * (completion_pcts[i] / 100.0) for i in range(num_activities))
            overall_progress = round((completed_planned_dur / total_planned_dur) * 100.0, 1)

            # Check if we should capture a snapshot for milestones
            for milestone in snapshot_milestones:
                if overall_progress >= milestone and milestone not in captured_milestones:
                    captured_milestones.add(milestone)
                    
                    # Capture snapshot state
                    snapshot_activities = []
                    for idx, act in enumerate(sim_project["activities"]):
                        snapshot_activities.append({
                            "name": act["name"],
                            "category": act["category"],
                            "sequence_number": act["sequence_number"],
                            "dependency_list": act["dependency_list"],
                            "planned_start_date": act["planned_start_date"],
                            "planned_end_date": act["planned_end_date"],
                            "actual_start_date": actual_starts[idx],
                            "actual_end_date": actual_ends[idx],
                            "current_status": "Completed" if statuses[idx] == 2 else ("InProgress" if statuses[idx] == 1 else "NotStarted"),
                            "completion_percentage": completion_pcts[idx],
                            "current_delay_days": delays[idx] if statuses[idx] >= 1 else 0,
                            "remarks": remarks[idx] if statuses[idx] >= 1 else "",
                            "historical_risk_weight": act["historical_risk_weight"],
                            "is_milestone": act["is_milestone"],
                            "is_critical_path": act["is_critical_path"]
                        })
                    
                    snapshots.append({
                        "project_name": sim_project["project_name"],
                        "project_id_code": sim_project["project_id_code"],
                        "ship_type": sim_project["ship_type"],
                        "project_cost": sim_project["project_cost"],
                        "project_size": sim_project["project_size"],
                        "priority": sim_project["priority"],
                        "start_date": sim_project["start_date"],
                        "planned_duration_months": sim_project["planned_duration_months"],
                        "technical_complexity": sim_project["technical_complexity"],
                        "technology_maturity": sim_project["technology_maturity"],
                        "foreign_dependency": sim_project["foreign_dependency"],
                        "vendor_rating": sim_project["vendor_rating"],
                        "overall_progress_pct": overall_progress,
                        "snapshot_date": current_date,
                        "activities": snapshot_activities
                    })

            # Check for project completion
            if all(statuses[i] == 2 for i in range(num_activities)):
                project_completed = True
            
            # Increment day
            current_day += 1
            if current_day > 10000:  # Safety breakout
                break

        # Construct final completed project object
        final_project = dict(sim_project)
        final_project["activities"] = []
        for idx, act in enumerate(sim_project["activities"]):
            final_act = dict(act)
            final_act["actual_start_date"] = actual_starts[idx]
            final_act["actual_end_date"] = actual_ends[idx]
            final_act["current_status"] = "Completed"
            final_act["completion_percentage"] = 100.0
            final_act["current_delay_days"] = delays[idx]
            final_act["remarks"] = remarks[idx]
            final_project["activities"].append(final_act)

        # Compute actual total delay in months
        actual_end = max(actual_ends)
        planned_end = max(act["planned_end_date"] for act in sim_project["activities"])
        
        delay_days = max(0, (actual_end - planned_end).days)
        delay_months = round(delay_days / 30.0, 1)
        
        planned_dur_days = (planned_end - start_date).days
        delay_pct = round((delay_days / max(1, planned_dur_days)) * 100.0, 1)
        
        final_project["actual_end_date"] = actual_end
        final_project["total_delay_days"] = delay_days
        final_project["delay_months"] = delay_months
        final_project["delay_percentage"] = delay_pct

        # Map targets onto snapshots
        for snap in snapshots:
            snap["target_delay_percentage"] = delay_pct
            snap["target_delay_months"] = delay_months
            snap["target_actual_end_date"] = actual_end

        return snapshots, final_project
