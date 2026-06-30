"""
Template Generator.
Generates randomized variants of baseline templates for synthetic dataset diversity.
Validates DAG structures using topological sort.
"""

import numpy as np
from typing import List, Dict, Any, Tuple
from collections import defaultdict, deque

from ml.constants import DEFAULT_TEMPLATES

class TemplateGenerator:
    def __init__(self, seed: int = 42):
        self.rng = np.random.default_rng(seed)

    def validate_dag(self, activities: List[Dict[str, Any]]) -> Tuple[bool, str]:
        """Verify that the activities' dependency graph does not contain cycles."""
        seq_numbers = {a["sequence_number"] for a in activities}
        adj = defaultdict(list)
        in_degree = defaultdict(int)

        for a in activities:
            seq = a["sequence_number"]
            in_degree.setdefault(seq, 0)
            for dep in a.get("dependency_list", []):
                if dep not in seq_numbers:
                    return False, f"Activity {seq} depends on non-existent sequence {dep}"
                adj[dep].append(seq)
                in_degree[seq] += 1

        # Kahn's algorithm
        queue = deque([s for s in seq_numbers if in_degree[s] == 0])
        visited = 0
        while queue:
            node = queue.popleft()
            visited += 1
            for neighbor in adj[node]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)

        if visited != len(activities):
            return False, "Circular dependency detected"
        return True, ""

    def generate_template(self, template_type: str) -> List[Dict[str, Any]]:
        """
        Produce a randomized version of a default template type.
        Applies ±20% duration jitter to simulate different shipyard speeds.
        """
        if template_type not in DEFAULT_TEMPLATES:
            template_types = list(DEFAULT_TEMPLATES.keys())
            template_type = self.rng.choice(template_types)

        base_activities = DEFAULT_TEMPLATES[template_type]
        modified_activities = []

        for act in base_activities:
            # Jitter default duration by ±20%
            base_dur = act["default_duration_months"]
            jitter_pct = self.rng.uniform(-0.20, 0.20)
            new_dur = int(max(1, round(base_dur * (1.0 + jitter_pct))))

            # Risk weight adjustment by ±10
            base_risk = act["historical_risk_weight"]
            new_risk = float(max(5.0, min(95.0, base_risk + self.rng.uniform(-10.0, 10.0))))

            modified_activities.append({
                "name": act["name"],
                "category": act["category"],
                "sequence_number": act["sequence_number"],
                "dependency_list": list(act["dependency_list"]),
                "default_duration_months": new_dur,
                "historical_risk_weight": round(new_risk, 1),
                "responsible_department": act.get("responsible_department"),
                "is_milestone": act["is_milestone"],
                "is_critical_path": act["is_critical_path"],
                "parallel_group": act.get("parallel_group")
            })

        # Verify DAG validity
        is_valid, err = self.validate_dag(modified_activities)
        if not is_valid:
            # Fallback to copy of exact base if validation fails
            return [dict(a) for a in base_activities]

        return modified_activities
