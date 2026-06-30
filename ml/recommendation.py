"""
Recommendation Engine.
Generates context-aware, actionable project management recommendations based on delay predictions.
"""

from typing import Dict, Any, List
from ml.feature_extractor import FeatureExtractor

class RecommendationEngine:
    @staticmethod
    def generate_recommendations(project_state: Dict[str, Any], prediction: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Runs rule-based logic to map delay predictions and risk drivers to steering recommendations.
        """
        features = FeatureExtractor.extract_features(project_state)
        recs = []

        # Rule 1: High Approval delays
        if features["approval_delay_total"] > 30.0:
            recs.append({
                "category": "Administrative",
                "recommendation": "Escalate administrative holds: Convene a fast-track clearance desk with Ministry representatives to clear bureaucratic bottlenecks.",
                "priority": "High"
            })

        # Rule 2: Critical path delays
        if features["critical_activities_delayed"] > 0:
            recs.append({
                "category": "Critical Path Steering",
                "recommendation": f"Critical path alert: {int(features['critical_activities_delayed'])} activities on the critical path are delayed. Reallocate shipyard labor from float tasks.",
                "priority": "Critical"
            })

        # Rule 3: Vendor/Procurement delays
        if features["vendor_delay_total"] > 45.0 or features["vendor_rating"] < 3.2:
            recs.append({
                "category": "Supply Chain",
                "recommendation": "Increase vendor oversight: Establish daily progress updates and deploy onsite shipyard liaisons to foreign OEM manufacturing units.",
                "priority": "High"
            })

        # Rule 4: High Requirement changes
        if features["requirement_changes"] > 3:
            recs.append({
                "category": "Scope Management",
                "recommendation": "Freeze design baseline: Implement a strict configuration control board (CCB) and halt additional equipment changes immediately.",
                "priority": "Critical"
            })

        # Rule 5: Quality/Testing failures
        if (features["qa_issues"] + features["fat_failures"] + features["sat_failures"]) > 3:
            recs.append({
                "category": "Quality Assurance",
                "recommendation": "Deploy specialized QA engineers to verify weld integrity and component wiring prior to official harbor acceptance trials.",
                "priority": "High"
            })

        # Rule 6: Foreign OEM dependency
        if features["foreign_dependency"] == 1 and prediction["risk_category"] in ["High", "Critical"]:
            recs.append({
                "category": "Strategic Risk Mitigation",
                "recommendation": "Trigger import-substitution backup options: Evaluate local defense vendors for non-propulsion ancillary systems.",
                "priority": "Medium"
            })

        # Rule 7: High general risk
        if prediction["risk_category"] == "Critical":
            recs.append({
                "category": "Executive Governance",
                "recommendation": "Convene emergency Project Management Group (PMG) review with naval leadership to re-baseline the project and approve budget reserves.",
                "priority": "Critical"
            })
            
        # Fallback if no specific rule matched
        if not recs:
            recs.append({
                "category": "Monitoring",
                "recommendation": "Continue standard weekly monitoring. Keep progress updates rolling daily.",
                "priority": "Low"
            })

        return recs
