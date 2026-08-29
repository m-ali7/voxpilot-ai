from typing import Annotated, Literal

from pydantic import BaseModel, Field, TypeAdapter

from app.schemas.intelligence import ProjectIntelligenceOut


# ---------------------------------------------------------------------------
# Client -> server events
# ---------------------------------------------------------------------------
class ClientSessionConnect(BaseModel):
    type: Literal["session.connect"] = "session.connect"
    session_id: str


class ClientTextSubmit(BaseModel):
    type: Literal["text.submit"] = "text.submit"
    session_id: str
    turn_id: str
    text: str


class ClientTurnCancel(BaseModel):
    type: Literal["turn.cancel"] = "turn.cancel"
    session_id: str
    turn_id: str


class ClientConversationReset(BaseModel):
    type: Literal["conversation.reset"] = "conversation.reset"
    session_id: str


ClientEvent = Annotated[
    ClientSessionConnect | ClientTextSubmit | ClientTurnCancel | ClientConversationReset,
    Field(discriminator="type"),
]

client_event_adapter: TypeAdapter[ClientEvent] = TypeAdapter(ClientEvent)


# ---------------------------------------------------------------------------
# Server -> client events
# ---------------------------------------------------------------------------
class ServerEvent(BaseModel):
    """Base envelope. `seq` and `ts` are assigned by the connection before send."""

    type: str
    session_id: str
    turn_id: str | None = None
    seq: int = 0
    ts: int = 0


class SessionReady(ServerEvent):
    type: Literal["session.ready"] = "session.ready"
    turn_id: None = None


class IntentResolved(ServerEvent):
    type: Literal["intent.resolved"] = "intent.resolved"
    intent: str


class RetrievalStarted(ServerEvent):
    type: Literal["retrieval.started"] = "retrieval.started"


class RetrievalCompleted(ServerEvent):
    type: Literal["retrieval.completed"] = "retrieval.completed"
    project: ProjectIntelligenceOut


class ResponseStarted(ServerEvent):
    type: Literal["response.started"] = "response.started"


class ResponseDelta(ServerEvent):
    type: Literal["response.delta"] = "response.delta"
    delta: str


class ResponseCompleted(ServerEvent):
    type: Literal["response.completed"] = "response.completed"
    text: str
    project: ProjectIntelligenceOut
    audio_url: str | None = None


class AudioStarted(ServerEvent):
    type: Literal["audio.started"] = "audio.started"
    index: int = 0


class AudioChunk(ServerEvent):
    type: Literal["audio.chunk"] = "audio.chunk"
    index: int
    data: str  # base64-encoded audio bytes


class AudioCompleted(ServerEvent):
    type: Literal["audio.completed"] = "audio.completed"


class TurnCancelled(ServerEvent):
    type: Literal["turn.cancelled"] = "turn.cancelled"


class ErrorEvent(ServerEvent):
    type: Literal["error"] = "error"
    code: str
    message: str
