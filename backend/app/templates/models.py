from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

class TemplateManifest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    description: str
    tags: List[str] = []
    prompts: Dict[str, str] = {}  # { system, user }
    entities: List[Dict[str, Any]] = []
    api_endpoints: List[str] = []
    ui_structure: List[str] = []
    integrations: List[str] = []
    acceptance_criteria: List[str] = []
    tests: List[str] = []
    version: str = "1.0.0"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)