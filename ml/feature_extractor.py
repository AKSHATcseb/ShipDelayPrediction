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

        # Extract loop connections
        loops = snapshot.get("feedback_loops", snapshot.get("feedbackLoops", []))
        
        # Build normal dependency graph: u -> v if v depends on u
        n = len(activities)
        seq_to_idx = {act.get("sequence_number", act.get("sequenceNumber", 0)): i for i, act in enumerate(activities)}
        
        adj = {i: [] for i in range(n)}
        for idx, act in enumerate(activities):
            deps = act.get("dependency_list", act.get("dependencyList", []))
            for dep in deps:
                if isinstance(dep, int) and 0 <= dep < n:
                    adj[dep].append(idx)
        
        # Reversed adjacency list for reachability to u
        adj_rev = {i: [] for i in range(n)}
        for node, neighbors in adj.items():
            for neighbor in neighbors:
                adj_rev[neighbor].append(node)
                
        def get_reachable(start_node, adj_dict):
            visited = set()
            stack = [start_node]
            while stack:
                node = stack.pop()
                if node not in visited:
                    visited.add(node)
                    for neighbor in adj_dict.get(node, []):
                        if neighbor not in visited:
                            stack.append(neighbor)
            return visited

        cycle_sets = []
        loop_iteration_limits = []
        expected_avg_iterations_list = []
        loop_probabilities = []
        
        for l in loops:
            try:
                src_seq = int(l.get("sourceActivity", l.get("source_activity", 0)))
                dest_seq = int(l.get("destinationActivity", l.get("destination_activity", 0)))
            except (ValueError, TypeError):
                continue
                
            if src_seq not in seq_to_idx or dest_seq not in seq_to_idx:
                continue
                
            u = seq_to_idx[src_seq]
            v = seq_to_idx[dest_seq]
            
            # Find cycle nodes
            r_from_v = get_reachable(v, adj)
            r_to_u = get_reachable(u, adj_rev)
            c_nodes = (r_from_v & r_to_u) | {u, v}
            cycle_sets.append(c_nodes)
            
            # Extract config
            config = l.get("loopConfiguration", l.get("loop_configuration", {}))
            max_iter = config.get("maxIterations", config.get("max_iterations", 5))
            avg_iter = config.get("expectedAvgIterations", config.get("expected_avg_iterations", 2))
            prob = 1.0
            
            loop_iteration_limits.append(max_iter)
            expected_avg_iterations_list.append(avg_iter)
            loop_probabilities.append(prob)

        # Compute loop features
        loop_count = len(loops)
        
        all_cycle_nodes = set()
        for c in cycle_sets:
            all_cycle_nodes.update(c)
        activities_in_loops = len(all_cycle_nodes)
        
        max_loop_depth = max(len(c) for c in cycle_sets) if cycle_sets else 0
        avg_loop_length = float(np.mean([len(c) for c in cycle_sets])) if cycle_sets else 0.0
        loop_iteration_limit = max(loop_iteration_limits) if loop_iteration_limits else 0
        historical_loop_iterations = float(np.mean(expected_avg_iterations_list)) if expected_avg_iterations_list else 0.0
        
        # Loop Delay Ratio
        total_duration_all_acts = sum(act.get("duration_months", act.get("durationMonths", 1.0)) for act in activities)
        if total_duration_all_acts <= 0:
            total_duration_all_acts = 1.0
            
        loop_expected_delays = 0.0
        for idx, c_nodes in enumerate(cycle_sets):
            prob = loop_probabilities[idx]
            avg_iter = expected_avg_iterations_list[idx]
            cycle_dur = sum(activities[i].get("duration_months", activities[i].get("durationMonths", 1.0)) for i in c_nodes)
            loop_expected_delays += prob * avg_iter * cycle_dur
            
        loop_delay_ratio = float(loop_expected_delays / total_duration_all_acts)
        loop_completion_efficiency = float(1.0 / (1.0 + historical_loop_iterations)) if loop_count > 0 else 1.0
        
        # Critical Loop Presence
        critical_indices = {i for i, act in enumerate(activities) if act.get("is_critical_path", act.get("isCriticalPath", False))}
        critical_loop_presence = 1 if (critical_indices & all_cycle_nodes) else 0
        
        # Percentage of Critical Path in Loop
        num_critical = len(critical_indices)
        critical_in_loop = len(critical_indices & all_cycle_nodes)
        pct_critical_in_loop = float(critical_in_loop / num_critical * 100.0) if num_critical > 0 else 0.0
        
        # Loop Dependency Density
        num_normal_edges = sum(len(act.get("dependency_list", act.get("dependencyList", []))) for act in activities)
        num_loop_edges = len(loops)
        total_edges = num_normal_edges + num_loop_edges
        loop_dependency_density = float(num_loop_edges / total_edges) if total_edges > 0 else 0.0
        
        # Rework Frequency
        rework_frequency = float(sum(expected_avg_iterations_list))

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
            
            # Loop features
            "loop_count": loop_count,
            "activities_in_loops": activities_in_loops,
            "max_loop_depth": max_loop_depth,
            "avg_loop_length": avg_loop_length,
            "loop_iteration_limit": loop_iteration_limit,
            "historical_loop_iterations": historical_loop_iterations,
            "loop_delay_ratio": loop_delay_ratio,
            "loop_completion_efficiency": loop_completion_efficiency,
            "critical_loop_presence": critical_loop_presence,
            "pct_critical_in_loop": pct_critical_in_loop,
            "loop_dependency_density": loop_dependency_density,
            "rework_frequency": rework_frequency,
            
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
