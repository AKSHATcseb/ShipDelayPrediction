"""
Feature Extractor.
Extracts ~30 quantitative features from project snapshots for model inputs.
"""

from typing import Dict, Any, List
import pandas as pd
import numpy as np

class FeatureExtractor:
    @staticmethod
    def extract_features(snapshot: Dict[str, Any]) -> Dict[str, Any]:
        """
        Computes project metrics from the current activity list state in a snapshot.
        """
        activities = snapshot["activities"]
        
        # Core specs
        project_progress_pct = snapshot.get("overall_progress_pct", 0.0)
        project_cost = snapshot.get("project_cost", 0.0)
        planned_duration_months = snapshot.get("planned_duration_months", 12)
        technical_complexity = snapshot.get("technical_complexity", 5.0)
        technology_maturity = snapshot.get("technology_maturity", 7.0)
        foreign_dependency = int(snapshot.get("foreign_dependency", False))
        vendor_rating = snapshot.get("vendor_rating", 4.0)

        # Activity counts by status
        completed = 0
        delayed = 0
        blocked = 0
        in_progress = 0
        critical_delayed = 0
        pending_milestones = 0
        
        # Accumulate delays
        total_delay = 0
        max_delay = 0
        
        approval_delay_total = 0
        vendor_delay_total = 0
        
        # Simulation injected risks/counts
        qa_issues = 0
        fat_failures = 0
        sat_failures = 0
        requirement_changes = 0
        design_changes = 0

        # Remaining durations
        remaining_planned_duration = 0

        for act in activities:
            status = act["current_status"]
            is_critical = act.get("is_critical_path", False)
            is_milestone = act.get("is_milestone", False)
            cat = act["category"]
            
            # Categories & Counts
            if status == "Completed":
                completed += 1
            elif status == "InProgress":
                in_progress += 1
            elif status == "Delayed":
                delayed += 1
                if is_critical:
                    critical_delayed += 1
            elif status == "Blocked":
                blocked += 1
                if is_critical:
                    critical_delayed += 1

            if is_milestone and status != "Completed":
                pending_milestones += 1

            # Extract delays
            act_delay = act.get("current_delay_days", 0)
            if status in ["InProgress", "Completed", "Delayed", "Blocked"]:
                total_delay += act_delay
                if act_delay > max_delay:
                    max_delay = act_delay

                if cat == "Administrative":
                    approval_delay_total += act_delay
                elif cat == "Procurement":
                    vendor_delay_total += act_delay

            # Count simulated issues by looking inside remarks/logs
            rmk = act.get("remarks", "").lower()
            if "qa" in rmk or "quality" in rmk:
                qa_issues += 1
            if "fat" in rmk or "factory" in rmk:
                fat_failures += 1
            if "sat" in rmk or "sea trial" in rmk:
                sat_failures += 1
            if "requirement" in rmk or "scope" in rmk:
                requirement_changes += 1
            if "design" in rmk or "blueprint" in rmk:
                design_changes += 1

            # Planned duration remaining
            if status != "Completed":
                dur = (act["planned_end_date"] - act["planned_start_date"]).days
                remaining_planned_duration += max(0, dur)

        avg_delay_days = float(total_delay / max(1, completed + in_progress + delayed))

        # Schedule variance (completed percentage vs expected progress %)
        # Let's approximate expected progress by comparing planned duration elapsed
        start_date = snapshot["start_date"]
        snapshot_date = snapshot["snapshot_date"]
        days_elapsed = max(0, (snapshot_date - start_date).days)
        total_planned_days = planned_duration_months * 30
        expected_progress = min(100.0, (days_elapsed / max(1, total_planned_days)) * 100.0)
        schedule_variance = project_progress_pct - expected_progress

        # Health score based on delays, quality issues, and remaining critical path delays
        health = 100.0 - (delayed * 4.0) - (critical_delayed * 8.0) - (qa_issues * 5.0) - (blocked * 10.0)
        project_health_score = max(5.0, min(100.0, health))

        open_risks = delayed + blocked + qa_issues

        # Target classification
        delay_pct = snapshot.get("target_delay_percentage", 0.0)
        delay_months = snapshot.get("target_delay_months", 0.0)
        
        # Risk classification
        if delay_pct <= 20.0:
            risk_category = 0 # Low
        elif delay_pct <= 40.0:
            risk_category = 1 # Medium
        elif delay_pct <= 70.0:
            risk_category = 2 # High
        else:
            risk_category = 3 # Critical

        # Output feature dictionary
        features = {
            # Meta features (passed to models)
            "project_progress_pct": project_progress_pct,
            "activities_completed": completed,
            "activities_delayed": delayed,
            "activities_blocked": blocked,
            "critical_activities_delayed": critical_delayed,
            "avg_delay_days": avg_delay_days,
            "max_delay_days": float(max_delay),
            "total_delay_till_date": float(total_delay),
            "schedule_variance": schedule_variance,
            "critical_path_length_remaining": float(remaining_planned_duration),
            "parallel_activities_running": in_progress,
            "pending_milestones": pending_milestones,
            "approval_delay_total": float(approval_delay_total),
            "vendor_delay_total": float(vendor_delay_total),
            "requirement_changes": requirement_changes,
            "design_changes": design_changes,
            "qa_issues": qa_issues,
            "fat_failures": fat_failures,
            "sat_failures": sat_failures,
            "technical_complexity": technical_complexity,
            "technology_maturity": technology_maturity,
            "foreign_dependency": foreign_dependency,
            "vendor_rating": vendor_rating,
            "remaining_planned_duration": float(remaining_planned_duration),
            "project_health_score": project_health_score,
            "open_risks": open_risks,
            "project_cost": project_cost,
            "planned_duration_months": planned_duration_months,
            
            # String columns for preprocessor encoding
            "ship_type": snapshot["ship_type"],
            
            # Target outputs
            "target_delay_percentage": delay_pct,
            "target_delay_months": delay_months,
            "target_risk_category": risk_category
        }
        
        return features

    @staticmethod
    def convert_snapshots_to_dataframe(snapshots: List[Dict[str, Any]]) -> pd.DataFrame:
        """Converts a list of snapshot dicts into a model-ready pandas DataFrame."""
        rows = []
        for snap in snapshots:
            rows.append(FeatureExtractor.extract_features(snap))
        return pd.DataFrame(rows)
