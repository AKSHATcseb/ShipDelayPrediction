"""
Template service.
Business logic for creating, validating, and managing project workflow templates.
Includes DAG validation and critical path computation.
"""

import logging
from typing import List, Optional, Tuple
from collections import defaultdict, deque

from sqlalchemy.orm import Session

from backend.models.template import ProjectTemplate, ActivityTemplate

logger = logging.getLogger(__name__)


def validate_dependency_dag(activities: List[dict]) -> Tuple[bool, str]:
    """
    Validate that the dependency graph forms a valid DAG (no cycles).
    Activities are dicts with 'sequence_number' and 'dependency_list' keys.
    dependency_list contains sequence_numbers of predecessor activities.
    Returns (is_valid, error_message).
    """
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

    # Kahn's algorithm for topological sort / cycle detection
    queue = deque([s for s in seq_numbers if in_degree[s] == 0])
    visited = 0
    while queue:
        node = queue.popleft()
        visited += 1
        for neighbor in adj[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    if visited != len(seq_numbers):
        return False, "Circular dependency detected in activity graph"
    return True, ""


def topological_order(activities: List[dict]) -> List[dict]:
    """Return activities sorted in topological order based on dependencies."""
    seq_to_act = {a["sequence_number"]: a for a in activities}
    adj = defaultdict(list)
    in_degree = defaultdict(int)

    for a in activities:
        seq = a["sequence_number"]
        in_degree.setdefault(seq, 0)
        for dep in a.get("dependency_list", []):
            adj[dep].append(seq)
            in_degree[seq] += 1

    queue = deque(sorted([s for s in seq_to_act if in_degree[s] == 0]))
    result = []
    while queue:
        node = queue.popleft()
        result.append(seq_to_act[node])
        for neighbor in sorted(adj[node]):
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    return result


def create_template(db: Session, name: str, description: Optional[str],
                    activities_data: List[dict], created_by: Optional[int] = None,
                    feedback_loops: Optional[List[dict]] = None) -> ProjectTemplate:
    """Create a new project template with activity definitions."""
    # Validate DAG
    if activities_data:
        is_valid, error = validate_dependency_dag(activities_data)
        if not is_valid:
            raise ValueError(f"Invalid dependency graph: {error}")

    template = ProjectTemplate(
        name=name,
        description=description,
        created_by=created_by,
        feedback_loops=feedback_loops or []
    )
    db.add(template)
    db.flush()  # Get template.id

    for act_data in activities_data:
        activity = ActivityTemplate(
            template_id=template.id,
            name=act_data["name"],
            description=act_data.get("description"),
            category=act_data.get("category", "Other"),
            sequence_number=act_data["sequence_number"],
            parallel_group=act_data.get("parallel_group"),
            dependency_list=act_data.get("dependency_list", []),
            default_duration_months=act_data.get("default_duration_months", 1),
            historical_risk_weight=act_data.get("historical_risk_weight", 50.0),
            responsible_department=act_data.get("responsible_department"),
            is_milestone=act_data.get("is_milestone", False),
            is_critical_path=act_data.get("is_critical_path", False),
        )
        db.add(activity)

    db.commit()
    db.refresh(template)
    logger.info(f"Created template '{name}' with {len(activities_data)} activities.")
    return template


def get_template(db: Session, template_id: int) -> Optional[ProjectTemplate]:
    """Get a template by ID with all activity templates."""
    return db.query(ProjectTemplate).filter(ProjectTemplate.id == template_id).first()


def list_templates(db: Session, include_archived: bool = False) -> List[ProjectTemplate]:
    """List all templates, optionally including archived ones."""
    query = db.query(ProjectTemplate)
    if not include_archived:
        query = query.filter(ProjectTemplate.is_archived == False)  # noqa: E712
    return query.order_by(ProjectTemplate.created_at.desc()).all()


def update_template(db: Session, template_id: int, name: Optional[str] = None,
                    description: Optional[str] = None) -> Optional[ProjectTemplate]:
    """Update template metadata."""
    template = get_template(db, template_id)
    if not template:
        return None
    if name is not None:
        template.name = name
    if description is not None:
        template.description = description
    db.commit()
    db.refresh(template)
    return template


def duplicate_template(db: Session, template_id: int, new_name: str) -> Optional[ProjectTemplate]:
    """Deep-copy a template with a new name, remapping internal dependencies."""
    source = get_template(db, template_id)
    if not source:
        return None

    activities_data = []
    for act in source.activity_templates:
        activities_data.append({
            "name": act.name,
            "description": act.description,
            "category": act.category,
            "sequence_number": act.sequence_number,
            "parallel_group": act.parallel_group,
            "dependency_list": list(act.dependency_list) if act.dependency_list else [],
            "default_duration_months": act.default_duration_months,
            "historical_risk_weight": act.historical_risk_weight,
            "responsible_department": act.responsible_department,
            "is_milestone": act.is_milestone,
            "is_critical_path": act.is_critical_path,
        })

    return create_template(db, new_name, source.description, activities_data, source.created_by, source.feedback_loops)


def archive_template(db: Session, template_id: int) -> bool:
    """Soft-delete (archive) a template."""
    template = get_template(db, template_id)
    if not template:
        return False
    template.is_archived = True
    db.commit()
    logger.info(f"Archived template '{template.name}' (id={template_id}).")
    return True


def add_activity_to_template(db: Session, template_id: int, act_data: dict) -> Optional[ActivityTemplate]:
    """Add a new activity to an existing template."""
    template = get_template(db, template_id)
    if not template:
        return None

    # Validate updated DAG
    existing = [{"sequence_number": a.sequence_number, "dependency_list": a.dependency_list or []}
                for a in template.activity_templates]
    existing.append({"sequence_number": act_data["sequence_number"],
                     "dependency_list": act_data.get("dependency_list", [])})
    is_valid, error = validate_dependency_dag(existing)
    if not is_valid:
        raise ValueError(f"Adding activity would create invalid DAG: {error}")

    activity = ActivityTemplate(
        template_id=template_id,
        name=act_data["name"],
        description=act_data.get("description"),
        category=act_data.get("category", "Other"),
        sequence_number=act_data["sequence_number"],
        parallel_group=act_data.get("parallel_group"),
        dependency_list=act_data.get("dependency_list", []),
        default_duration_months=act_data.get("default_duration_months", 1),
        historical_risk_weight=act_data.get("historical_risk_weight", 50.0),
        responsible_department=act_data.get("responsible_department"),
        is_milestone=act_data.get("is_milestone", False),
        is_critical_path=act_data.get("is_critical_path", False),
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


def update_activity_template(db: Session, activity_id: int, updates: dict) -> Optional[ActivityTemplate]:
    """Update an activity template's properties."""
    activity = db.query(ActivityTemplate).filter(ActivityTemplate.id == activity_id).first()
    if not activity:
        return None

    for key, value in updates.items():
        if value is not None and hasattr(activity, key):
            setattr(activity, key, value)

    db.commit()
    db.refresh(activity)
    return activity


def delete_activity_template(db: Session, activity_id: int) -> bool:
    """Remove an activity template from its template."""
    activity = db.query(ActivityTemplate).filter(ActivityTemplate.id == activity_id).first()
    if not activity:
        return False
    db.delete(activity)
    db.commit()
    return True


def update_full_template(db: Session, template_id: int, name: str, description: Optional[str],
                         activities_data: List[dict], feedback_loops: Optional[List[dict]] = None) -> Optional[ProjectTemplate]:
    """Replace template details, activities and loops completely."""
    template = db.query(ProjectTemplate).filter(ProjectTemplate.id == template_id).first()
    if not template:
        return None

    # Validate DAG
    if activities_data:
        is_valid, error = validate_dependency_dag(activities_data)
        if not is_valid:
            raise ValueError(f"Invalid dependency graph: {error}")

    # Check name uniqueness if changed
    if name != template.name:
        existing = db.query(ProjectTemplate).filter(ProjectTemplate.name == name).first()
        if existing:
            raise ValueError(f"Template with name '{name}' already exists.")
        template.name = name

    template.description = description
    template.feedback_loops = feedback_loops or []

    # Delete existing activities
    db.query(ActivityTemplate).filter(ActivityTemplate.template_id == template_id).delete()

    # Re-create activities
    for act_data in activities_data:
        activity = ActivityTemplate(
            template_id=template_id,
            name=act_data["name"],
            description=act_data.get("description"),
            category=act_data.get("category", "Other"),
            sequence_number=act_data["sequence_number"],
            parallel_group=act_data.get("parallel_group"),
            dependency_list=act_data.get("dependency_list", []),
            default_duration_months=act_data.get("default_duration_months", 1),
            historical_risk_weight=act_data.get("historical_risk_weight", 50.0),
            responsible_department=act_data.get("responsible_department"),
            is_milestone=act_data.get("is_milestone", False),
            is_critical_path=act_data.get("is_critical_path", False),
        )
        db.add(activity)

    db.commit()
    db.refresh(template)
    return template
