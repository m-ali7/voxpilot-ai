import uuid
from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_session_service, get_turn_service
from app.schemas.intelligence import ProjectIntelligenceOut
from app.schemas.turn import TurnIn, TurnOut
from app.services.session_service import SessionService
from app.services.turn_service import TurnService

router = APIRouter(prefix="/sessions", tags=["turn"])


@router.post("/{session_id}/turn", response_model=TurnOut)
async def create_turn(
    session_id: uuid.UUID,
    payload: TurnIn,
    turn_service: Annotated[TurnService, Depends(get_turn_service)],
    session_service: Annotated[SessionService, Depends(get_session_service)],
) -> TurnOut:
    if not payload.text.strip():
        raise HTTPException(status_code=422, detail="Request text cannot be empty.")

    if await session_service.get_session(session_id) is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    result = await turn_service.run_turn(session_id, payload.text.strip())

    return TurnOut(
        intent=result.intent,
        response=result.response,
        audio_url=f"/media/{result.audio_path.name}",
        project=ProjectIntelligenceOut(**asdict(result.project)),
    )
