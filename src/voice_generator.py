from pathlib import Path
from elevenlabs.client import ElevenLabs
from elevenlabs import save

from config import ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, OUTPUT_DIR


class VoiceGenerator:
    def __init__(self):
        self.client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
        self.voice_id = ELEVENLABS_VOICE_ID

    def generate_speech(self, text: str, output_filename: str = "voxpilot_response.mp3") -> Path:
        if not text.strip():
            raise ValueError("Text cannot be empty.")

        audio = self.client.text_to_speech.convert(
            voice_id=self.voice_id,
            model_id="eleven_multilingual_v2",
            text=text,
            output_format="mp3_44100_128",
        )

        output_path = OUTPUT_DIR / output_filename
        save(audio, str(output_path))

        return output_path