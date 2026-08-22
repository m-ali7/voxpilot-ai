import uuid
from dataclasses import dataclass
from pathlib import Path

from app.domain.ports import TTSPort
from app.infra.memory.message_repository import MessageRepository
from app.services.orchestrator import Orchestrator


@dataclass(frozen=True)
class TurnResult:
    intent: str
    business_context: str
    response: str
    audio_path: Path


class TurnService:
    def __init__(
        self,
        orchestrator: Orchestrator,
        tts: TTSPort,
        message_repository: MessageRepository,
    ) -> None:
        self._orchestrator = orchestrator
        self._tts = tts
        self._messages = message_repository

    async def run_turn(self, session_id: uuid.UUID, user_prompt: str) -> TurnResult:
        result = await self._orchestrator.run(user_prompt)
        audio_path = await self._tts.synthesize(result.response)

        await self._messages.add(session_id, "user", user_prompt, result.intent)
        await self._messages.add(session_id, "assistant", result.response, result.intent)

        return TurnResult(
            intent=result.intent,
            business_context=result.business_context,
            response=result.response,
            audio_path=audio_path,
        )
