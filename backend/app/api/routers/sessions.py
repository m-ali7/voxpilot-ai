from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_session_service
from app.domain.models import Session
from app.schemas.session import SessionOut
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.post("", response_model=SessionOut, status_code=201)
async def create_session(
    service: Annotated[SessionService, Depends(get_session_service)],
) -> Session:
    return await service.create_session()


@router.get("", response_model=list[SessionOut])
async def list_sessions(
    service: Annotated[SessionService, Depends(get_session_service)],
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> list[Session]:
    return await service.list_sessions(limit=limit)
