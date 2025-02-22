from dotenv import load_dotenv
import os

load_dotenv(override=True)

VOICES = {
    "default_en": "JBFqnCBsd6RMkjVDRZzb",
    "jerzy": "JBFqnCBsd6RMkjVDRZzb",
}

class Config:
    ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
    DEFAULT_VOICE_ID = VOICES["jerzy"]
    DEFAULT_MODEL_ID = "eleven_multilingual_v2"
    DEFAULT_OUTPUT_FORMAT = "mp3_44100_128"
