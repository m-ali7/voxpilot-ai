import asyncio
import uuid
from collections.abc import AsyncGenerator, AsyncIterator
from pathlib import Path

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.domain.intelligence import ProjectIntelligence
from app.domain.models import Base, Message, Session, Tenant
from app.domain.ports import (
    IntentClassifierPort,
    LLMPort,
    ProjectIntelligencePort,
    TTSPort,
)
from app.schemas.ws import ServerEvent
from app.services.orchestrator import Orchestrator
from app.services.streaming_turn import StreamingTurnService

SessionFactory = async_sessionmaker[AsyncSession]


class FakeIntent(IntentClassifierPort):
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


class StreamingLLM(LLMPort):
    def __init__(self, deltas: list[str], delay: float = 0) -> None:
        self._deltas = deltas
        self._delay = delay

    async def generate(self, conversation_history: list[dict[str, str]]) -> str:
        return "".join(self._deltas)

    async def generate_stream(
        self, conversation_history: list[dict[str, str]]
    ) -> AsyncIterator[str]:
        for delta in self._deltas:
            if self._delay:
                await asyncio.sleep(self._delay)
            yield delta


class FakeTTS(TTSPort):
    async def synthesize(self, text: str) -> Path:
        path = Path("/tmp") / f"fake-{uuid.uuid4().hex}.mp3"
        path.write_bytes(b"fake-audio")
        return path


def make_service(session_factory: SessionFactory, llm: LLMPort) -> StreamingTurnService:
    orchestrator = Orchestrator(
        intent_classifier=FakeIntent(), intelligence=FakeIntelligence(), llm=llm
    )
    return StreamingTurnService(
        orchestrator=orchestrator, llm=llm, tts=FakeTTS(), session_factory=session_factory
    )


@pytest_asyncio.fixture
async def session_factory(
    tmp_path: Path,
) -> AsyncGenerator[tuple[SessionFactory, uuid.UUID], None]:
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'test.db'}")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    factory = async_sessionmaker(engine, expire_on_commit=False)

    async with factory() as db:
        db.add(Tenant(id="default", name="Default"))
        await db.flush()
        session = Session(tenant_id="default")
        db.add(session)
        await db.commit()
        session_id = session.id

    yield factory, session_id
    await engine.dispose()


async def run_and_collect(
    service: StreamingTurnService, session_id: uuid.UUID, text: str
) -> list[ServerEvent]:
    events: list[ServerEvent] = []

    async def send(event: ServerEvent) -> None:
        events.append(event)

    await service.stream_turn(session_id, "turn-1", text, send)
    return events


async def test_stream_turn_emits_lifecycle_events(
    session_factory: tuple[SessionFactory, uuid.UUID],
) -> None:
    factory, session_id = session_factory
    llm = StreamingLLM(["Hello", " from", " the", " assistant."])
    service = make_service(factory, llm)

    events = await run_and_collect(service, session_id, "hello")

    types = [e.type for e in events]
    assert types == [
        "intent.resolved",
        "retrieval.started",
        "retrieval.completed",
        "response.started",
        "response.delta",
        "response.delta",
        "response.delta",
        "response.delta",
        "audio.started",
        "audio.chunk",
        "audio.completed",
        "response.completed",
    ]
    assert events[0].intent == "GREETING"  # type: ignore[attr-defined]
    assert events[0].turn_id == "turn-1"
    deltas = [e.delta for e in events if e.type == "response.delta"]  # type: ignore[attr-defined]
    assert "".join(deltas) == "Hello from the assistant."
    chunks = [e for e in events if e.type == "audio.chunk"]
    assert len(chunks) == 1
    assert chunks[0].index == 0  # type: ignore[attr-defined]
    assert chunks[0].data  # type: ignore[attr-defined]
    completed = events[-1]
    assert completed.text == "Hello from the assistant."  # type: ignore[attr-defined]
    assert completed.audio_url is None  # type: ignore[attr-defined]
    assert completed.project.project_name == "Project Phoenix"  # type: ignore[attr-defined]


async def test_stream_turn_emits_ordered_audio_segments(
    session_factory: tuple[SessionFactory, uuid.UUID],
) -> None:
    factory, session_id = session_factory
    llm = StreamingLLM(["First sentence.", " Second sentence!", " Final words."])
    service = make_service(factory, llm)

    events = await run_and_collect(service, session_id, "hello")

    chunks = [e for e in events if e.type == "audio.chunk"]
    assert [c.index for c in chunks] == [0, 1, 2]  # type: ignore[attr-defined]
    assert all(c.data for c in chunks)  # type: ignore[attr-defined]
    assert events[-1].type == "response.completed"
    assert events[-1].text == "First sentence. Second sentence! Final words."  # type: ignore[attr-defined]


async def test_stream_turn_persists_messages_once(
    session_factory: tuple[SessionFactory, uuid.UUID],
) -> None:
    factory, session_id = session_factory
    llm = StreamingLLM(["Hi there"])
    service = make_service(factory, llm)

    await run_and_collect(service, session_id, "hello")

    async with factory() as db:
        result = await db.execute(
            select(Message).where(Message.session_id == session_id, Message.turn_id == "turn-1")
        )
        messages = list(result.scalars().all())

    assert len(messages) == 2
    roles = sorted(m.role for m in messages)
    assert roles == ["assistant", "user"]
    assert all(m.turn_id == "turn-1" for m in messages)


async def test_stream_turn_cancellation_stops_deltas_and_does_not_persist(
    session_factory: tuple[SessionFactory, uuid.UUID],
) -> None:
    factory, session_id = session_factory
    llm = StreamingLLM(["a", "b", "c", "d", "e"], delay=0.01)
    service = make_service(factory, llm)

    events: list[ServerEvent] = []

    async def send(event: ServerEvent) -> None:
        events.append(event)

    task = asyncio.create_task(service.stream_turn(session_id, "turn-9", "hello", send))
    await asyncio.sleep(0.03)
    task.cancel()

    with pytest.raises(asyncio.CancelledError):
        await task

    types = [e.type for e in events]
    assert "response.completed" not in types

    async with factory() as db:
        result = await db.execute(
            select(Message).where(Message.session_id == session_id, Message.turn_id == "turn-9")
        )
        assert list(result.scalars().all()) == []


async def test_stream_turn_tts_failure_still_completes(
    session_factory: tuple[SessionFactory, uuid.UUID],
) -> None:
    factory, session_id = session_factory
    llm = StreamingLLM(["text only"])

    class FailingTTS(TTSPort):
        async def synthesize(self, text: str) -> Path:
            raise RuntimeError("tts down")

    orchestrator = Orchestrator(
        intent_classifier=FakeIntent(), intelligence=FakeIntelligence(), llm=llm
    )
    service = StreamingTurnService(
        orchestrator=orchestrator, llm=llm, tts=FailingTTS(), session_factory=factory
    )

    events = await run_and_collect(service, session_id, "hello")

    completed = events[-1]
    assert completed.type == "response.completed"
    assert completed.text == "text only"  # type: ignore[attr-defined]
    assert completed.audio_url is None  # type: ignore[attr-defined]
