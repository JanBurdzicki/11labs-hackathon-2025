from pydantic_settings import BaseSettings
from typing import Dict

class Settings(BaseSettings):
    ELEVENLABS_API_KEY: str
    DEFAULT_VOICE_ID: str = "JBFqnCBsd6RMkjVDRZzb"
    DEFAULT_MODEL_ID: str = "eleven_multilingual_v2"
    DEFAULT_OUTPUT_FORMAT: str = "mp3_44100_128"

    VOICES: Dict[str, str] = {
        "default_en": "JBFqnCBsd6RMkjVDRZzb",
        "jerzy": "JBFqnCBsd6RMkjVDRZzb",
    }

    class Config:
        env_file = ".env"

settings = Settings()
