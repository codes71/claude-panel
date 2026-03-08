"""Provider provenance lock storage for reproducible imports."""

import json
from datetime import datetime, timezone
from pathlib import Path

from claude_panel.config import settings


def _state_dir() -> Path:
    path = settings.claude_home / "claude-panel" / "state"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _lock_path() -> Path:
    return _state_dir() / "provider_lock.json"


def read_lock() -> dict:
    path = _lock_path()
    if not path.exists():
        return {"version": 1, "providers": []}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            data.setdefault("version", 1)
            data.setdefault("providers", [])
            return data
    except (OSError, json.JSONDecodeError):
        pass
    return {"version": 1, "providers": []}


def _write_lock(data: dict) -> None:
    _lock_path().write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def record_provider(slug: str, repo: str, branch: str, commit: str) -> None:
    """Upsert provider lock metadata with the resolved commit."""
    data = read_lock()
    providers = data.get("providers", [])
    now = datetime.now(timezone.utc).isoformat()

    existing = next((p for p in providers if p.get("slug") == slug), None)
    if existing:
        existing.update({
            "repo": repo,
            "branch": branch,
            "commit": commit,
            "updated_at": now,
        })
    else:
        providers.append({
            "slug": slug,
            "repo": repo,
            "branch": branch,
            "commit": commit,
            "updated_at": now,
        })

    data["providers"] = sorted(providers, key=lambda p: p.get("slug", ""))
    _write_lock(data)


def remove_provider(slug: str) -> None:
    """Remove a provider from lock metadata."""
    data = read_lock()
    providers = [p for p in data.get("providers", []) if p.get("slug") != slug]
    data["providers"] = providers
    _write_lock(data)
