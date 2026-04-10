"""Read and write ~/.claude/settings.json."""

import json
from pathlib import Path

from claude_panel.config import settings
from claude_panel.models.settings import SettingsUpdateRequest
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


def update_settings(updates: dict) -> dict:
    """Merge updates into settings.json (shallow merge at top level)."""
    current = read_settings()
    current.update(updates)
    safe_write_json(_settings_path(), current)
    return current


def apply_settings_patch(req: SettingsUpdateRequest) -> dict:
    """Apply a structured PATCH (same contract as the frontend SettingsUpdateRequest).

    Unlike ``update_settings``, this correctly merges ``env`` from a list of
    {key, value} operations instead of replacing ``env`` with that list (which
    breaks Claude Code).
    """
    data = read_settings()
    patch = req.model_dump(exclude_unset=True)

    if "skipDangerousModePermissionPrompt" in patch:
        data["skipDangerousModePermissionPrompt"] = patch["skipDangerousModePermissionPrompt"]

    if "statusLine" in patch:
        sl = patch["statusLine"]
        data["statusLine"] = sl if sl is None else sl

    if "enabledPlugins" in patch:
        plugins = dict(data.get("enabledPlugins", {}))
        plugins.update(patch["enabledPlugins"])
        data["enabledPlugins"] = plugins

    if "env" in patch:
        env = dict(data.get("env", {}))
        for item in patch["env"]:
            key = item["key"]
            val = item.get("value")
            if val is None:
                env.pop(key, None)
            else:
                env[key] = val
        data["env"] = env

    safe_write_json(_settings_path(), data)
    return data


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
