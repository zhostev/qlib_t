from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class ModelVersionBase(BaseModel):
    experiment_id: int
    version: int
    name: str
    metrics: Optional[Dict[str, Any]] = None
    path: str
    performance: Optional[Dict[str, Any]] = None

class ModelVersionCreate(ModelVersionBase):
    pass

class ModelVersionResponse(ModelVersionBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
