from pydantic import BaseModel
from typing import Optional

class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    model_id: Optional[str] = None
    output_format: Optional[str] = None

class ErrorResponse(BaseModel):
    error: str
