import asyncio
import base64
import logging
import time
import uuid
from collections.abc import Awaitable, Callable
from dataclasses import asdict

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.domain.ports import LLMPort, TTSPort
from app.infra.memory.message_repository import MessageRepository
from app.schemas.intelligence import ProjectIntelligenceOut
from app.schemas.ws import (
    AudioChunk,
    AudioCompleted,
    AudioStarted,
    IntentResolved,
    ResponseCompleted,
    ResponseDelta,
    ResponseStarted,
    RetrievalCompleted,
    RetrievalStarted,
    ServerEvent,
)
from app.services.orchestrator import Orchestrator
from app.services.segmenter import SentenceSegmenter

logger = logging.getLogger(__name__)

Send = Callable[[ServerEvent], Awaitable[None]]


class StreamingTurnService:
    """Orchestrates a WebSocket turn with streamed LLM + sentence-buffered TTS.

    LLM deltas stream to the client immediately, are fed into a sentence
    segmenter, and complete sentences are synthesised by a concurrent TTS worker
    so speech begins before the full text response has finished generating.
    """

    def __init__(
        self,
        orchestrator: Orchestrator,
        llm: LLMPort,
        tts: TTSPort,
        session_factory: async_sessionmaker[AsyncSession],
    ) -> None:
        self._orchestrator = orchestrator
        self._llm = llm
        self._tts = tts
        self._session_factory = session_factory

    async def _prior_messages(self, session_id: uuid.UUID) -> list[dict[str, str]]:
        async with self._session_factory() as db:
            repo = MessageRepository(db)
            messages = await repo.list_for_session(session_id)
            return [{"role": m.role, "content": m.content} for m in messages]

    async def _persist(
        self,
        session_id: uuid.UUID,
        turn_id: str,
        user_prompt: str,
        intent: str,
        response: str,
    ) -> None:
        async with self._session_factory() as db:
            repo = MessageRepository(db)
            await repo.add(session_id, "user", user_prompt, intent, turn_id)
            await repo.add(session_id, "assistant", response, intent, turn_id)

    async def stream_turn(
        self,
        session_id: uuid.UUID,
        turn_id: str,
        user_prompt: str,
        send: Send,
    ) -> None:
        started = time.monotonic()
        prior = await self._prior_messages(session_id)
        prepared = await self._orchestrator.prepare(user_prompt, prior)
        project_out = ProjectIntelligenceOut(**asdict(prepared.project))

        sid = str(session_id)
        await send(IntentResolved(session_id=sid, turn_id=turn_id, intent=prepared.intent))
        await send(RetrievalStarted(session_id=sid, turn_id=turn_id))
        await send(RetrievalCompleted(session_id=sid, turn_id=turn_id, project=project_out))
        await send(ResponseStarted(session_id=sid, turn_id=turn_id))

        segmenter = SentenceSegmenter()
        segments_queue: asyncio.Queue[str | None] = asyncio.Queue()

        async def tts_worker() -> None:
            audio_index = 0
            first = True
            while True:
                segment = await segments_queue.get()
                if segment is None:
                    break
                if not segment.strip():
                    continue
                try:
                    audio_bytes = await self._tts.synthesize_bytes(segment)
                except Exception:
                    logger.warning("TTS segment failed for turn %s", turn_id, exc_info=True)
                    continue
                if first:
                    first = False
                    logger.info(
                        "turn=%s first_audio_ms=%.0f",
                        turn_id,
                        (time.monotonic() - started) * 1000,
                    )
                    await send(AudioStarted(session_id=sid, turn_id=turn_id, index=audio_index))
                await send(
                    AudioChunk(
                        session_id=sid,
                        turn_id=turn_id,
                        index=audio_index,
                        data=base64.b64encode(audio_bytes).decode(),
                    )
                )
                audio_index += 1

        worker = asyncio.create_task(tts_worker())

        parts: list[str] = []
        first_delta_at: float | None = None
        try:
            async for delta in self._llm.generate_stream(prepared.messages):
                if first_delta_at is None:
                    first_delta_at = time.monotonic()
                    logger.info(
                        "turn=%s first_token_ms=%.0f",
                        turn_id,
                        (first_delta_at - started) * 1000,
                    )
                parts.append(delta)
                await send(ResponseDelta(session_id=sid, turn_id=turn_id, delta=delta))
                for segment in segmenter.push(delta):
                    await segments_queue.put(segment)
        except asyncio.CancelledError:
            worker.cancel()
            raise

        residual = segmenter.flush()
        if residual.strip():
            await segments_queue.put(residual)

        await segments_queue.put(None)
        await worker

        text = "".join(parts)
        await send(AudioCompleted(session_id=sid, turn_id=turn_id))
        logger.info("turn=%s generation_ms=%.0f", turn_id, (time.monotonic() - started) * 1000)

        await self._persist(session_id, turn_id, user_prompt, prepared.intent, text)

        await send(
            ResponseCompleted(
                session_id=sid,
                turn_id=turn_id,
                text=text,
                project=project_out,
                audio_url=None,
            )
        )
        logger.info("turn=%s total_ms=%.0f", turn_id, (time.monotonic() - started) * 1000)
