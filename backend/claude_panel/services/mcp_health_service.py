"""Persistent health snapshot storage for MCP servers."""

import json
import time
from pathlib import Path

from claude_panel.config import settings


def _state_dir() -> Path:
    path = settings.claude_home / "claude-panel" / "state"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _health_path() -> Path:
    return _state_dir() / "mcp_health.json"


def _read_health() -> dict:
    path = _health_path()
    if not path.exists():
        return {"servers": [], "updated_at": 0}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            data.setdefault("servers", [])
            data.setdefault("updated_at", 0)
            return data
    except (OSError, json.JSONDecodeError):
        pass
    return {"servers": [], "updated_at": 0}


def _write_health(payload: dict) -> None:
    _health_path().write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def update_health_from_diagnostics(diagnostics: list[dict]) -> dict:
    """Persist and return health summary generated from diagnostics reports."""
    now = time.time()
    servers: list[dict] = []
    for report in diagnostics:
        degraded = next(
            (c for c in report.get("checks", []) if c.get("status") in {"fail", "warn"}),
            None,
        )
        servers.append({
            "name": report.get("name", ""),
            "enabled": report.get("enabled", True),
            "scope": report.get("scope", "global"),
            "project_path": report.get("project_path"),
            "status": report.get("status", "unknown"),
            "error_code": degraded.get("code", "") if degraded else "",
            "message": degraded.get("message", "") if degraded else "",
            "checked_at": report.get("checked_at", now),
        })

    payload = {"servers": servers, "updated_at": now}
    _write_health(payload)
    return payload


def list_health() -> dict:
    """Read last persisted health snapshot."""
    return _read_health()
