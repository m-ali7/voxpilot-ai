import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.models import Message, Session, Tenant

DEFAULT_TENANT_ID = "default"


class SessionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def _ensure_default_tenant(self) -> Tenant:
        tenant = await self._db.get(Tenant, DEFAULT_TENANT_ID)
        if tenant is None:
            tenant = Tenant(id=DEFAULT_TENANT_ID, name="Default")
            self._db.add(tenant)
            await self._db.commit()
            await self._db.refresh(tenant)
        return tenant

    async def create(self) -> Session:
        await self._ensure_default_tenant()
        session = Session(tenant_id=DEFAULT_TENANT_ID)
        self._db.add(session)
        await self._db.commit()
        await self._db.refresh(session)
        return session

    async def get(self, session_id: uuid.UUID) -> Session | None:
        return await self._db.get(Session, session_id)

    async def list(self, limit: int = 50) -> list[Session]:
        result = await self._db.execute(
            select(Session).order_by(Session.created_at.desc()).limit(limit)
        )
        return list(result.scalars().all())


class MessageRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def add(
        self,
        session_id: uuid.UUID,
        role: str,
        content: str,
        intent: str | None = None,
        turn_id: str | None = None,
    ) -> Message:
        message = Message(
            session_id=session_id, role=role, content=content, intent=intent, turn_id=turn_id
        )
        self._db.add(message)
        await self._db.commit()
        await self._db.refresh(message)
        return message

    async def list_for_session(self, session_id: uuid.UUID) -> list[Message]:
        result = await self._db.execute(
            select(Message)
            .where(Message.session_id == session_id)
            .order_by(Message.created_at.asc())
        )
        return list(result.scalars().all())
