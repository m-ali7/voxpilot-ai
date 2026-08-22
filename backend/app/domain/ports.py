from abc import ABC, abstractmethod
from pathlib import Path


class IntentClassifierPort(ABC):
    @abstractmethod
    async def classify(self, user_prompt: str) -> str:
        """Return a normalized intent label for a user prompt."""


class BusinessContextPort(ABC):
    @abstractmethod
    async def get_context(self, intent: str) -> str:
        """Return trusted business context for an intent (may be empty)."""


class LLMPort(ABC):
    @abstractmethod
    async def generate(self, conversation_history: list[dict[str, str]]) -> str:
        """Generate a response from a list of {role, content} messages."""


class TTSPort(ABC):
    @abstractmethod
    async def synthesize(self, text: str) -> Path:
        """Synthesize speech and return the path to the generated audio file."""


class STTPort(ABC):
    @abstractmethod
    async def transcribe(self, audio_bytes: bytes) -> str:
        """Transcribe raw audio bytes to text."""
