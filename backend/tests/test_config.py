from pathlib import Path

from pytest import MonkeyPatch

from app.core.config import BACKEND_DIR, ENV_FILE, PROJECT_ROOT, Settings


def test_repository_paths_are_derived_from_backend_location() -> None:
    assert BACKEND_DIR.name == "backend"
    assert PROJECT_ROOT == BACKEND_DIR.parent
    assert ENV_FILE == PROJECT_ROOT / ".env"
    assert PROJECT_ROOT / "backend" == BACKEND_DIR


def test_default_output_dir_is_repo_root_outputs() -> None:
    settings = Settings(_env_file=None)
    assert settings.output_dir == PROJECT_ROOT / "outputs"


def test_dotenv_file_values_are_loaded(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text("OPENAI_MODEL=from-dotenv\n", encoding="utf-8")
    monkeypatch.delenv("OPENAI_MODEL", raising=False)

    settings = Settings(_env_file=env_file)

    assert settings.openai_model == "from-dotenv"


def test_environment_variables_take_precedence_over_dotenv(
    tmp_path: Path, monkeypatch: MonkeyPatch
) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text("OPENAI_MODEL=from-dotenv\n", encoding="utf-8")
    monkeypatch.setenv("OPENAI_MODEL", "from-environment")

    settings = Settings(_env_file=env_file)

    assert settings.openai_model == "from-environment"


def test_missing_provider_keys_resolve_to_none(monkeypatch: MonkeyPatch) -> None:
    for key in ("OPENAI_API_KEY", "ELEVENLABS_API_KEY", "ELEVENLABS_VOICE_ID"):
        monkeypatch.delenv(key, raising=False)

    settings = Settings(_env_file=None)

    assert settings.openai_api_key_value is None
    assert settings.elevenlabs_api_key_value is None
    assert settings.elevenlabs_voice_id is None
