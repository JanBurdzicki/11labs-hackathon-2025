from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import io
import httpx

from app.services.tts import TTSService

router = APIRouter()
tts_service = TTSService()

class TTSRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    model_id: Optional[str] = None
    output_format: Optional[str] = None

class WebhookData(BaseModel):
    patient: str
    case_study: str
    history: list[dict]
    last_message: str

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

@router.post("/webhook")
async def send_webhook(data: WebhookData):
    webhook_url = "https://n8n.remedium.md/webhook-test/e62fd279-e228-4fae-bdde-44881c81d7cc"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(webhook_url, json=data.dict())
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Webhook request failed")
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
