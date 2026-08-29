from collections.abc import Awaitable, Callable, Generator
from typing import Any

import pytest
from fastapi.testclient import TestClient

import app.api.ws as ws_module
from app.main import app
from app.schemas.ws import IntentResolved, ResponseDelta, ServerEvent

SESSION_ID = "00000000-0000-0000-0000-000000000001"

Send = Callable[[ServerEvent], Awaitable[None]]


class FakeStreamingService:
    def __init__(self) -> None:
        self.calls: list[tuple[str, str, str]] = []

    async def stream_turn(
        self, session_id: object, turn_id: str, user_prompt: str, send: Send
    ) -> None:
        sid = str(session_id)
        self.calls.append((sid, turn_id, user_prompt))
        await send(IntentResolved(session_id=sid, turn_id=turn_id, intent="GREETING"))
        await send(ResponseDelta(session_id=sid, turn_id=turn_id, delta="hi"))


class FakeSessionRepository:
    def __init__(self, db: object) -> None:
        pass

    async def get(self, session_id: object) -> object:
        return object()


class FakeDb:
    async def __aenter__(self) -> "FakeDb":
        return self

    async def __aexit__(self, *args: object) -> bool:
        return False


@pytest.fixture
def ws_client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    ws_module.manager._connections.clear()
    monkeypatch.setattr(ws_module, "get_streaming_turn_service", lambda: FakeStreamingService())
    monkeypatch.setattr(ws_module, "SessionRepository", FakeSessionRepository)
    monkeypatch.setattr(ws_module, "async_session_factory", lambda: FakeDb())

    with TestClient(app) as client:
        yield client

    ws_module.manager._connections.clear()


def handshake(ws: Any) -> dict:
    ws.send_json({"type": "session.connect", "session_id": SESSION_ID})
    return ws.receive_json()


def test_connect_handshake_returns_session_ready(ws_client: TestClient) -> None:
    with ws_client.websocket_connect(f"/ws/session/{SESSION_ID}") as ws:
        event = handshake(ws)
        assert event["type"] == "session.ready"
        assert event["session_id"] == SESSION_ID
        assert event["seq"] == 1


def test_text_submit_routes_events(ws_client: TestClient) -> None:
    with ws_client.websocket_connect(f"/ws/session/{SESSION_ID}") as ws:
        assert handshake(ws)["type"] == "session.ready"

        ws.send_json(
            {"type": "text.submit", "session_id": SESSION_ID, "turn_id": "turn-1", "text": "hello"}
        )

        first = ws.receive_json()
        second = ws.receive_json()
        assert first["type"] == "intent.resolved"
        assert first["turn_id"] == "turn-1"
        assert second["type"] == "response.delta"
        assert second["delta"] == "hi"


def test_session_connect_is_idempotent(ws_client: TestClient) -> None:
    with ws_client.websocket_connect(f"/ws/session/{SESSION_ID}") as ws:
        assert handshake(ws)["type"] == "session.ready"
        ws.send_json({"type": "session.connect", "session_id": SESSION_ID})
        assert ws.receive_json()["type"] == "session.ready"


def test_turn_cancel_no_active_turn_is_safe(ws_client: TestClient) -> None:
    with ws_client.websocket_connect(f"/ws/session/{SESSION_ID}") as ws:
        assert handshake(ws)["type"] == "session.ready"
        ws.send_json({"type": "turn.cancel", "session_id": SESSION_ID, "turn_id": "nope"})
        ws.send_json({"type": "session.connect", "session_id": SESSION_ID})
        assert ws.receive_json()["type"] == "session.ready"


def test_unknown_event_returns_error(ws_client: TestClient) -> None:
    with ws_client.websocket_connect(f"/ws/session/{SESSION_ID}") as ws:
        assert handshake(ws)["type"] == "session.ready"
        ws.send_json({"type": "unknown.event", "session_id": SESSION_ID})
        event = ws.receive_json()
        assert event["type"] == "error"
        assert event["code"] == "bad_event"
