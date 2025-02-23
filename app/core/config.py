from pydantic_settings import BaseSettings
from typing import Dict
from dotenv import load_dotenv
import os

load_dotenv()

class Settings(BaseSettings):
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY")
    WEBHOOK_URL: str = os.getenv("WEBHOOK_URL")

    DEFAULT_VOICE_ID: str = "JBFqnCBsd6RMkjVDRZzb"
    DEFAULT_MODEL_ID: str = "eleven_multilingual_v2"
    DEFAULT_OUTPUT_FORMAT: str = "mp3_44100_128"

    VOICES: Dict[str, str] = {
        "default_en": "JBFqnCBsd6RMkjVDRZzb",
        "jerzy": "JBFqnCBsd6RMkjVDRZzb",
    }

settings = Settings()
