import json
import os
import subprocess
from pathlib import Path

from claude_panel.config import settings
from claude_panel.services.settings_service import get_enabled_plugins
from claude_panel.services.plugin_service import _scan_plugin_cache


def _claude_env() -> dict[str, str] | None:
    """Return env dict with CLAUDE_CONFIG_DIR set for non-default instances."""
    default = Path.home() / ".claude"
    if settings.claude_home.resolve() != default.resolve():
        env = os.environ.copy()
        env["CLAUDE_CONFIG_DIR"] = str(settings.claude_home)
        return env
    return None


def _plugins_dir() -> Path:
    return settings.claude_home / "plugins"


def _read_known_marketplaces() -> dict:
    path = _plugins_dir() / "known_marketplaces.json"
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, PermissionError):
        return {}


def _read_installed_plugins() -> dict:
    path = _plugins_dir() / "installed_plugins.json"
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict) and data.get("version") == 2:
            return data.get("plugins", {})
        return {}
    except (json.JSONDecodeError, PermissionError):
        return {}


def _read_marketplace_json(install_location: str) -> dict:
    path = Path(install_location) / ".claude-plugin" / "marketplace.json"
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, PermissionError):
        return {}


def _extract_name(obj) -> str:
    if isinstance(obj, dict):
        return obj.get("name", "")
    if isinstance(obj, str):
        return obj
    return ""


def list_marketplaces() -> list[dict]:
    known = _read_known_marketplaces()
    result = []

    for marketplace_id, info in known.items():
        install_location = info.get("installLocation", "")
        marketplace_json = _read_marketplace_json(install_location)

        description = ""
        if "description" in marketplace_json:
            description = marketplace_json["description"]
        elif "metadata" in marketplace_json and isinstance(marketplace_json["metadata"], dict):
            description = marketplace_json["metadata"].get("description", "")

        owner = _extract_name(marketplace_json.get("owner", ""))
        plugin_count = len(marketplace_json.get("plugins", []))

        result.append({
            "id": marketplace_id,
            "name": marketplace_json.get("name", marketplace_id),
            "description": description,
            "owner": owner,
            "plugin_count": plugin_count,
            "last_updated": info.get("lastUpdated", ""),
        })

    return result


def list_available_plugins() -> dict:
    known = _read_known_marketplaces()
    installed_plugins = _read_installed_plugins()
    enabled_plugins = get_enabled_plugins()

    marketplaces = []
    plugins = []

    for marketplace_id, info in known.items():
        install_location = info.get("installLocation", "")
        marketplace_json = _read_marketplace_json(install_location)

        description = ""
        if "description" in marketplace_json:
            description = marketplace_json["description"]
        elif "metadata" in marketplace_json and isinstance(marketplace_json["metadata"], dict):
            description = marketplace_json["metadata"].get("description", "")

        owner = _extract_name(marketplace_json.get("owner", ""))
        mp_plugins = marketplace_json.get("plugins", [])

        marketplaces.append({
            "id": marketplace_id,
            "name": marketplace_json.get("name", marketplace_id),
            "description": description,
            "owner": owner,
            "plugin_count": len(mp_plugins),
            "last_updated": info.get("lastUpdated", ""),
        })

        for p in mp_plugins:
            plugin_name = p.get("name", "")
            plugin_id = f"{plugin_name}@{marketplace_id}"

            installed_entries = installed_plugins.get(plugin_id, [])
            is_installed = len(installed_entries) > 0
            installed_version = ""
            installed_scope = ""
            if is_installed:
                first_entry = installed_entries[0]
                installed_version = first_entry.get("version", "")
                scope_raw = first_entry.get("scope", "")
                installed_scope = "project" if scope_raw == "local" else scope_raw

            is_enabled = enabled_plugins.get(plugin_id, False)

            cache_info = _scan_plugin_cache(plugin_id) if is_installed else {"skills": [], "agents": [], "commands": []}

            plugins.append({
                "name": plugin_name,
                "marketplace_id": marketplace_id,
                "plugin_id": plugin_id,
                "description": p.get("description", ""),
                "version": p.get("version", ""),
                "category": p.get("category", ""),
                "author": _extract_name(p.get("author", "")),
                "homepage": p.get("homepage", ""),
                "installed": is_installed,
                "installed_version": installed_version,
                "installed_scope": installed_scope,
                "enabled": is_enabled,
                "skills": cache_info["skills"],
                "agents": cache_info["agents"],
                "commands": cache_info["commands"],
            })

    total_installed = sum(1 for p in plugins if p["installed"])

    return {
        "marketplaces": marketplaces,
        "plugins": plugins,
        "total_available": len(plugins),
        "total_installed": total_installed,
    }


