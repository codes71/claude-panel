"""Multi-instance Claude Code CLI management.

Discovers, tracks, and switches between multiple ~/.claude* configuration
directories, allowing Claude Panel to manage several Claude Code profiles.
"""

import json
import logging
import os
from pathlib import Path
from typing import Any

from claude_panel.config import settings
from claude_panel.services.claude_json_service import list_mcp_server_entries
from claude_panel.services.claude_md_service import _cache_invalidate as _invalidate_claude_md_cache

logger = logging.getLogger(__name__)

# Directories to exclude from instance scanning
_EXCLUDED_DIRS = {".claude-code-router"}

# Strong markers unique to real Claude Code profiles
_STRONG_MARKERS = {".credentials.json", "plugins", "projects"}

# Weak markers that plugins/tools may also create
_WEAK_MARKERS = {"settings.json", "commands"}

# Default instance is always ~/.claude
_DEFAULT_INSTANCE = Path.home() / ".claude"

# Persistence file for registered instances and active selection
def _get_persistence_path() -> Path:
    if os.name == "nt":
        base = Path(os.environ.get("APPDATA", str(Path.home())))
    else:
        base = Path.home() / ".config"
    return base / "claude-panel" / "instances.json"

_PERSISTENCE_PATH = _get_persistence_path()


def _read_json(path: Path) -> dict | None:
    """Read a JSON file, returning None on any failure."""
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, PermissionError, OSError):
        return None


def _read_persistence() -> dict[str, Any]:
    """Read the persistence file, returning defaults if missing."""
    data = _read_json(_PERSISTENCE_PATH)
    if not data or not isinstance(data, dict):
        return {"registered": [], "active": None}
    return {
        "registered": data.get("registered", []),
        "active": data.get("active", None),
    }


def _write_persistence(data: dict[str, Any]) -> None:
    """Write the persistence file, creating parent dirs as needed."""
    _PERSISTENCE_PATH.parent.mkdir(parents=True, exist_ok=True)
    _PERSISTENCE_PATH.write_text(
        json.dumps(data, indent=2, default=str) + "\n",
        encoding="utf-8",
    )


def _is_valid_config_dir(path: Path) -> bool:
    """Check whether a directory is a real Claude Code config profile.

    Requires at least one strong marker (.credentials.json, plugins, projects)
    to distinguish genuine profiles from plugin data directories that may also
    contain settings.json or commands/.
    """
    if not path.is_dir():
        return False
    return any((path / marker).exists() for marker in _STRONG_MARKERS)


def _find_claude_json_for(config_dir: Path) -> Path:
    """Determine the claude.json path for a given config directory.

    The primary instance (~/.claude) uses ~/.claude.json at the home root.
    All other instances store .claude.json inside the config directory itself.
    """
    if config_dir.resolve() == _DEFAULT_INSTANCE.resolve():
        return Path.home() / ".claude.json"
    return config_dir / ".claude.json"


def _build_instance_metadata(config_dir: Path) -> dict[str, Any]:
    """Build a metadata dict describing a single Claude config instance."""
    config_dir = config_dir.resolve()
    claude_json_path = _find_claude_json_for(config_dir)

    # Read settings.json for counts
    settings_data = _read_json(config_dir / "settings.json")
    settings_count = len(settings_data) if settings_data else 0
    claude_json_data = _read_json(claude_json_path)
    mcp_server_count = len(list_mcp_server_entries(claude_json_data))

    return {
        "id": config_dir.name,
        "path": str(config_dir),
        "claude_json_path": str(claude_json_path),
        "label": config_dir.name,
        "has_credentials": (config_dir / ".credentials.json").exists(),
        "has_settings": (config_dir / "settings.json").exists(),
        "has_plugins": (config_dir / "plugins").is_dir(),
        "has_commands": (config_dir / "commands").is_dir(),
        "settings_count": settings_count,
        "mcp_server_count": mcp_server_count,
        "is_active": config_dir == settings.claude_home.resolve(),
    }


