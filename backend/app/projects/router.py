from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import uuid
from ..core.db import db
from .models import Project, ProjectCreate
from .services import compute_plan, doc_to_project

router = APIRouter()

class ScaffoldRequest(BaseModel):
  provider: Optional[str] = "auto"  # "claude" | "gpt" | "auto"
  model: Optional[str] = None

@router.post("/projects", response_model=Project)
async def create_project(payload: ProjectCreate):
    project = Project(**payload.dict())
    doc = project.dict()
    doc["_id"] = project.id
    await db.projects.insert_one(doc)
    return project

@router.get("/projects", response_model=List[Project])
async def list_projects():
    docs = await db.projects.find().sort("created_at", -1).to_list(500)
    return [doc_to_project(d) for d in docs]

@router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    doc = await db.projects.find_one({"_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    return doc_to_project(doc)

@router.get("/projects/{project_id}/runs")
async def list_runs(project_id: str) -> List[Dict[str, Any]]:
    docs = await db.runs.find({"project_id": project_id}).sort("created_at", -1).to_list(200)
    out = []
    for d in docs:
        out.append({
            "id": d.get("_id"),
            "project_id": d.get("project_id"),
            "provider": d.get("provider"),
            "model": d.get("model"),
            "mode": d.get("mode"),
            "status": d.get("status"),
            "error": d.get("error"),
            "plan_counts": d.get("plan_counts", {}),
            "created_at": d.get("created_at"),
        })
    return out

@router.post("/projects/{project_id}/scaffold", response_model=Project)
async def scaffold_project(project_id: str, payload: ScaffoldRequest | None = None):
    doc = await db.projects.find_one({"_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")

    provider = (payload.provider if payload else "auto") if payload else "auto"
    model = payload.model if payload else None
    prj = doc_to_project(doc)

    plan, meta = await compute_plan(prj.description, provider, model)
    prj.plan = plan
    prj.status = "planned"
    prj.updated_at = datetime.utcnow()

    await db.projects.update_one(
        {"_id": project_id},
        {"$set": {
            "plan": plan.dict(),
            "status": prj.status,
            "updated_at": prj.updated_at,
        }}
    )

    # Record a run for history
    run_doc = {
        "_id": str(uuid.uuid4()),
        "project_id": project_id,
        "provider": meta.get("provider"),
        "model": meta.get("model"),
        "mode": meta.get("mode"),
        "status": "success",
        "error": meta.get("error"),
        "plan_counts": {
            "frontend": len(plan.frontend or []),
            "backend": len(plan.backend or []),
            "database": len(plan.database or []),
        },
        "created_at": datetime.utcnow(),
    }
    await db.runs.insert_one(run_doc)

    return prj