from typing import Any, Dict
from datetime import datetime
from .models import Plan, Project

async def compute_stub_plan(description: str) -> Plan:
    base_frontend = [
        "Scaffold React app shell",
        "Header with brand + project switcher",
        "Project creation form (name, description)",
        "Projects table with status and actions",
        "Detail panel with tabs: Plan, API, DB",
    ]
    base_backend = [
        "FastAPI with /api prefix and CORS",
        "Projects CRUD (UUID as id, _id in Mongo)",
        "Scaffold endpoint to produce initial plan",
        "Pydantic v2 models + validation",
    ]
    base_db = [
        "Mongo collections: projects, runs, logs",
        "Indexes: projects(_id), projects(status)",
        "Document schema: id, name, description, plan",
    ]

    extra = []
    d = (description or "").lower()
    if any(k in d for k in ["auth", "login", "users"]):
        extra.append("Auth module placeholder (JWT/OAuth ready)")
    if any(k in d for k in ["payment", "stripe", "checkout"]):
        extra.append("Stripe integration placeholder")
    if extra:
        base_backend.extend(extra)

    return Plan(frontend=base_frontend, backend=base_backend, database=base_db)


def doc_to_project(doc: Dict[str, Any]) -> Project:
    if not doc:
        raise ValueError("Project not found")
    pid = doc.get("_id") or doc.get("id")
    plan = None
    if doc.get("plan"):
        plan_dict = doc["plan"]
        plan = Plan(
            frontend=plan_dict.get("frontend", []),
            backend=plan_dict.get("backend", []),
            database=plan_dict.get("database", []),
        )
    return Project(
        id=str(pid),
        name=doc.get("name", "Unnamed"),
        description=doc.get("description", ""),
        status=doc.get("status", "created"),
        plan=plan,
        created_at=doc.get("created_at", datetime.utcnow()),
        updated_at=doc.get("updated_at", datetime.utcnow()),
    )