import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.api.deps import STTDep, get_session_service
from app.schemas.transcribe import TranscribeOut
from app.services.session_service import SessionService

router = APIRouter(prefix="/sessions", tags=["transcribe"])


@router.post("/{session_id}/transcribe", response_model=TranscribeOut)
async def transcribe(
    session_id: uuid.UUID,
    file: Annotated[UploadFile, File(description="Audio file to transcribe (e.g. WAV/WebM)")],
    session_service: Annotated[SessionService, Depends(get_session_service)],
    stt: STTDep,
) -> TranscribeOut:
    if await session_service.get_session(session_id) is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=422, detail="Audio file is empty.")

    text = await stt.transcribe(audio_bytes)
    return TranscribeOut(text=text)
