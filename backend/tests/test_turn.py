import uuid
from collections.abc import Generator
from pathlib import Path

import pytest
from httpx import AsyncClient

from app.api.deps import get_orchestrator, get_tts
from app.core.errors import ProviderError
from app.domain.intelligence import ProjectIntelligence
from app.domain.ports import IntentClassifierPort, LLMPort, ProjectIntelligencePort, TTSPort
from app.main import app
from app.services.orchestrator import Orchestrator


class FakeIntentClassifier(IntentClassifierPort):
    async def classify(self, user_prompt: str) -> str:
        return "GREETING"


class FakeIntelligence(ProjectIntelligencePort):
    async def get_intelligence(self, query: str = "") -> ProjectIntelligence:
        return ProjectIntelligence(
            project_id="phoenix",
            project_name="Project Phoenix",
            status="Amber",
            summary="A test project.",
        )


class FakeLLM(LLMPort):
    async def generate(self, conversation_history: list[dict[str, str]]) -> str:
        return "Hello from the test assistant."


class CapturingLLM(LLMPort):
    def __init__(self) -> None:
        self.history: list[list[dict[str, str]]] = []

    async def generate(self, conversation_history: list[dict[str, str]]) -> str:
        self.history.append(conversation_history)
        return f"reply {len(self.history)}"


class FailingLLM(LLMPort):
    async def generate(self, conversation_history: list[dict[str, str]]) -> str:
        raise ProviderError("OpenAI API key is not configured.")


class FakeTTS(TTSPort):
    async def synthesize(self, text: str) -> Path:
        path = Path("/tmp") / f"fake-{uuid.uuid4().hex}.mp3"
        path.write_bytes(b"fake-audio")
        return path


def _set_overrides(llm: LLMPort) -> None:
    app.dependency_overrides[get_orchestrator] = lambda: Orchestrator(
        intent_classifier=FakeIntentClassifier(),
        intelligence=FakeIntelligence(),
        llm=llm,
    )
    app.dependency_overrides[get_tts] = lambda: FakeTTS()


@pytest.fixture
def _overrides() -> Generator[None, None, None]:
    _set_overrides(FakeLLM())
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
    assert body["response"] == "Hello from the test assistant."
    assert body["audio_url"].startswith("/media/")
    assert body["project"]["project_name"] == "Project Phoenix"
    assert body["project"]["status"] == "Amber"


async def test_follow_up_preserves_prior_context(client: AsyncClient) -> None:
    llm = CapturingLLM()
    _set_overrides(llm)

    create_resp = await client.post("/sessions")
    session_id = create_resp.json()["id"]

    await client.post(
        f"/sessions/{session_id}/turn", json={"text": "Give me a project status update"}
    )
    await client.post(f"/sessions/{session_id}/turn", json={"text": "What is the biggest risk?"})

    assert len(llm.history) == 2
    contents = [message["content"] for message in llm.history[1]]
    assert any("status update" in content for content in contents)
    assert any("reply 1" in content for content in contents)


async def test_turn_rejects_empty_text(client: AsyncClient, _overrides: None) -> None:
    create_resp = await client.post("/sessions")
    session_id = create_resp.json()["id"]

    turn_resp = await client.post(f"/sessions/{session_id}/turn", json={"text": "   "})
    assert turn_resp.status_code == 422


async def test_turn_missing_session_returns_404(client: AsyncClient, _overrides: None) -> None:
    missing_id = uuid.uuid4()
    turn_resp = await client.post(f"/sessions/{missing_id}/turn", json={"text": "hello"})
    assert turn_resp.status_code == 404


async def test_turn_provider_error_returns_controlled_503(client: AsyncClient) -> None:
    _set_overrides(FailingLLM())

    create_resp = await client.post("/sessions")
    session_id = create_resp.json()["id"]

    turn_resp = await client.post(f"/sessions/{session_id}/turn", json={"text": "hello"})

    assert turn_resp.status_code == 503
    assert turn_resp.json()["detail"] == "OpenAI API key is not configured."
