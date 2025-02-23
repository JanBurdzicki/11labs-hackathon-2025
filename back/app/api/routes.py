from fastapi import APIRouter, HTTPException, File, UploadFile
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
    """
    Przyjmujemy w całości JSON pasujący do WebhookData:
    {
      "patient": "Imię i nazwisko",
      "case_study": "Opis przypadku",
      "history": [
        {"type": "user", "message": "..."},
        {"type": "patient", "message": "..."}
      ],
      "last_message": "..."
    }
    """
    # Przygotowujemy dane do wysłania do "właściwego" webhooka:
    print("Received webhook data:", data, flush=True)
    payload = {
        "patient": data.patient,
        "case-study": data.case_study,   # Uwaga: w oryginale klucz był "case-study", jeśli webhook oczekuje myślnika
        "history": [
            {"type": h["type"], "message": h["message"]} for h in list(data.history)
        ],
        "last-message": data.last_message
    }
    
    webhook_url = settings.WEBHOOK_URL
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(webhook_url, json=payload)
            response.raise_for_status()  # wyrzuci wyjątek dla kodu 4xx/5xx
            return response.json()
    except httpx.HTTPError as http_err:
        print(f"Webhook HTTP error: {http_err}")
        raise HTTPException(status_code=500, detail=f"Webhook HTTP error: {http_err}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")

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
