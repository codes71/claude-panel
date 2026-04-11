"""MCP server management with enable/disable via sidecar file."""

import json
from pathlib import Path

from claude_panel.config import settings
from claude_panel.services.claude_json_service import (
    add_mcp_server, add_project_mcp_server, get_mcp_servers,
    list_mcp_server_entries, read_claude_json, remove_mcp_server,
    remove_project_mcp_server, set_mcp_servers,
    update_mcp_server as update_global_mcp_server,
    update_project_mcp_server,
)
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
        servers.append({
            **server,
            "tool_count": 0,  # Unknown without running the server
            "estimated_tokens": 950,  # Default estimate
        })

    for name, config in disabled.items():
        is_network = "url" in config or config.get("type") == "http"
        server_type = "http" if is_network else "stdio"
        servers.append({
            "name": name,
            "server_type": server_type,
            "command": config.get("command") if not is_network else None,
            "url": config.get("url") if is_network else None,
            "args": config.get("args", []),
            "env": config.get("env", {}),
            "enabled": False,
            "scope": "global",
            "project_path": None,
            "tool_count": 0,
            "estimated_tokens": 0,
        })

    # Append plugin-provided MCP servers
    for server in list_plugin_mcp_entries():
        servers.append({**server, "tool_count": 0, "estimated_tokens": 950})

    return servers


def create_server(name: str, config: dict, scope: str, project_path: str | None) -> dict:
    """Create an MCP server in the specified scope.

    For global scope: writes to mcpServers in ~/.claude.json.
    For project scope: writes to projects[project_path].mcpServers.
    """
    if scope == "project":
        if not project_path:
            raise ValueError("project_path is required for project scope")
        # Check project exists
        data = read_claude_json()
        projects = data.get("projects", {})
        if project_path not in projects:
            raise ValueError(f"Project '{project_path}' not found in config")
        add_project_mcp_server(project_path, name, config)
    else:
        add_mcp_server(name, config)

    return {"name": name, "status": "created"}


def delete_server(name: str) -> dict:
    """Delete an MCP server from any scope (global, project, or disabled sidecar)."""
    all_servers = list_all_servers()
    server = next((s for s in all_servers if s["name"] == name), None)
    if not server:
        raise KeyError(f"Server '{name}' not found")

    if server.get("read_only"):
        raise ValueError(f"Server '{name}' is read-only and cannot be deleted")

    if not server["enabled"]:
        # Remove from sidecar
        disabled = _read_sidecar()
        if name in disabled:
            del disabled[name]
            _write_sidecar(disabled)
        return {"name": name, "status": "deleted"}

    if server["scope"] == "project" and server.get("project_path"):
        remove_project_mcp_server(server["project_path"], name)
    else:
        remove_mcp_server(name)

    return {"name": name, "status": "deleted"}


def list_project_paths() -> list[str]:
    """Return sorted list of known project paths from ~/.claude.json."""
    data = read_claude_json()
    projects = data.get("projects", {})
    if not isinstance(projects, dict):
        return []
    return sorted(projects.keys())


def update_server(old_name: str, updates: dict) -> dict:
    """Update an existing MCP server.

    Supports: config changes, rename, scope change (global<->project).
    Also handles disabled servers in the sidecar.
    """
    new_name = updates.get("new_name", old_name)
    new_scope = updates.get("scope")
    new_project_path = updates.get("project_path")
    new_config = updates.get("config")

    # Find the server
    all_servers = list_all_servers()
    server = next((s for s in all_servers if s["name"] == old_name), None)
    if not server:
        raise KeyError(f"Server '{old_name}' not found")

    old_scope = server["scope"]
    old_project_path = server.get("project_path")
    is_disabled = not server["enabled"]

    # Determine the effective new scope
    if new_scope is None:
        new_scope = old_scope
    if new_scope == "project" and new_project_path is None:
        new_project_path = old_project_path

    # Get current raw config
    if is_disabled:
        disabled = _read_sidecar()
        current_config = disabled.get(old_name, {})
    elif old_scope == "project" and old_project_path:
        data = read_claude_json()
        current_config = data.get("projects", {}).get(old_project_path, {}).get("mcpServers", {}).get(old_name, {})
    else:
        current_config = get_mcp_servers().get(old_name, {})

    # Apply config changes
    final_config = new_config if new_config else current_config

    # Handle disabled servers (sidecar)
    if is_disabled:
        disabled = _read_sidecar()
        if old_name in disabled:
            del disabled[old_name]
        disabled[new_name] = final_config
        _write_sidecar(disabled)
        return {"name": new_name, "status": "updated"}

    # Handle scope change
    scope_changed = new_scope != old_scope
    name_changed = new_name != old_name

    # Remove from old location
    if scope_changed or name_changed:
        if old_scope == "project" and old_project_path:
            remove_project_mcp_server(old_project_path, old_name)
        else:
            remove_mcp_server(old_name)

        # Add to new location
        if new_scope == "project" and new_project_path:
            add_project_mcp_server(new_project_path, new_name, final_config)
        else:
            add_mcp_server(new_name, final_config)
    else:
        # Same scope, same name — just update in place
        if old_scope == "project" and old_project_path:
            update_project_mcp_server(old_project_path, old_name, final_config)
        else:
            update_global_mcp_server(old_name, final_config)

    return {"name": new_name, "status": "updated"}


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

    report = diagnose_server_config(server, all_servers=servers)
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
    all_servers = list_all_servers()
    reports = []
    for server in all_servers:
        report = diagnose_server_config(server, all_servers=all_servers)
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
