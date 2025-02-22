from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import io

from app.services.tts import TTSService

router = APIRouter()
tts_service = TTSService()

class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    model_id: Optional[str] = None
    output_format: Optional[str] = None

@router.post("/tts")
async def text_to_speech(request: TTSRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")
        
    audio, error = tts_service.generate_speech(
        text=request.text,
        voice_id=request.voice_id,
        model_id=request.model_id,
        output_format=request.output_format
    )

    if error:
        raise HTTPException(status_code=500, detail=error)

    if not audio:
        raise HTTPException(status_code=500, detail="Failed to generate audio")

    audio_io = io.BytesIO(audio)
    audio_io.seek(0)
    
    return StreamingResponse(
        audio_io,
        media_type='audio/mpeg',
        headers={'Content-Disposition': 'attachment; filename="speech.mp3"'}
    )
