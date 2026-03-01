"""Plugin discovery and management."""

import json
from pathlib import Path

from ccm.config import settings
from ccm.services.settings_service import get_enabled_plugins, set_plugin_enabled
from ccm.services.token_estimator import PLUGIN_BASE_TOKENS, PLUGIN_SKILL_TOKENS, PLUGIN_AGENT_TOKENS


def _plugins_dir() -> Path:
    return settings.claude_home / "plugins"


def _read_installed() -> list[dict]:
    """Read installed_plugins.json."""
    path = _plugins_dir() / "installed_plugins.json"
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, PermissionError):
        return []


def _scan_plugin_cache(plugin_id: str) -> dict:
    """Scan plugin cache directory for component info."""
    cache_dir = _plugins_dir() / "cache"
    result = {"skills": [], "agents": [], "commands": [], "size_bytes": 0}

    if not cache_dir.exists():
        return result

    name_part = plugin_id.split("@")[0]

    for d in cache_dir.iterdir():
        if d.is_dir() and name_part in d.name:
            result["size_bytes"] = sum(f.stat().st_size for f in d.rglob("*") if f.is_file())

            # Look for skill/agent definitions
            for f in d.rglob("*.md"):
                content_lower = f.name.lower()
                if "skill" in content_lower or f.parent.name == "skills":
                    result["skills"].append(f.stem)
                elif "agent" in content_lower or f.parent.name == "agents":
                    result["agents"].append(f.stem)
                elif "command" in content_lower or f.parent.name == "commands":
                    result["commands"].append(f.stem)

            # Also check for YAML/JSON definitions
            for f in d.rglob("*.yaml"):
                if "skill" in str(f):
                    result["skills"].append(f.stem)
                elif "agent" in str(f):
                    result["agents"].append(f.stem)

            break

    return result


def list_plugins() -> list[dict]:
    """List all plugins with metadata and components."""
    installed = _read_installed()
    enabled = get_enabled_plugins()
    plugins = []

    seen_ids = set()

    for entry in installed:
        pid = entry.get("id", "")
        if not pid:
            continue
        seen_ids.add(pid)

        name_part = pid.split("@")[0]
        marketplace = pid.split("@")[1] if "@" in pid else entry.get("marketplace", "unknown")

        cache_info = _scan_plugin_cache(pid)

        is_enabled = enabled.get(pid, False)
        estimated_tokens = 0
        if is_enabled:
            estimated_tokens = PLUGIN_BASE_TOKENS
            estimated_tokens += len(cache_info["skills"]) * PLUGIN_SKILL_TOKENS
            estimated_tokens += len(cache_info["agents"]) * PLUGIN_AGENT_TOKENS

        plugins.append({
            "plugin_id": pid,
            "name": entry.get("name", name_part),
            "marketplace": marketplace,
            "version": entry.get("version", "unknown"),
            "enabled": is_enabled,
            "skills": cache_info["skills"],
            "agents": cache_info["agents"],
            "commands": cache_info["commands"],
            "size_bytes": cache_info["size_bytes"],
            "estimated_tokens": estimated_tokens,
        })

    # Add plugins from enabledPlugins that aren't in installed list
    for pid, is_enabled in enabled.items():
        if pid not in seen_ids:
            name_part = pid.split("@")[0]
            marketplace = pid.split("@")[1] if "@" in pid else "unknown"
            plugins.append({
                "plugin_id": pid,
                "name": name_part,
                "marketplace": marketplace,
                "version": "unknown",
                "enabled": is_enabled,
                "skills": [],
                "agents": [],
                "commands": [],
                "size_bytes": 0,
                "estimated_tokens": PLUGIN_BASE_TOKENS if is_enabled else 0,
            })

    return plugins


def toggle_plugin(plugin_id: str, enabled: bool) -> dict:
    """Toggle a plugin's enabled state."""
    set_plugin_enabled(plugin_id, enabled)
    return {"plugin_id": plugin_id, "enabled": enabled}
