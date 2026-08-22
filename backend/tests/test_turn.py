import uuid
from collections.abc import Generator
from pathlib import Path

import pytest
from httpx import AsyncClient

from app.api.deps import get_orchestrator, get_tts
from app.domain.ports import BusinessContextPort, IntentClassifierPort, LLMPort, TTSPort
from app.main import app
from app.services.orchestrator import Orchestrator


class FakeIntentClassifier(IntentClassifierPort):
    async def classify(self, user_prompt: str) -> str:
        return "GREETING"


class FakeBusinessContext(BusinessContextPort):
    async def get_context(self, intent: str) -> str:
        return "Greeting Context: welcome."


class FakeLLM(LLMPort):
    async def generate(self, conversation_history: list[dict[str, str]]) -> str:
        return "Hello from the test assistant."


class FakeTTS(TTSPort):
    async def synthesize(self, text: str) -> Path:
        path = Path("/tmp") / f"fake-{uuid.uuid4().hex}.mp3"
        path.write_bytes(b"fake-audio")
        return path


@pytest.fixture
def _overrides() -> Generator[None, None, None]:
    app.dependency_overrides[get_orchestrator] = lambda: Orchestrator(
        intent_classifier=FakeIntentClassifier(),
        business_context=FakeBusinessContext(),
        llm=FakeLLM(),
    )
    app.dependency_overrides[get_tts] = lambda: FakeTTS()
    yield
    app.dependency_overrides.pop(get_orchestrator, None)
    app.dependency_overrides.pop(get_tts, None)


async def test_create_session_and_run_turn(client: AsyncClient, _overrides: None) -> None:
    create_resp = await client.post("/sessions")
    assert create_resp.status_code == 201
    session_id = create_resp.json()["id"]

    turn_resp = await client.post(f"/sessions/{session_id}/turn", json={"text": "hello there"})
    assert turn_resp.status_code == 200
    body = turn_resp.json()
    assert body["intent"] == "GREETING"
    assert body["business_context"] == "Greeting Context: welcome."
    assert body["response"] == "Hello from the test assistant."
    assert body["audio_url"].startswith("/media/")


async def test_turn_rejects_empty_text(client: AsyncClient, _overrides: None) -> None:
    create_resp = await client.post("/sessions")
    session_id = create_resp.json()["id"]

    turn_resp = await client.post(f"/sessions/{session_id}/turn", json={"text": "   "})
    assert turn_resp.status_code == 422


async def test_turn_missing_session_returns_404(client: AsyncClient, _overrides: None) -> None:
    missing_id = uuid.uuid4()
    turn_resp = await client.post(f"/sessions/{missing_id}/turn", json={"text": "hello"})
    assert turn_resp.status_code == 404
