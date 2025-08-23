from typing import Dict, Any, List, Tuple
from .models import Project, Plan, Artifacts, ArtifactFile
from datetime import datetime
from ..llm.planner import plan_from_llm

def stub_generate_plan(description: str) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Stub plan generation for fallback"""
    plan_dict = {
        "frontend": ["React components", "Responsive design", "State management"],
        "backend": ["API endpoints", "Authentication", "Database models"],
        "database": ["User table", "Project table", "Session storage"]
    }
    meta = {"mode": "stub", "provider": "stub"}
    return plan_dict, meta

async def compute_plan(description: str, provider: str = "auto", model: str = None, prompt: str = None) -> Tuple[Plan, Dict[str, Any]]:
    """Generate a plan for the project"""
    try:
        plan = await plan_from_llm(description, provider, model)
        meta = {"mode": "ai", "provider": provider}
        return plan, meta
    except Exception as e:
        # Fallback to stub
        plan_dict, meta = stub_generate_plan(description)
        plan = Plan(**plan_dict)
        meta["error"] = str(e)
        meta["mode"] = "stub"
        return plan, meta

def doc_to_project(doc: Dict[str, Any]) -> Project:
    """Convert MongoDB document to Project model"""
    # Handle _id -> id conversion
    if "_id" in doc:
        doc["id"] = doc.pop("_id")
    
    # Ensure artifacts is properly structured
    if "artifacts" in doc and doc["artifacts"]:
        artifacts_dict = doc["artifacts"]
        # Convert files to proper structure if needed
        if "files" in artifacts_dict and isinstance(artifacts_dict["files"], list):
            files = []
            for f in artifacts_dict["files"]:
                if isinstance(f, dict) and "path" in f and "content" in f:
                    files.append(ArtifactFile(**f))
                else:
                    # Handle malformed file objects
                    files.append(ArtifactFile(path=str(f.get("path", "unknown")), content=str(f.get("content", ""))))
            artifacts_dict["files"] = files
        
        doc["artifacts"] = Artifacts(**artifacts_dict)
    
    # Handle plan structure
    if "plan" in doc and doc["plan"]:
        doc["plan"] = Plan(**doc["plan"])
    
    return Project(**doc)

def project_to_doc(project: Project) -> Dict[str, Any]:
    """Convert Project model to MongoDB document"""
    doc = project.dict()
    doc["_id"] = doc.pop("id")  # Convert id -> _id for MongoDB
    return doc