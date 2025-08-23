from fastapi import APIRouter, HTTPException, Depends
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import uuid
from ..auth.utils import get_current_user  # Requires auth
from ..core.db import db
from ..llm.generator import generate_code_from_llm, stub_generate_code
from .services import doc_to_project

router = APIRouter()

class GenerateRequest(BaseModel):
    provider: str = "claude"  # "claude" | "gpt"
    prompt: str

@router.post("/projects/{project_id}/generate")
async def generate_code(
    project_id: str,
    request: GenerateRequest,
    current_user: dict = Depends(get_current_user)  # Auth required
):
    """Generate code and preview for a project - requires authentication"""
    
    # Get project
    project_doc = await db.projects.find_one({"_id": project_id})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = doc_to_project(project_doc)
    
    # Get chat history for context
    chat_doc = await db.chats.find_one({"_id": project_id})
    messages = chat_doc.get("messages", []) if chat_doc else []
    
    # Try LLM, fallback to stub
    mode = "ai"
    error = None
    try:
        out = await generate_code_from_llm(project.description, messages, request.provider)
        mode = "ai"
    except Exception as e:
        out = stub_generate_code(project.description, messages)
        mode = "stub"
        error = str(e)
    
    # Create artifacts object
    artifacts = {
        "files": out.get("files", []),
        "html_preview": out.get("html_preview", ""),
        "mode": mode,
        "error": error,
        "generated_at": datetime.utcnow(),
        "provider": request.provider,
        "user_id": current_user.get("sub")
    }
    
    # Update project with artifacts
    await db.projects.update_one(
        {"_id": project_id},
        {
            "$set": {
                "artifacts": artifacts,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Add assistant response to chat
    if mode == "ai" and out.get("files"):
        assistant_message = {
            "role": "assistant", 
            "content": f"Generated {len(out['files'])} file(s) and preview",
            "timestamp": datetime.utcnow(),
            "artifacts": artifacts
        }
        
        await db.chats.update_one(
            {"_id": project_id},
            {"$push": {"messages": assistant_message}},
            upsert=True
        )
    
    return artifacts