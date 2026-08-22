from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

# config.py lives at backend/app/core/config.py
# parents[2] resolves to the repository root (one level above backend/).
PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application settings loaded from environment variables and the root .env file."""

    model_config = SettingsConfigDict(
        env_file=(PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "VoxPilot AI"
    version: str = "0.1.0"
    environment: str = "development"
    log_level: str = "INFO"

    database_url: str = "postgresql+asyncpg://voxpilot:voxpilot@localhost:5432/voxpilot"

    openai_api_key: SecretStr | None = None
    openai_model: str = "gpt-4.1-mini"

    elevenlabs_api_key: SecretStr | None = None
    elevenlabs_voice_id: str | None = None
    elevenlabs_model_id: str = "eleven_multilingual_v2"

    output_dir: Path = PROJECT_ROOT / "outputs"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    @property
    def openai_api_key_value(self) -> str | None:
        return self.openai_api_key.get_secret_value() if self.openai_api_key else None

    @property
    def elevenlabs_api_key_value(self) -> str | None:
        return self.elevenlabs_api_key.get_secret_value() if self.elevenlabs_api_key else None


@lru_cache
def get_settings() -> Settings:
    return Settings()
