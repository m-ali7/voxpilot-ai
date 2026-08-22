import uuid
from pathlib import Path

import anyio
from elevenlabs import save
from elevenlabs.client import ElevenLabs

from app.core.config import get_settings
from app.core.errors import ProviderError
from app.domain.ports import TTSPort


class ElevenLabsVoiceGenerator(TTSPort):
    def __init__(self) -> None:
        settings = get_settings()
        api_key = settings.elevenlabs_api_key_value
        self._client: ElevenLabs | None = ElevenLabs(api_key=api_key) if api_key else None
        self._voice_id = settings.elevenlabs_voice_id
        self._model_id = settings.elevenlabs_model_id
        self._output_dir = settings.output_dir

    async def synthesize(self, text: str) -> Path:
        if not text.strip():
            raise ValueError("Text cannot be empty.")
        if self._client is None or not self._voice_id:
            raise ProviderError("ElevenLabs API key or voice ID is not configured.")

        self._output_dir.mkdir(parents=True, exist_ok=True)
        filename = f"voxpilot_{uuid.uuid4().hex}.mp3"
        return await anyio.to_thread.run_sync(self._synthesize_sync, text, filename)

    def _synthesize_sync(self, text: str, filename: str) -> Path:
        assert self._client is not None
        assert self._voice_id is not None
        audio = self._client.text_to_speech.convert(
            voice_id=self._voice_id,
            model_id=self._model_id,
            text=text,
            output_format="mp3_44100_128",
        )
        output_path = self._output_dir / filename
        save(audio, str(output_path))
        return output_path
