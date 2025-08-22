from fastapi import APIRouter, HTTPException
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import uuid
import logging
from ..core.db import db
from .models import Project, ProjectCreate
from .services import compute_plan, doc_to_project
from .quality import score_plan
from ..llm.constants import is_allowed_model, ALLOWED_MODELS

router = APIRouter()
logger = logging.getLogger("webmatic")

class ScaffoldRequest(BaseModel):
  provider: Optional[str] = "auto"  # "claude" | "gpt" | "auto"
  model: Optional[str] = None
  prompt: Optional[str] = None

class ProjectUpdate(BaseModel):
  name: Optional[str] = None
  description: Optional[str] = None

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

@router.patch("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, payload: ProjectUpdate):
    doc = await db.projects.find_one({"_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    updates: Dict[str, Any] = {}
    if payload.name is not None:
        updates["name"] = payload.name
    if payload.description is not None:
        updates["description"] = payload.description
    if updates:
        updates["updated_at"] = datetime.utcnow()
        await db.projects.update_one({"_id": project_id}, {"$set": updates})
    new_doc = await db.projects.find_one({"_id": project_id})
    return doc_to_project(new_doc)

@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    # Check if project exists
    doc = await db.projects.find_one({"_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete the project
    await db.projects.delete_one({"_id": project_id})
    
    # Clean up related data
    await db.chats.delete_many({"_id": project_id})
    await db.runs.delete_many({"project_id": project_id})
    
    return {"ok": True, "message": f"Project {project_id} deleted successfully"}

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
            "quality_score": d.get("quality_score"),
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
    prompt = payload.prompt if payload else None

    if model and not is_allowed_model(model):
        logger.warning(f"Rejected unsupported model '{model}'. Allowed: {sorted(ALLOWED_MODELS)}")
        raise HTTPException(status_code=400, detail=f"Unsupported model. Allowed: {sorted(ALLOWED_MODELS)}")

    prj = doc_to_project(doc)

    plan, meta = await compute_plan(prj.description, provider, model, prompt)
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
    q, qd = score_plan(plan)
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
        "quality_score": q,
        "quality_detail": qd,
        "created_at": datetime.utcnow(),
    }
    await db.runs.insert_one(run_doc)

    return prj

# ---------- Provider comparison ----------
class CompareResponse(BaseModel):
    baseline: Dict[str, Any]
    variants: List[Dict[str, Any]]
    diff: Dict[str, Any]


def _list_to_set_map(plan_list: List[str]) -> set:
    return set([str(x).strip() for x in (plan_list or []) if str(x).strip()])


def _diff_plans(a: Dict[str, Any], b: Dict[str, Any]) -> Dict[str, Any]:
    # a/b have keys frontend/backend/database: List[str]
    out = {}
    for k in ["frontend", "backend", "database"]:
        sa = _list_to_set_map(a.get(k, []))
        sb = _list_to_set_map(b.get(k, []))
        out[k] = {
            "only_in_a": sorted(list(sa - sb)),
            "only_in_b": sorted(list(sb - sa)),
            "overlap": sorted(list(sa & sb)),
        }
    return out

@router.post("/projects/{project_id}/compare-providers")
async def compare_providers(project_id: str):
    doc = await db.projects.find_one({"_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")

    prj = doc_to_project(doc)

    combos = [
        ("claude", "claude-4-sonnet"),
        ("gpt", "gpt-5"),
    ]

    results = []
    for provider, model in combos:
        plan, meta = await compute_plan(prj.description, provider, model)
        # store run record but do not update project
        q, qd = score_plan(plan)
        run_doc = {
            "_id": str(uuid.uuid4()),
            "project_id": project_id,
            "provider": meta.get("provider"),
            "model": meta.get("model"),
            "mode": meta.get("mode"),
            "status": "success",
            "plan_counts": {
                "frontend": len(plan.frontend or []),
                "backend": len(plan.backend or []),
                "database": len(plan.database or []),
            },
            "quality_score": q,
            "quality_detail": qd,
            "created_at": datetime.utcnow(),
        }
        await db.runs.insert_one(run_doc)
        results.append({
            "provider": provider,
            "model": model,
            "plan": plan.dict(),
            "meta": meta,
        })

    # first is baseline
    baseline = results[0]
    variants = results[1:]

    diff = _diff_plans(baseline["plan"], variants[0]["plan"]) if variants else {}

    return CompareResponse(baseline=baseline, variants=variants, diff=diff)