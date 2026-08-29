import asyncio
import logging
import time
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.deps import get_streaming_turn_service
from app.core.db import async_session_factory
from app.core.errors import ProviderError
from app.infra.memory.message_repository import SessionRepository
from app.schemas.ws import (
    ClientConversationReset,
    ClientEvent,
    ClientSessionConnect,
    ClientTextSubmit,
    ClientTurnCancel,
    ErrorEvent,
    ServerEvent,
    SessionReady,
    TurnCancelled,
    client_event_adapter,
)
from app.services.streaming_turn import StreamingTurnService

logger = logging.getLogger(__name__)

router = APIRouter()


class TurnContext:
    def __init__(self, turn_id: str, task: "asyncio.Task[None]") -> None:
        self.turn_id = turn_id
        self.task = task


class Connection:
    """A single WebSocket connection (one per session for the MVP)."""

    def __init__(self, websocket: WebSocket, session_id: str) -> None:
        self.websocket = websocket
        self.session_id = session_id
        self.connection_id = uuid.uuid4().hex
        self.seq = 0
        self.active_turn: TurnContext | None = None
        self._lock = asyncio.Lock()

    async def send(self, event: ServerEvent) -> None:
        async with self._lock:
            self.seq += 1
            event.seq = self.seq
            event.ts = int(time.time() * 1000)
            await self.websocket.send_json(event.model_dump())

    async def cancel_active(self, turn_id: str | None = None) -> None:
        ctx = self.active_turn
        if ctx is None:
            return
        if turn_id is not None and ctx.turn_id != turn_id:
            return
        self.active_turn = None
        ctx.task.cancel()
        try:
            await self.send(TurnCancelled(session_id=self.session_id, turn_id=ctx.turn_id))
        except Exception:
            logger.debug("Connection %s closed during cancellation", self.connection_id)


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: dict[str, Connection] = {}

    def register(self, connection: Connection) -> None:
        self._connections[connection.session_id] = connection

    def get(self, session_id: str) -> Connection | None:
        return self._connections.get(session_id)

    def unregister(self, session_id: str) -> None:
        self._connections.pop(session_id, None)


manager = ConnectionManager()


async def _run_turn(
    connection: Connection, service: StreamingTurnService, turn_id: str, text: str
) -> None:
    try:
        await service.stream_turn(uuid.UUID(connection.session_id), turn_id, text, connection.send)
    except asyncio.CancelledError:
        raise
    except ProviderError as exc:
        await _safe_error(connection, turn_id, "provider", str(exc))
    except Exception:
        logger.exception("Turn %s failed", turn_id)
        await _safe_error(
            connection, turn_id, "internal", "Something went wrong. Please try again."
        )


async def _safe_error(connection: Connection, turn_id: str | None, code: str, message: str) -> None:
    try:
        await connection.send(
            ErrorEvent(
                session_id=connection.session_id, turn_id=turn_id, code=code, message=message
            )
        )
    except Exception:
        logger.debug("Connection %s closed while reporting error", connection.connection_id)


async def _dispatch(
    connection: Connection, service: StreamingTurnService, event: ClientEvent
) -> None:
    if isinstance(event, ClientSessionConnect):
        await connection.send(SessionReady(session_id=connection.session_id))
    elif isinstance(event, ClientTextSubmit):
        await connection.cancel_active()
        task = asyncio.create_task(_run_turn(connection, service, event.turn_id, event.text))
        connection.active_turn = TurnContext(event.turn_id, task)
    elif isinstance(event, ClientTurnCancel):
        await connection.cancel_active(event.turn_id)
    elif isinstance(event, ClientConversationReset):
        await connection.cancel_active()


@router.websocket("/ws/session/{session_id}")
async def ws_session(websocket: WebSocket, session_id: str) -> None:
    await websocket.accept()

    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        await websocket.close(code=4404)
        return

    async with async_session_factory() as db:
        if await SessionRepository(db).get(session_uuid) is None:
            await websocket.close(code=4404)
            return

    # One active connection per session: replace any prior one.
    prior = manager.get(session_id)
    if prior is not None:
        await prior.cancel_active()
        manager.unregister(session_id)

    service = get_streaming_turn_service()
    connection = Connection(websocket, session_id)
    manager.register(connection)

    logger.info("ws connected connection=%s session=%s", connection.connection_id, session_id)

    try:
        while True:
            try:
                raw = await websocket.receive_json()
            except WebSocketDisconnect:
                break
            except Exception:
                await _safe_error(connection, None, "bad_event", "Malformed message.")
                continue

            try:
                event = client_event_adapter.validate_python(raw)
            except Exception:
                await _safe_error(connection, None, "bad_event", "Malformed event.")
                continue

            await _dispatch(connection, service, event)
    finally:
        await connection.cancel_active()
        manager.unregister(session_id)
        logger.info(
            "ws disconnected connection=%s session=%s", connection.connection_id, session_id
        )
