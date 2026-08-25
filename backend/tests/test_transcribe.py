import uuid
from collections.abc import Generator

import pytest
from httpx import AsyncClient

from app.api.deps import get_stt
from app.domain.ports import STTPort
from app.main import app


class FakeSTT(STTPort):
    async def transcribe(self, audio_bytes: bytes) -> str:
        return "transcribed from audio"


@pytest.fixture
def _stt_override() -> Generator[None, None, None]:
    app.dependency_overrides[get_stt] = lambda: FakeSTT()
    yield
    app.dependency_overrides.pop(get_stt, None)


async def test_transcribe(client: AsyncClient, _stt_override: None) -> None:
    create_resp = await client.post("/sessions")
    assert create_resp.status_code == 201
    session_id = create_resp.json()["id"]

    resp = await client.post(
        f"/sessions/{session_id}/transcribe",
        files={"file": ("audio.wav", b"fake-audio-bytes", "audio/wav")},
    )
    assert resp.status_code == 200
    assert resp.json()["text"] == "transcribed from audio"


async def test_transcribe_missing_session_returns_404(
    client: AsyncClient, _stt_override: None
) -> None:
    missing_id = uuid.uuid4()
    resp = await client.post(
        f"/sessions/{missing_id}/transcribe",
        files={"file": ("audio.wav", b"fake-audio-bytes", "audio/wav")},
    )
    assert resp.status_code == 404
