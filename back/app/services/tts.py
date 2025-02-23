from elevenlabs.client import ElevenLabs
from app.core.config import settings
from typing import Tuple, Optional, Union

class TTSService:
    def __init__(self):
        self.client = ElevenLabs(api_key=settings.ELEVENLABS_API_KEY)

    def generate_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
        model_id: Optional[str] = None,
        output_format: Optional[str] = None
    ) -> Tuple[Union[bytes, None], Union[str, None]]:
        try:
            audio = self.client.text_to_speech.convert(
                text=text,
                voice_id=voice_id or settings.DEFAULT_VOICE_ID,
                model_id=model_id or settings.DEFAULT_MODEL_ID,
                output_format=output_format or settings.DEFAULT_OUTPUT_FORMAT,
            )
            audio_data = b''.join(chunk for chunk in audio)
            return audio_data, None
        except Exception as e:
            return None, str(e)
