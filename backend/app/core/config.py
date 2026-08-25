from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

# config.py lives at <repo>/backend/app/core/config.py, therefore:
#   parents[2] -> backend/  (BACKEND_DIR)
#   parents[3] -> <repo>/   (PROJECT_ROOT)
# These are absolute paths derived from __file__ (not the working directory),
# so resolution is identical whether Uvicorn is launched from backend/ or the
# repository root.
BACKEND_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_DIR.parent
ENV_FILE = PROJECT_ROOT / ".env"


class Settings(BaseSettings):
    """Application settings.

    Precedence (highest first): runtime environment variables, then the
    repository-root ``.env`` file, then field defaults. This keeps real
    environment variables supplied by Docker/cloud authoritative while allowing
    local development to fall back to the single ``.env`` at the repo root.
    """

    model_config = SettingsConfigDict(
        env_file=ENV_FILE,
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
