"""Path-aware helpers for cross-instance operations.

All functions take an explicit instance_path rather than relying on the
global settings singleton, so transfer operations never mutate the active
instance.
"""

import json
from pathlib import Path

# The default instance is always ~/.claude
_DEFAULT_INSTANCE = Path.home() / ".claude"


def claude_json_path_for(instance_path: Path) -> Path:
    """Return the .claude.json path for a given instance.

    The default instance (~/.claude) stores its .claude.json at ~/.claude.json.
    All other instances store it inside the config directory.
    """
    if instance_path.resolve() == _DEFAULT_INSTANCE.resolve():
        return Path.home() / ".claude.json"
    return instance_path / ".claude.json"


def backup_dir_for(instance_path: Path) -> Path:
    """Return the backup directory for a given instance."""
    return instance_path / "backups" / "claude-panel"


def commands_dir_for(instance_path: Path) -> Path:
    """Return the commands directory for a given instance."""
    return instance_path / "commands"


def agents_dir_for(instance_path: Path) -> Path:
    """Return the agents directory for a given instance."""
    return instance_path / "agents"


def read_claude_json_for(instance_path: Path) -> dict:
    """Read the .claude.json for a given instance."""
    path = claude_json_path_for(instance_path)
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, PermissionError, OSError):
        return {}


def get_global_mcp_servers_for(instance_path: Path) -> dict[str, dict]:
    """Return only root-level mcpServers (not project-scoped or plugin-derived)."""
    return read_claude_json_for(instance_path).get("mcpServers", {})
