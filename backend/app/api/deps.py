from functools import lru_cache
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.domain.ports import LLMPort, TTSPort
from app.infra.business.demo_business_logic import DemoBusinessContext
from app.infra.intent.intent_router import IntentRouter
from app.infra.llm.openai_client import OpenAILLMClient
from app.infra.memory.message_repository import MessageRepository, SessionRepository
from app.infra.voice.elevenlabs_generator import ElevenLabsVoiceGenerator
from app.services.orchestrator import Orchestrator
from app.services.session_service import SessionService
from app.services.turn_service import TurnService


@lru_cache
def get_llm() -> LLMPort:
    return OpenAILLMClient()


@lru_cache
def get_tts() -> TTSPort:
    return ElevenLabsVoiceGenerator()


@lru_cache
def get_orchestrator() -> Orchestrator:
    return Orchestrator(
        intent_classifier=IntentRouter(),
        business_context=DemoBusinessContext(),
        llm=get_llm(),
    )


DbSession = Annotated[AsyncSession, Depends(get_db)]
OrchestratorDep = Annotated[Orchestrator, Depends(get_orchestrator)]
TTSDep = Annotated[TTSPort, Depends(get_tts)]


def get_session_service(db: DbSession) -> SessionService:
    return SessionService(SessionRepository(db))


def get_turn_service(
    db: DbSession,
    orchestrator: OrchestratorDep,
    tts: TTSDep,
) -> TurnService:
    return TurnService(orchestrator=orchestrator, tts=tts, message_repository=MessageRepository(db))
