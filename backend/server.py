from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime


# Load env from backend/.env
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection (must use MONGO_URL from env)
mongo_url = os.environ.get('MONGO_URL')
if not mongo_url:
    raise RuntimeError("MONGO_URL is not set in backend/.env")

# Database name from env (no hardcoding)
db_name = os.environ.get('DB_NAME')
if not db_name:
    raise RuntimeError("DB_NAME is not set in backend/.env")

client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

# FastAPI app and /api router
app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class Plan(BaseModel):
    frontend: List[str] = []
    backend: List[str] = []
    database: List[str] = []


class ProjectBase(BaseModel):
    name: str
    description: str


class Project(ProjectBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "created"  # created | planned | generated
    plan: Optional[Plan] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ProjectCreate(ProjectBase):
    pass


# ---------- Helpers ----------

def _doc_to_project(doc: Dict[str, Any]) -> Project:
    # Normalize Mongo doc to Project model
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    # Mongo doc may contain _id; prefer that as id
    pid = doc.get("_id") or doc.get("id")
    if not pid:
        pid = str(uuid.uuid4())
    plan = None
    if doc.get("plan"):
        # Ensure keys exist and are lists
        plan_dict = doc["plan"]
        plan = Plan(**{
            "frontend": plan_dict.get("frontend", []),
            "backend": plan_dict.get("backend", []),
            "database": plan_dict.get("database", []),
        })
    return Project(
        id=str(pid),
        name=doc.get("name", "Unnamed"),
        description=doc.get("description", ""),
        status=doc.get("status", "created"),
        plan=plan,
        created_at=doc.get("created_at", datetime.utcnow()),
        updated_at=doc.get("updated_at", datetime.utcnow()),
    )


async def _compute_stub_plan(description: str) -> Plan:
    # Deterministic, fast stub for plan generation (LLM integration later)
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
    d = description.lower()
    if any(k in d for k in ["auth", "login", "users"]):
        extra.append("Auth module placeholder (JWT/OAuth ready)")
    if any(k in d for k in ["payment", "stripe", "checkout"]):
        extra.append("Stripe integration placeholder")
    # Append extra to backend plan if present
    if extra:
        base_backend.extend(extra)
    return Plan(frontend=base_frontend, backend=base_backend, database=base_db)


# ---------- Routes ----------
@api_router.get("/health")
async def health():
    try:
        await db.command("ping")
        return {"ok": True, "db": db_name}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@api_router.post("/projects", response_model=Project)
async def create_project(payload: ProjectCreate):
    project = Project(**payload.dict())
    doc = project.dict()
    # Use Mongo _id as string UUID to avoid ObjectId in responses
    doc["_id"] = project.id
    await db.projects.insert_one(doc)
    return project


@api_router.get("/projects", response_model=List[Project])
async def list_projects():
    docs = await db.projects.find().sort("created_at", -1).to_list(500)
    return [_doc_to_project(d) for d in docs]


@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    doc = await db.projects.find_one({"_id": project_id})
    return _doc_to_project(doc)


@api_router.post("/projects/{project_id}/scaffold", response_model=Project)
async def scaffold_project(project_id: str):
    doc = await db.projects.find_one({"_id": project_id})
    prj = _doc_to_project(doc)
    plan = await _compute_stub_plan(prj.description)
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


# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("webmatic")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()