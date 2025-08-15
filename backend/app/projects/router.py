from fastapi import APIRouter, HTTPException
from typing import List
from datetime import datetime
from ..core.db import db
from .models import Project, ProjectCreate
from .services import compute_stub_plan, doc_to_project

router = APIRouter()

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

@router.post("/projects/{project_id}/scaffold", response_model=Project)
async def scaffold_project(project_id: str):
    doc = await db.projects.find_one({"_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    prj = doc_to_project(doc)
    plan = await compute_stub_plan(prj.description)
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
    return prj