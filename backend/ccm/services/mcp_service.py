"""MCP server management with enable/disable via sidecar file."""

import json
from pathlib import Path

from ccm.config import settings
from ccm.services.claude_json_service import get_mcp_servers, set_mcp_servers


def _sidecar_path() -> Path:
    return settings.claude_home / "ccm-disabled-mcp.json"


def _read_sidecar() -> dict:
    """Read disabled MCP servers from sidecar file."""
    path = _sidecar_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, PermissionError):
        return {}


def _write_sidecar(data: dict) -> None:
    """Write disabled MCP servers to sidecar file."""
    path = _sidecar_path()
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def list_all_servers() -> list[dict]:
    """List all MCP servers (active + disabled)."""
    active = get_mcp_servers()
    disabled = _read_sidecar()

    servers = []
    for name, config in active.items():
        server_type = "sse" if "url" in config else "stdio"
        servers.append({
            "name": name,
            "server_type": server_type,
            "command": config.get("command", config.get("url", "")),
            "args": config.get("args", []),
            "env": config.get("env", {}),
            "enabled": True,
            "scope": "global",
            "tool_count": 0,  # Unknown without running the server
            "estimated_tokens": 950,  # Default estimate
        })

    for name, config in disabled.items():
        server_type = "sse" if "url" in config else "stdio"
        servers.append({
            "name": name,
            "server_type": server_type,
            "command": config.get("command", config.get("url", "")),
            "args": config.get("args", []),
            "env": config.get("env", {}),
            "enabled": False,
            "scope": "global",
            "tool_count": 0,
            "estimated_tokens": 0,
        })

    return servers


def toggle_server(name: str, enabled: bool) -> dict:
    """Enable or disable an MCP server.

    Disabling: removes from .claude.json, stores in sidecar.
    Enabling: removes from sidecar, adds back to .claude.json.
    """
    active = get_mcp_servers()
    disabled = _read_sidecar()

    if enabled:
        # Move from sidecar to active
        if name not in disabled:
            if name in active:
                return {"name": name, "enabled": True, "status": "already_enabled"}
            raise KeyError(f"Server '{name}' not found in disabled servers")
        config = disabled.pop(name)
        active[name] = config
        set_mcp_servers(active)
        _write_sidecar(disabled)
        return {"name": name, "enabled": True, "status": "enabled"}
    else:
        # Move from active to sidecar
        if name not in active:
            if name in disabled:
                return {"name": name, "enabled": False, "status": "already_disabled"}
            raise KeyError(f"Server '{name}' not found in active servers")
        config = active.pop(name)
        disabled[name] = config
        set_mcp_servers(active)
        _write_sidecar(disabled)
        return {"name": name, "enabled": False, "status": "disabled"}
