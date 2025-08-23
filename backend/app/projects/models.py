from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class Plan(BaseModel):
    frontend: List[str] = []
    backend: List[str] = []
    database: List[str] = []

class ArtifactFile(BaseModel):
    path: str
    content: str

class Artifacts(BaseModel):
    files: List[ArtifactFile] = []
    html_preview: Optional[str] = None
    mode: Optional[str] = None  # "ai" | "stub"
    error: Optional[str] = None
    generated_at: Optional[datetime] = None
    provider: Optional[str] = None
    user_id: Optional[str] = None

class ProjectBase(BaseModel):
    name: str
    description: str

class Project(ProjectBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "created"  # created | planned | generated
    plan: Optional[Plan] = None
    artifacts: Optional[Artifacts] = None
    chat_history: Optional[List[Dict[str, Any]]] = None  # For backward compatibility
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None