def scan_instances() -> list[dict[str, Any]]:
    """Discover all Claude config instances on disk.

    Globs ~/.claude* directories, filters to valid config dirs, and merges
    with any previously registered instances (deduplicating by resolved path).
    """
    home = Path.home()
    seen: set[Path] = set()
    instances: list[dict[str, Any]] = []

    # Scan filesystem for ~/.claude* directories
    for candidate in home.glob(".claude*"):
        if not candidate.is_dir():
            continue
        if candidate.name in _EXCLUDED_DIRS:
            continue
        if not _is_valid_config_dir(candidate):
            continue

        resolved = candidate.resolve()
        if resolved not in seen:
            seen.add(resolved)
            instances.append(_build_instance_metadata(resolved))

    # Merge in any registered instances not found by glob
    persisted = _read_persistence()
    for registered_path_str in persisted.get("registered", []):
        registered_path = Path(registered_path_str).resolve()
        if registered_path not in seen and registered_path.is_dir():
            seen.add(registered_path)
            instances.append(_build_instance_metadata(registered_path))

    # Sort: default instance first, then alphabetical by label
    instances.sort(key=lambda inst: (inst["path"] != str(_DEFAULT_INSTANCE.resolve()), inst["label"]))

    return instances


def switch_instance(path: str) -> dict[str, Any]:
    """Switch the active Claude config instance by mutating settings in-place.

    Updates claude_home, claude_json_path, and backup_dir to point at the
    target instance.  skill_providers_dir is intentionally left unchanged
    because providers are shared globally.
    """
    target = Path(path).resolve()
    if not target.is_dir():
        raise FileNotFoundError(f"Instance directory does not exist: {target}")

    # Mutate the settings singleton in-place
    settings.claude_home = target
    settings.claude_json_path = _find_claude_json_for(target)
    settings.backup_dir = target / "backups" / "claude-panel"
    # NOTE: skill_providers_dir is intentionally NOT mutated here.
    # Skill providers are shared across all instances (global registry).

    # Persist the active selection
    persisted = _read_persistence()
    persisted["active"] = str(target)
    _write_persistence(persisted)

    # Invalidate caches that depend on claude_home
    _invalidate_claude_md_cache()

    logger.info("Switched active instance to %s", target)
    return _build_instance_metadata(target)


def add_instance(path: str) -> dict[str, Any]:
    """Register a new instance directory.

    Validates the path exists and adds it to the persisted registered list.
    """
    target = Path(path).resolve()
    if not target.is_dir():
        raise FileNotFoundError(f"Directory does not exist: {target}")

    persisted = _read_persistence()
    registered = [Path(p).resolve() for p in persisted.get("registered", [])]

    if target not in registered:
        persisted.setdefault("registered", []).append(str(target))
        _write_persistence(persisted)
        logger.info("Registered new instance: %s", target)

    return _build_instance_metadata(target)


def remove_instance(path: str) -> dict[str, str]:
    """Remove an instance from the registered list.

    Cannot remove the default ~/.claude instance.
    """
    target = Path(path).resolve()

    if target == _DEFAULT_INSTANCE.resolve():
        raise ValueError("Cannot remove the default ~/.claude instance")

    persisted = _read_persistence()
    original = persisted.get("registered", [])
    persisted["registered"] = [
        p for p in original if Path(p).resolve() != target
    ]

    # If the removed instance was active, clear the active selection
    if persisted.get("active") and Path(persisted["active"]).resolve() == target:
        persisted["active"] = None

    _write_persistence(persisted)
    logger.info("Removed instance: %s", target)

    return {"removed": str(target)}


def list_instances() -> dict[str, Any]:
    """List all instances with metadata, including the active one."""
    instances = scan_instances()
    active = next((i for i in instances if i["is_active"]), None)
    return {"instances": instances, "active": active}


def get_active_instance() -> dict[str, Any]:
    """Return metadata for the currently active instance."""
    return _build_instance_metadata(settings.claude_home.resolve())


def load_persisted_instance() -> str | None:
    """Read the persistence file and return the active instance path, if any.

    Returns None if no active instance is persisted or the path no longer exists.
    """
    persisted = _read_persistence()
    active = persisted.get("active")

    if active and Path(active).is_dir():
        return active

    return None