def install_plugin(plugin_id: str, scope: str = "user") -> dict:
    try:
        result = subprocess.run(
            ["claude", "plugin", "install", plugin_id, "--scope", scope],
            capture_output=True,
            text=True,
            timeout=120,
            env=_claude_env(),
        )
        success = result.returncode == 0
        message = result.stdout.strip() if success else result.stderr.strip()
        return {
            "plugin_id": plugin_id,
            "action": "install",
            "success": success,
            "message": message,
        }
    except FileNotFoundError:
        return {
            "plugin_id": plugin_id,
            "action": "install",
            "success": False,
            "message": "claude CLI not found",
        }
    except subprocess.TimeoutExpired:
        return {
            "plugin_id": plugin_id,
            "action": "install",
            "success": False,
            "message": "Installation timed out after 120 seconds",
        }


def uninstall_plugin(plugin_id: str) -> dict:
    try:
        result = subprocess.run(
            ["claude", "plugin", "uninstall", plugin_id],
            capture_output=True,
            text=True,
            timeout=120,
            env=_claude_env(),
        )
        success = result.returncode == 0
        message = result.stdout.strip() if success else result.stderr.strip()
        return {
            "plugin_id": plugin_id,
            "action": "uninstall",
            "success": success,
            "message": message,
        }
    except FileNotFoundError:
        return {
            "plugin_id": plugin_id,
            "action": "uninstall",
            "success": False,
            "message": "claude CLI not found",
        }
    except subprocess.TimeoutExpired:
        return {
            "plugin_id": plugin_id,
            "action": "uninstall",
            "success": False,
            "message": "Uninstallation timed out after 120 seconds",
        }


def list_providers() -> list[dict]:
    known = _read_known_marketplaces()
    result = []

    for marketplace_id, info in known.items():
        install_location = info.get("installLocation", "")
        marketplace_json = _read_marketplace_json(install_location)

        description = ""
        if "description" in marketplace_json:
            description = marketplace_json["description"]
        elif "metadata" in marketplace_json and isinstance(marketplace_json["metadata"], dict):
            description = marketplace_json["metadata"].get("description", "")

        owner = _extract_name(marketplace_json.get("owner", ""))
        plugin_count = len(marketplace_json.get("plugins", []))

        source = info.get("source", {})
        repo = ""
        if isinstance(source, dict):
            repo = source.get("repo", "")

        result.append({
            "id": marketplace_id,
            "name": marketplace_json.get("name", marketplace_id),
            "description": description,
            "owner": owner,
            "repo": repo,
            "plugin_count": plugin_count,
            "last_updated": info.get("lastUpdated", ""),
            "install_location": install_location,
        })

    return result


def add_provider(source: str) -> dict:
    try:
        result = subprocess.run(
            ["claude", "plugin", "marketplace", "add", source],
            capture_output=True,
            text=True,
            timeout=120,
            env=_claude_env(),
        )
        success = result.returncode == 0
        message = result.stdout.strip() if success else result.stderr.strip()
        return {
            "name": source,
            "action": "add",
            "success": success,
            "message": message,
        }
    except FileNotFoundError:
        return {
            "name": source,
            "action": "add",
            "success": False,
            "message": "claude CLI not found",
        }
    except subprocess.TimeoutExpired:
        return {
            "name": source,
            "action": "add",
            "success": False,
            "message": "Add provider timed out after 120 seconds",
        }


def remove_provider(name: str) -> dict:
    try:
        result = subprocess.run(
            ["claude", "plugin", "marketplace", "remove", name],
            capture_output=True,
            text=True,
            timeout=120,
            env=_claude_env(),
        )
        success = result.returncode == 0
        message = result.stdout.strip() if success else result.stderr.strip()
        return {
            "name": name,
            "action": "remove",
            "success": success,
            "message": message,
        }
    except FileNotFoundError:
        return {
            "name": name,
            "action": "remove",
            "success": False,
            "message": "claude CLI not found",
        }
    except subprocess.TimeoutExpired:
        return {
            "name": name,
            "action": "remove",
            "success": False,
            "message": "Remove provider timed out after 120 seconds",
        }


def update_provider(name: str | None = None) -> dict:
    cmd = ["claude", "plugin", "marketplace", "update"]
    if name:
        cmd.append(name)
    timeout = 120 if name else 180
    label = name or "all"
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=_claude_env(),
        )
        success = result.returncode == 0
        message = result.stdout.strip() if success else result.stderr.strip()
        return {
            "name": label,
            "action": "update",
            "success": success,
            "message": message,
        }
    except FileNotFoundError:
        return {
            "name": label,
            "action": "update",
            "success": False,
            "message": "claude CLI not found",
        }
    except subprocess.TimeoutExpired:
        return {
            "name": label,
            "action": "update",
            "success": False,
            "message": f"Update timed out after {timeout} seconds",
        }
