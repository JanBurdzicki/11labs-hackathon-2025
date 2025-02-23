import whisper
import tempfile
import os
import ffmpeg


class STTService:
    def __init__(self, model_size="base"):
        self.model = whisper.load_model(model_size)
    
    def transcribe_audio(self, audio_bytes):
        """Transcribe audio from bytes."""
        try:
            # Create temporary files for both input and output
            with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as temp_in, \
                 tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_out:
                
                # Write the input audio bytes
                temp_in.write(audio_bytes)
                temp_in.flush()
                
                # Convert WebM to WAV using ffmpeg
                stream = ffmpeg.input(temp_in.name)
                stream = ffmpeg.output(stream, temp_out.name, acodec='pcm_s16le', ac=1, ar='16000')
                ffmpeg.run(stream, capture_stdout=True, capture_stderr=True, overwrite_output=True)
                
                # Transcribe the converted WAV file
                result = self.model.transcribe(temp_out.name)
                
                # Clean up temporary files
                os.unlink(temp_in.name)
                os.unlink(temp_out.name)
                
                return result["text"], None
                
        except Exception as e:
            return None, str(e)
