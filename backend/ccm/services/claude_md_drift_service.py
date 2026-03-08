"""Drift detection for CLAUDE.md files based on snapshot diffs."""

import json
import time
from pathlib import Path

from ccm.config import settings
from ccm.services import claude_md_service


def _state_dir() -> Path:
    path = settings.claude_home / "ccm" / "state"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _snapshot_path() -> Path:
    return _state_dir() / "claude_md_snapshot.json"


def _read_snapshot() -> dict[str, dict]:
    path = _snapshot_path()
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return data
    except (OSError, json.JSONDecodeError):
        pass
    return {}


def _write_snapshot(snapshot: dict[str, dict]) -> None:
    path = _snapshot_path()
    path.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")


def _current_snapshot() -> dict[str, dict]:
    files = claude_md_service.list_claude_md_files().get("files", [])
    snapshot: dict[str, dict] = {}
    for f in files:
        path = f.get("path")
        if not path:
            continue
        snapshot[path] = {
            "path": path,
            "scope": f.get("scope", "project"),
            "size_bytes": f.get("size_bytes", 0),
            "last_modified": f.get("last_modified", 0),
            "token_estimate": f.get("token_estimate", 0),
        }
    return snapshot


def list_drift_events() -> dict:
    """Return added/changed/removed drift events since the last snapshot."""
    previous = _read_snapshot()
    current = _current_snapshot()
    now = time.time()

    events: list[dict] = []

    previous_paths = set(previous.keys())
    current_paths = set(current.keys())

    for path in sorted(current_paths - previous_paths):
        record = current[path]
        events.append({
            "path": path,
            "event_type": "added",
            "scope": record.get("scope", "project"),
            "last_modified": record.get("last_modified", 0),
        })

    for path in sorted(previous_paths - current_paths):
        record = previous[path]
        events.append({
            "path": path,
            "event_type": "removed",
            "scope": record.get("scope", "project"),
            "last_modified": record.get("last_modified", 0),
        })

    for path in sorted(previous_paths & current_paths):
        prev = previous[path]
        curr = current[path]
        if (
            prev.get("last_modified") != curr.get("last_modified")
            or prev.get("size_bytes") != curr.get("size_bytes")
        ):
            events.append({
                "path": path,
                "event_type": "changed",
                "scope": curr.get("scope", "project"),
                "last_modified": curr.get("last_modified", 0),
            })

    _write_snapshot(current)
    return {
        "events": events,
        "cursor": str(int(now)),
        "generated_at": now,
    }
