from pydantic import BaseModel


class TranscribeOut(BaseModel):
    text: str
