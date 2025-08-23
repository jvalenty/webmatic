from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from datetime import datetime
from pydantic import BaseModel
import uuid
from ..auth.utils import get_current_user_optional
from ..core.db import db
from .services import doc_to_project

router = APIRouter()

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str
    timestamp: datetime = None

class AppendChatRequest(BaseModel):
    content: str
    role: str = "user"

@router.get("/projects/{project_id}/chat")
async def get_chat_history(project_id: str):
    """Get chat history for a project - no auth required for reading"""
    chat_doc = await db.chats.find_one({"_id": project_id})
    if not chat_doc:
        return {"messages": []}
    
    return {"messages": chat_doc.get("messages", [])}

@router.post("/projects/{project_id}/chat")
async def append_chat_message(
    project_id: str, 
    request: AppendChatRequest,
    current_user: dict = Depends(get_current_user_optional)
):
    """Append message to chat history - auth optional"""
    # Verify project exists
    project_doc = await db.projects.find_one({"_id": project_id})
    if not project_doc:
        raise HTTPException(status_code=404, detail="Project not found")
    
    message = {
        "role": request.role,
        "content": request.content,
        "timestamp": datetime.utcnow(),
        "user_id": current_user.get("sub") if current_user else None
    }
    
    # Upsert chat document
    await db.chats.update_one(
        {"_id": project_id},
        {
            "$push": {"messages": message},
            "$set": {"updated_at": datetime.utcnow()}
        },
        upsert=True
    )
    
    return {"success": True, "message": message}