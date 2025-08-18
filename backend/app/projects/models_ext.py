from pydantic import BaseModel, Field
from typing import List, Optional

class ArtifactFile(BaseModel):
    path: str
    content: str

class Artifacts(BaseModel):
    files: List[ArtifactFile] = []
    html_preview: Optional[str] = None