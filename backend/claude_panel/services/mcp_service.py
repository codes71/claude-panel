"""MCP server management with enable/disable via sidecar file."""

import json
from pathlib import Path

from claude_panel.config import settings
from claude_panel.services.claude_json_service import get_mcp_servers, list_mcp_server_entries, set_mcp_servers
from claude_panel.services.mcp_diagnostics_service import diagnose_server as diagnose_server_config
from claude_panel.services import mcp_health_service
from claude_panel.services.plugin_service import list_plugin_mcp_entries


def _sidecar_path() -> Path:
    return settings.claude_home / "claude-panel-disabled-mcp.json"


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
    active = list_mcp_server_entries()
    disabled = _read_sidecar()

    servers = []
    for server in active:
        # Add default values for new fields
        enhanced_server = {
            **server,
            "tool_count": 0,  # Unknown without running the server
            "estimated_tokens": 950,  # Default estimate
            "oauth_auth_server_metadata_url": server.get("oauth_auth_server_metadata_url"),
            "has_headers_helper": server.get("has_headers_helper", False),
            "connection_status": server.get("connection_status", "unknown"),
            "last_connection_attempt": server.get("last_connection_attempt"),
            "has_output_schema_issues": server.get("has_output_schema_issues", False),
            "validation_warnings": server.get("validation_warnings", []),
        }
        servers.append(enhanced_server)

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
            "project_path": None,
            "tool_count": 0,
            "estimated_tokens": 0,
            "oauth_auth_server_metadata_url": config.get("oauth_auth_server_metadata_url"),
            "has_headers_helper": config.get("has_headers_helper", False),
            "connection_status": config.get("connection_status", "unknown"),
            "last_connection_attempt": config.get("last_connection_attempt"),
            "has_output_schema_issues": config.get("has_output_schema_issues", False),
            "validation_warnings": config.get("validation_warnings", []),
        })

    # Append plugin-provided MCP servers
    for server in list_plugin_mcp_entries():
        enhanced_server = {
            **server,
            "tool_count": 0,
            "estimated_tokens": 950,
            "oauth_auth_server_metadata_url": server.get("oauth_auth_server_metadata_url"),
            "has_headers_helper": server.get("has_headers_helper", False),
            "connection_status": server.get("connection_status", "unknown"),
            "last_connection_attempt": server.get("last_connection_attempt"),
            "has_output_schema_issues": server.get("has_output_schema_issues", False),
            "validation_warnings": server.get("validation_warnings", []),
        }
        servers.append(enhanced_server)

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


def diagnose_server(name: str) -> dict:
    """Return diagnostics for one configured MCP server."""
    servers = list_all_servers()
    matching_servers = [s for s in servers if s["name"] == name]
    server = next((s for s in matching_servers if s.get("scope") == "global"), None)
    if server is None and matching_servers:
        server = matching_servers[0]
    if not server:
        raise KeyError(f"Server '{name}' not found")

    report = diagnose_server_config(server)
    return {
        "name": name,
        "enabled": server["enabled"],
        "server_type": server["server_type"],
        "scope": server["scope"],
        "project_path": server.get("project_path"),
        **report,
    }


def diagnose_all_servers() -> dict:
    """Return diagnostics for all configured MCP servers."""
    reports = []
    for server in list_all_servers():
        report = diagnose_server_config(server)
        reports.append({
            "name": server["name"],
            "enabled": server["enabled"],
            "server_type": server["server_type"],
            "scope": server["scope"],
            "project_path": server.get("project_path"),
            **report,
        })
    return {"servers": reports, "total": len(reports)}


def list_health() -> dict:
    """Return current MCP health snapshot and persist latest diagnostics."""
    diagnostics = diagnose_all_servers()["servers"]
    return mcp_health_service.update_health_from_diagnostics(diagnostics)
