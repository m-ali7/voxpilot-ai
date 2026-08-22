class VoxPilotError(Exception):
    """Base class for application-level errors."""


class ConfigurationError(VoxPilotError):
    """Raised when required configuration is missing or invalid."""


class ProviderError(VoxPilotError):
    """Raised when an external provider (LLM/TTS/STT) is unavailable or unconfigured."""
