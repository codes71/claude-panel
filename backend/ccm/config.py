from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    claude_home: Path = Path.home() / ".claude"
    claude_json_path: Path = Path.home() / ".claude.json"
    backup_dir: Path = Path.home() / ".claude" / "backups" / "ccm"
    ccm_skill_providers_dir: Path = Path.home() / ".claude" / "ccm" / "skill-providers"
    scan_roots: list[Path] = []
    host: str = "127.0.0.1"
    port: int = 8000
    cors_origins: list[str] = ["http://localhost:5173"]

    @field_validator("scan_roots", mode="before")
    @classmethod
    def _parse_scan_roots(cls, value):
        if value is None or value == "":
            return []
        if isinstance(value, str):
            return [Path(p.strip()).expanduser() for p in value.split(",") if p.strip()]
        if isinstance(value, list):
            return [Path(str(p)).expanduser() for p in value if str(p).strip()]
        return value

    model_config = {"env_prefix": "CCM_"}


settings = Settings()
