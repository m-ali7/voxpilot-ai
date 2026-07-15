from pathlib import Path
import tempfile

import sounddevice as sd
from scipy.io.wavfile import write
from openai import OpenAI

from config import OPENAI_API_KEY


class SpeechToText:
    def __init__(self):
        self.client = OpenAI(api_key=OPENAI_API_KEY)

    def record_audio(self, duration_seconds: int = 5, sample_rate: int = 44100) -> Path:
        print(f"\nRecording for {duration_seconds} seconds...")
        print("Speak now.")

        audio = sd.rec(
            int(duration_seconds * sample_rate),
            samplerate=sample_rate,
            channels=1,
            dtype="int16",
        )
        sd.wait()

        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        write(temp_file.name, sample_rate, audio)

        print("Recording complete.")
        return Path(temp_file.name)

    def transcribe_audio(self, audio_path: Path) -> str:
        with open(audio_path, "rb") as audio_file:
            transcript = self.client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
            )

        return transcript.text

    def listen_and_transcribe(self, duration_seconds: int = 5) -> str:
        audio_path = self.record_audio(duration_seconds=duration_seconds)
        transcript = self.transcribe_audio(audio_path)

        print(f"\nTranscribed Text: {transcript}")
        return transcript