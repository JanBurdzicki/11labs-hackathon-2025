import whisper
import wave
import tempfile
import os

class STTService:
    def __init__(self, model_size="base"):
        self.model = whisper.load_model(model_size)
    
    def transcribe_audio(self, audio_bytes):
        """Transcribe audio from bytes."""
        try:
            # Create a temporary WAV file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
                with wave.open(temp_wav.name, 'wb') as wf:
                    wf.setnchannels(1)
                    wf.setsampwidth(2)
                    wf.setframerate(16000)
                    wf.writeframes(audio_bytes)
                
                # Transcribe using the temporary file
                result = self.model.transcribe(temp_wav.name)
                
            # Clean up the temporary file
            os.unlink(temp_wav.name)
            
            return result["text"], None
                
        except Exception as e:
            return None, str(e)
