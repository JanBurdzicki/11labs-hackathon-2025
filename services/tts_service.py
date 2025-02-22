from elevenlabs.client import ElevenLabs
from config import Config

class TTSService:
    def __init__(self):
        self.client = ElevenLabs(api_key=Config.ELEVENLABS_API_KEY)

    def generate_speech(self, text, voice_id=None, model_id=None, output_format=None):
        try:
            audio = self.client.text_to_speech.convert(
                text=text,
                voice_id=voice_id or Config.DEFAULT_VOICE_ID,
                model_id=model_id or Config.DEFAULT_MODEL_ID,
                output_format=output_format or Config.DEFAULT_OUTPUT_FORMAT,
            )
            # Konwertuj generator na bytes
            audio_data = b''.join(chunk for chunk in audio)
            return audio_data, None
        except Exception as e:
            return None, str(e)
