from pydantic import BaseModel, Field
from typing import List, Optional
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

class ProjectBase(BaseModel):
    name: str
    description: str

class Project(ProjectBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: str = "created"  # created | planned | generated
    plan: Optional[Plan] = None
    artifacts: Optional[Artifacts] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ProjectCreate(ProjectBase):
    pass