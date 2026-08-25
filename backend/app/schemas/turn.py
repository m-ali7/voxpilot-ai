from pydantic import BaseModel, Field

from app.schemas.intelligence import ProjectIntelligenceOut


class TurnIn(BaseModel):
    text: str = Field(min_length=1)


class TurnOut(BaseModel):
    intent: str
    response: str
    audio_url: str
    project: ProjectIntelligenceOut
