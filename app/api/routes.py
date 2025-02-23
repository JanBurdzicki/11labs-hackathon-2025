from fastapi import APIRouter, HTTPException, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import io
import httpx

from app.services.tts import TTSService
from app.core.config import settings

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

@router.post("/webhook_form")
async def send_webhook_form(
    patient: str = Form(...),
    case_study: str = Form(...),
    user_message: str = Form(...),
    patient_message: str = Form(...),
    last_message: str = Form(...)
):
    # Convert form data into the expected WebhookData structure
    data = {
        "patient": patient,
        "case-study": case_study,
        "history": [
            {"type": "user", "message": user_message},
            {"type": "patient", "message": patient_message}
        ],
        "last-message": last_message
    }
    
    webhook_url = settings.WEBHOOK_URL
    # print(webhook_url)
    
    try:
        async with httpx.AsyncClient() as client:
            # print(data)
            response = await client.post(webhook_url, json=data)
            response.raise_for_status()  # raises an exception for non-2xx responses
            return response.json()
    except httpx.HTTPError as http_err:
        # Log the HTTP error properly instead of printing debug remnants.
        print(f"Webhook HTTP error: {http_err}") 
        raise HTTPException(status_code=500, detail=f"Webhook HTTP error: {http_err}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

@router.get("/config")
async def get_config():
    return {"webhook_url": settings.WEBHOOK_URL}

@router.post("/webhook_tts")
async def webhook_tts():
    # Simulate webhook POST that returns TTS audio of "hello"
    audio, error = tts_service.generate_speech(text="hello")
    if error:
        raise HTTPException(status_code=500, detail=error)
    if not audio:
        raise HTTPException(status_code=500, detail="Failed to generate audio")
    audio_io = io.BytesIO(audio)
    audio_io.seek(0)
    return StreamingResponse(
        audio_io,
        media_type='audio/mpeg',
        headers={'Content-Disposition': 'attachment; filename="hello.mp3"'}
    )
