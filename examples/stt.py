import whisper
import sounddevice as sd
import numpy as np
import wave
import tempfile
from pathlib import Path

class SpeechToText:
    def __init__(self, model_size="base"):
        """Initialize Whisper model with specified size."""
        self.model = whisper.load_model(model_size)
    
    def transcribe_file(self, audio_path):
        """Transcribe audio from a file."""
        try:
            result = self.model.transcribe(audio_path)
            return result["text"]
        except Exception as e:
            print(f"Error transcribing file: {e}")
            return None

    def record_audio(self, duration=5, sample_rate=16000):
        """Record audio from microphone."""
        print(f"Recording for {duration} seconds...")
        audio_data = sd.rec(
            int(duration * sample_rate),
            samplerate=sample_rate,
            channels=1,
        )
        sd.wait()
        return audio_data

    def transcribe_from_microphone(self, duration=5):
        """Record and transcribe audio from microphone."""
        # Record audio
        audio_data = self.record_audio(duration)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
            with wave.open(tmp_file.name, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(16000)
                wf.writeframes((audio_data * 32767).astype(np.int16).tobytes())
            
            # Transcribe the temporary file
            result = self.transcribe_file(tmp_file.name)
            
            # Clean up
            Path(tmp_file.name).unlink()
            
        return result

def main():
    # Example usage
    stt = SpeechToText()
    
    # Example 1: Transcribe from file
    # result = stt.transcribe_file("path/to/your/audio.wav")
    # print(f"File transcription: {result}")
    
    # Example 2: Transcribe from microphone
    print("Start speaking...")
    result = stt.transcribe_from_microphone(duration=5)
    print(f"Microphone transcription: {result}")

if __name__ == "__main__":
    main()
