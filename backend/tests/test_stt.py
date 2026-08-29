from app.core.config import get_settings
from app.infra.stt.openai_whisper import OpenAIWhisperTranscriber


def test_transcriber_language_defaults_to_english() -> None:
    transcriber = OpenAIWhisperTranscriber()
    assert transcriber._language == "en"


def test_transcriber_language_follows_settings() -> None:
    get_settings.cache_clear()
    try:
        settings = get_settings()
        transcriber = OpenAIWhisperTranscriber()
        assert transcriber._language == settings.stt_language
    finally:
        get_settings.cache_clear()
