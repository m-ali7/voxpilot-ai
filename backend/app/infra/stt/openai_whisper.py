import tempfile

import anyio
from openai import OpenAI

from app.core.config import get_settings
from app.core.errors import ProviderError
from app.domain.ports import STTPort


class OpenAIWhisperTranscriber(STTPort):
    """Whisper-based transcription accepting raw audio bytes.

    Audio capture moves to the browser; the server only receives bytes. The
    transcription language is pinned to a configured default (STT_LANGUAGE)
    rather than relying on Whisper auto-detection, which can misclassify clear
    English speech as another language.
    """

    def __init__(self) -> None:
        settings = get_settings()
        api_key = settings.openai_api_key_value
        self._client: OpenAI | None = OpenAI(api_key=api_key) if api_key else None
        self._language = settings.stt_language

    async def transcribe(self, audio_bytes: bytes) -> str:
        if self._client is None:
            raise ProviderError("OpenAI API key is not configured.")
        return await anyio.to_thread.run_sync(self._transcribe_sync, audio_bytes)

    def _transcribe_sync(self, audio_bytes: bytes) -> str:
        assert self._client is not None
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp:
            tmp.write(audio_bytes)
            tmp.flush()
            with open(tmp.name, "rb") as audio_file:
                transcript = self._client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language=self._language,
                )
        return transcript.text
