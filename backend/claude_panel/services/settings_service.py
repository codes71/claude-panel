"""Read and write ~/.claude/settings.json."""

import json
from pathlib import Path

from claude_panel.config import settings
from claude_panel.services.backup import safe_write_json


def _settings_path() -> Path:
    return settings.claude_home / "settings.json"


def read_settings() -> dict:
    """Read the current settings.json."""
    path = _settings_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, PermissionError, OSError):
        return {}


def write_settings(data: dict) -> Path | None:
    """Write full settings.json with backup."""
    return safe_write_json(_settings_path(), data)


def _coerce_env_shape(value: object) -> dict[str, str]:
    """Convert Claude-style `[{key, value}, ...]` env into the canonical dict shape.

    Claude Code's `settings.json` requires `env` to be a `Record<string, string>`.
    If a caller sends the list-of-pairs shape (the `PATCH /settings/env` API contract),
    coerce it here so the generic settings merge never writes a malformed array.
    """
    if isinstance(value, dict):
        return {str(k): str(v) for k, v in value.items() if v is not None}
    if isinstance(value, list):
        out: dict[str, str] = {}
        for item in value:
            if not isinstance(item, dict):
                continue
            key = item.get("key")
            val = item.get("value")
            if not isinstance(key, str) or key.strip() == "" or val is None:
                continue
            out[key] = str(val)
        return out
    return {}


def update_settings(updates: dict) -> dict:
    """Merge updates into settings.json (shallow merge at top level).

    Coerces `env` into the canonical dict shape to prevent callers from writing
    the list-of-pairs form that Claude Code rejects.
    """
    if "env" in updates:
        updates = {**updates, "env": _coerce_env_shape(updates["env"])}
    current = read_settings()
    current.update(updates)
    safe_write_json(_settings_path(), current)
    return current


def get_env_vars() -> dict[str, str]:
    """Get environment variables from settings."""
    data = read_settings()
    return data.get("env", {})


def update_env_vars(updates: dict[str, str | None]) -> dict[str, str]:
    """Update environment variables. Set value to None to delete."""
    data = read_settings()
    env = data.get("env", {})

    for key, value in updates.items():
        if value is None:
            env.pop(key, None)
        else:
            env[key] = value

    data["env"] = env
    safe_write_json(_settings_path(), data)
    return env


def get_enabled_plugins() -> dict[str, bool]:
    """Get plugin enable/disable map."""
    data = read_settings()
    return data.get("enabledPlugins", {})


def set_plugin_enabled(plugin_id: str, enabled: bool) -> dict[str, bool]:
    """Toggle a plugin's enabled state."""
    data = read_settings()
    plugins = data.get("enabledPlugins", {})
    plugins[plugin_id] = enabled
    data["enabledPlugins"] = plugins
    safe_write_json(_settings_path(), data)
    return plugins
