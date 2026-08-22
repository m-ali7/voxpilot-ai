from pydantic import BaseModel, Field


class TurnIn(BaseModel):
    text: str = Field(min_length=1)


class TurnOut(BaseModel):
    intent: str
    business_context: str
    response: str
    audio_url: str
