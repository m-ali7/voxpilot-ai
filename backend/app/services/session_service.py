import uuid

from app.domain.models import Session
from app.infra.memory.message_repository import SessionRepository


class SessionService:
    def __init__(self, session_repository: SessionRepository) -> None:
        self._sessions = session_repository

    async def create_session(self) -> Session:
        return await self._sessions.create()

    async def get_session(self, session_id: uuid.UUID) -> Session | None:
        return await self._sessions.get(session_id)

    async def list_sessions(self, limit: int = 50) -> list[Session]:
        return await self._sessions.list(limit=limit)
