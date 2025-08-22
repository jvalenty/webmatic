from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
from ..core.db import db
from .models import Project
from .services import doc_to_project
from ..llm.generator import generate_code_from_llm, stub_generate_code
from ..auth.utils import decode_token

router = APIRouter()

class ChatMessage(BaseModel):
    role: str
    content: str

class GenerateRequest(BaseModel):
    provider: Optional[str] = "claude"
    prompt: Optional[str] = None

@router.get("/projects/{project_id}/chat")
async def get_chat(project_id: str) -> Dict[str, Any]:
    doc = await db.projects.find_one({"_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    chat_doc = await db.chats.find_one({"_id": project_id})
    return {"messages": chat_doc.get("messages", []) if chat_doc else []}

@router.post("/projects/{project_id}/chat")
async def append_chat(project_id: str, msg: ChatMessage):
    doc = await db.projects.find_one({"_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.chats.update_one(
        {"_id": project_id},
        {"$push": {"messages": {"role": msg.role, "content": msg.content, "ts": datetime.utcnow()}}},
        upsert=True,
    )
    return {"ok": True}

@router.post("/projects/{project_id}/generate")
async def generate_project_output(project_id: str, request: Request, payload: GenerateRequest):
    # Require auth
    auth = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth or not auth.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = auth.split(" ", 1)[1]
    user = decode_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid token")

    doc = await db.projects.find_one({"_id": project_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Project not found")

    # load chat messages
    chat_doc = await db.chats.find_one({"_id": project_id})
    messages = chat_doc.get("messages", []) if chat_doc else []
    # Append the latest user prompt into chat if provided
    if payload.prompt and payload.prompt.strip():
        messages.append({"role": "user", "content": payload.prompt.strip(), "ts": datetime.utcnow()})
        await db.chats.update_one(
            {"_id": project_id},
            {"$push": {"messages": {"role": "user", "content": payload.prompt.strip(), "ts": datetime.utcnow()}}},
            upsert=True,
        )

    prj = doc_to_project(doc)

    # Try LLM, fallback to stub
    mode = "ai"
    error = None
    try:
        print(f"DEBUG: Attempting LLM generation for project {project_id} with provider {payload.provider}")
        out = await generate_code_from_llm(prj.description, messages, payload.provider)
        mode = "ai"
        print(f"DEBUG: LLM generation successful, got {len(out.get('files', []))} files")
    except Exception as e:
        print(f"DEBUG: LLM generation failed: {e}")
        import traceback
        traceback.print_exc()
        out = stub_generate_code(prj.description, messages)
        mode = "stub"
        error = str(e)

    files = out.get("files", [])
    html_preview = out.get("html_preview", "")

    # Persist artifacts on project doc
    await db.projects.update_one(
        {"_id": project_id},
        {"$set": {"artifacts": {"files": files, "html_preview": html_preview, "mode": mode}, "status": "generated", "updated_at": datetime.utcnow()}},
    )

    # Record a run
    run = {
        "_id": str(uuid.uuid4()),
        "project_id": project_id,
        "provider": payload.provider,
        "model": None,
        "mode": mode,
        "status": "success",
        "artifact_counts": {"files": len(files)},
        "error": error,
        "created_at": datetime.utcnow(),
    }
    await db.runs.insert_one(run)

    return {"files": files, "html_preview": html_preview, "mode": mode, "error": error}