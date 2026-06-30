"""
Snapshot Generator.
Helper class that orchestrates project execution simulation and extracts snapshots.
"""

from typing import Dict, Any, List, Tuple
from ml.simulation_engine import SimulationEngine

class SnapshotGenerator:
    def __init__(self, seed: int = 42):
        self.engine = SimulationEngine(seed)

    def generate_project_snapshots(self, project: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Simulate project lifecycle and extract incremental execution snapshots.
        """
        return self.engine.simulate_day_by_day(project)
