from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    claude_home: Path = Path.home() / ".claude"
    claude_json_path: Path = Path.home() / ".claude.json"
    backup_dir: Path = Path.home() / ".claude" / "backups" / "ccm"
    ccm_skill_providers_dir: Path = Path.home() / ".claude" / "ccm" / "skill-providers"
    host: str = "127.0.0.1"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_prefix": "CCM_"}


settings = Settings()
