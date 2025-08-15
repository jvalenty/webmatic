from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

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