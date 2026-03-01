"""Plugin discovery and management."""

import json
from pathlib import Path

from ccm.config import settings
from ccm.services.settings_service import get_enabled_plugins, set_plugin_enabled
from ccm.services.token_estimator import PLUGIN_BASE_TOKENS, PLUGIN_SKILL_TOKENS, PLUGIN_AGENT_TOKENS


def _plugins_dir() -> Path:
    return settings.claude_home / "plugins"


def _read_installed() -> dict[str, list[dict]]:
    """Read installed_plugins.json. Returns dict of plugin_id -> list of install entries."""
    path = _plugins_dir() / "installed_plugins.json"
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        # v2 format: {"version": 2, "plugins": {"name@marketplace": [...]}}
        if isinstance(data, dict) and data.get("version") == 2:
            return data.get("plugins", {})
        # v1 format: flat list with "id" keys — convert to v2 shape
        if isinstance(data, list):
            result: dict[str, list[dict]] = {}
            for entry in data:
                pid = entry.get("id", "")
                if pid:
                    result.setdefault(pid, []).append(entry)
            return result
        return {}
    except (json.JSONDecodeError, PermissionError):
        return {}


def _scan_plugin_dir(plugin_dir: Path, result: dict) -> None:
    """Scan a single plugin directory for skills/agents/commands."""
    result["size_bytes"] += sum(f.stat().st_size for f in plugin_dir.rglob("*") if f.is_file())

    for f in plugin_dir.rglob("*.md"):
        if f.parent.name == "skills" or f.name == "SKILL.md":
            name = f.parent.name if f.name == "SKILL.md" else f.stem
            if name not in result["skills"]:
                result["skills"].append(name)
        elif f.parent.name == "agents":
            if f.stem not in result["agents"]:
                result["agents"].append(f.stem)
        elif f.parent.name == "commands":
            if f.stem not in result["commands"]:
                result["commands"].append(f.stem)

    for f in plugin_dir.rglob("*.yaml"):
        if "skill" in str(f):
            if f.stem not in result["skills"]:
                result["skills"].append(f.stem)
        elif "agent" in str(f):
            if f.stem not in result["agents"]:
                result["agents"].append(f.stem)


def _scan_plugin_cache(plugin_id: str) -> dict:
    """Scan plugin cache directory for component info."""
    cache_dir = _plugins_dir() / "cache"
    result = {"skills": [], "agents": [], "commands": [], "size_bytes": 0}

    if not cache_dir.exists():
        return result

    parts = plugin_id.split("@")
    name_part = parts[0]
    marketplace_part = parts[1] if len(parts) > 1 else ""

    # Structure: cache/<marketplace>/<plugin_name>/<version>/
    if marketplace_part:
        plugin_dir = cache_dir / marketplace_part / name_part
        if plugin_dir.is_dir():
            for version_dir in plugin_dir.iterdir():
                if version_dir.is_dir():
                    _scan_plugin_dir(version_dir, result)
                    break
            return result

    # Fallback: search all marketplace dirs
    for mp_dir in cache_dir.iterdir():
        if mp_dir.is_dir():
            candidate = mp_dir / name_part
            if candidate.is_dir():
                for version_dir in candidate.iterdir():
                    if version_dir.is_dir():
                        _scan_plugin_dir(version_dir, result)
                        break
                break

    return result


def list_plugins() -> list[dict]:
    """List all plugins with metadata and components."""
    installed = _read_installed()
    enabled = get_enabled_plugins()
    plugins = []

    seen_ids = set()

    for pid, entries in installed.items():
        if not pid:
            continue
        seen_ids.add(pid)

        name_part = pid.split("@")[0]
        marketplace = pid.split("@")[1] if "@" in pid else "unknown"

        # Use the first install entry for version/scope info
        first_entry = entries[0] if entries else {}
        version = first_entry.get("version", "unknown")

        cache_info = _scan_plugin_cache(pid)

        is_enabled = enabled.get(pid, False)
        estimated_tokens = 0
        if is_enabled:
            estimated_tokens = PLUGIN_BASE_TOKENS
            estimated_tokens += len(cache_info["skills"]) * PLUGIN_SKILL_TOKENS
            estimated_tokens += len(cache_info["agents"]) * PLUGIN_AGENT_TOKENS

        plugins.append({
            "plugin_id": pid,
            "name": name_part,
            "marketplace": marketplace,
            "version": version,
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
            cache_info = _scan_plugin_cache(pid)
            estimated_tokens = 0
            if is_enabled:
                estimated_tokens = PLUGIN_BASE_TOKENS
                estimated_tokens += len(cache_info["skills"]) * PLUGIN_SKILL_TOKENS
                estimated_tokens += len(cache_info["agents"]) * PLUGIN_AGENT_TOKENS

            plugins.append({
                "plugin_id": pid,
                "name": name_part,
                "marketplace": marketplace,
                "version": "unknown",
                "enabled": is_enabled,
                "skills": cache_info["skills"],
                "agents": cache_info["agents"],
                "commands": cache_info["commands"],
                "size_bytes": cache_info["size_bytes"],
                "estimated_tokens": estimated_tokens,
            })

    return plugins


def toggle_plugin(plugin_id: str, enabled: bool) -> dict:
    """Toggle a plugin's enabled state."""
    set_plugin_enabled(plugin_id, enabled)
    return {"plugin_id": plugin_id, "enabled": enabled}
