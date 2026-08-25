from abc import ABC, abstractmethod
from pathlib import Path

from app.domain.intelligence import ProjectIntelligence


class IntentClassifierPort(ABC):
    @abstractmethod
    async def classify(self, user_prompt: str) -> str:
        """Return a normalized intent label for a user prompt."""


class ProjectIntelligencePort(ABC):
    """Integration seam for project/business intelligence.

    Implementations return structured project data for a query. The demo
    connector is a placeholder for real Azure DevOps, SharePoint, Confluence,
    Power BI or ServiceNow connectors.
    """

    @abstractmethod
    async def get_intelligence(self, query: str = "") -> ProjectIntelligence:
        """Return structured project intelligence relevant to the query."""


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
