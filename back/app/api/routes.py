from fastapi import APIRouter, HTTPException, Form, File, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import io
import httpx

from app.services.tts import TTSService
from app.services.stt import STTService
from app.core.config import settings

router = APIRouter()
tts_service = TTSService()
stt_service = STTService()

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
async def send_webhook_form(data: WebhookData):
    webhook_url = settings.WEBHOOK_URL
    if not webhook_url:
        raise HTTPException(status_code=500, detail="Webhook URL not configured")

    print(f"Sending webhook to: {webhook_url}")
    print(f"Payload: {data.dict()}")
    
    payload = {
        "patient": data.patient,
        "case-study": data.case_study,
        "history": [{"type": item["type"], "message": item["message"]} for item in data.history],
        "last-message": data.last_message
    }
    
    try:
        async with httpx.AsyncClient() as client:
            print(f"Sending POST request to {webhook_url}")
            response = await client.post(
                webhook_url, 
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            )
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.text}")
            
            if response.status_code == 405:
                raise HTTPException(
                    status_code=500, 
                    detail="Webhook endpoint does not allow POST method. Please check the webhook URL and allowed methods."
                )
            
            response.raise_for_status()
            return response.json()
            
    except httpx.HTTPStatusError as http_err:
        error_msg = f"HTTP error occurred: {http_err.response.status_code} - {http_err.response.text}"
        print(error_msg)
        raise HTTPException(status_code=http_err.response.status_code, detail=error_msg)
    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)

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

@router.post("/stt_whisper")
async def stt_whisper(audio_file: UploadFile = File(...)):
    audio_bytes = await audio_file.read()
    transcript, error = stt_service.transcribe_audio(audio_bytes)
    
    if error:
        raise HTTPException(status_code=500, detail=f"Transcription error: {error}")
    
    if not transcript:
        raise HTTPException(status_code=500, detail="Failed to transcribe audio")
        
    print("Transcribed:", transcript)
    return {"status": "success", "transcript": transcript}
