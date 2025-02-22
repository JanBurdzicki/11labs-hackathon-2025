import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from elevenlabs.client import ElevenLabs
from elevenlabs.conversational_ai.conversation import Conversation
from elevenlabs.conversational_ai.default_audio_interface import DefaultAudioInterface
import uvicorn

load_dotenv()

app = FastAPI()

AGENT_ID = os.getenv("AGENT_ID")
API_KEY = os.getenv("ELEVENLABS_API_KEY")

# Sprawdzanie, czy wymagane zmienne środowiskowe są ustawione
if not AGENT_ID:
    raise HTTPException(status_code=400, detail="AGENT_ID environment variable must be set")

if not API_KEY:
    raise HTTPException(status_code=400, detail="ELEVENLABS_API_KEY not set, assuming the agent is public")

client = ElevenLabs(api_key=API_KEY)
conversation = None

@app.post("/start_session")
def start_session():
    global conversation

    if conversation:
        raise HTTPException(status_code=400, detail="A session is already active")

    try:
        conversation = Conversation(
            client=client,
            agent_id=AGENT_ID,
            requires_auth=bool(API_KEY),
            audio_interface=DefaultAudioInterface(),
            callback_agent_response=lambda response: print(f"Agent: {response}"),
            callback_agent_response_correction=lambda original, corrected: print(f"Agent: {original} -> {corrected}"),
            callback_user_transcript=lambda transcript: print(f"User: {transcript}"),
        )
        conversation.start_session()
        return {"message": "Session started"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start session: {str(e)}")

@app.post("/end_session")
def end_session():
    global conversation

    if not conversation:
        raise HTTPException(status_code=400, detail="No active session to end")

    try:
        conversation.end_session()
        conversation_id = conversation.wait_for_session_end()
        return {"message": "Session ended", "conversation_id": conversation_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to end session: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
