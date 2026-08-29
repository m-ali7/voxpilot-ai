from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import async_session_factory, get_db
from app.domain.ports import LLMPort, STTPort, TTSPort
from app.infra.integrations.demo_project import DemoProjectConnector
from app.infra.intent.intent_router import IntentRouter
from app.infra.llm.openai_client import OpenAILLMClient
from app.infra.memory.message_repository import MessageRepository, SessionRepository
from app.infra.stt.openai_whisper import OpenAIWhisperTranscriber
from app.infra.voice.elevenlabs_generator import ElevenLabsVoiceGenerator
from app.services.orchestrator import Orchestrator
from app.services.session_service import SessionService
from app.services.streaming_turn import StreamingTurnService
from app.services.turn_service import TurnService


@lru_cache
def get_llm() -> LLMPort:
    return OpenAILLMClient()


@lru_cache
def get_tts() -> TTSPort:
    return ElevenLabsVoiceGenerator()


@lru_cache
def get_stt() -> STTPort:
    return OpenAIWhisperTranscriber()


@lru_cache
def get_orchestrator() -> Orchestrator:
    return Orchestrator(
        intent_classifier=IntentRouter(),
        intelligence=DemoProjectConnector(),
        llm=get_llm(),
    )


@lru_cache
def get_streaming_turn_service() -> StreamingTurnService:
    return StreamingTurnService(
        orchestrator=get_orchestrator(),
        llm=get_llm(),
        tts=get_tts(),
        session_factory=async_session_factory,
    )


DbSession = Annotated[AsyncSession, Depends(get_db)]
OrchestratorDep = Annotated[Orchestrator, Depends(get_orchestrator)]
TTSDep = Annotated[TTSPort, Depends(get_tts)]
STTDep = Annotated[STTPort, Depends(get_stt)]


def get_session_service(db: DbSession) -> SessionService:
    return SessionService(SessionRepository(db))


def get_turn_service(
    db: DbSession,
    orchestrator: OrchestratorDep,
    tts: TTSDep,
) -> TurnService:
    return TurnService(orchestrator=orchestrator, tts=tts, message_repository=MessageRepository(db))
