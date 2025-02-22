from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from services.tts_service import TTSService
from models import TTSRequest
import io
import uvicorn

app = FastAPI(title="Text-to-Speech API")

# Dodajemy CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],  # Explicitly allow POST
    allow_headers=["*"],
)

tts_service = TTSService()

# Najpierw definiujemy API endpoints
@app.post("/api/tts")
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
    audio_io.seek(0)  # Reset pointer to beginning of stream
    
    return StreamingResponse(
        audio_io,
        media_type='audio/mpeg',
        headers={
            'Content-Disposition': 'attachment; filename="speech.mp3"'
        }
    )

# Na końcu montujemy pliki statyczne
app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
