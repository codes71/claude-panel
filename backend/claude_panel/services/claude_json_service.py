"""Read and write ~/.claude.json — only mcpServers section."""

import json
from pathlib import Path

from claude_panel.config import settings
from claude_panel.services.backup import safe_write_json


def _claude_json_path() -> Path:
    return settings.claude_json_path


def read_claude_json() -> dict:
    """Read full ~/.claude.json."""
    path = _claude_json_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, PermissionError, OSError):
        return {}


def get_mcp_servers() -> dict:
    """Get mcpServers section from ~/.claude.json."""
    data = read_claude_json()
    return data.get("mcpServers", {})


def list_mcp_server_entries(data: dict | None = None) -> list[dict]:
    """Return normalized MCP server entries from global and project scopes."""
    payload = read_claude_json() if data is None else data
    if not isinstance(payload, dict):
        return []

    entries: list[dict] = []

    def append_entries(servers: dict | None, scope: str, project_path: str | None = None) -> None:
        if not isinstance(servers, dict):
            return
        for name, config in servers.items():
            if not isinstance(config, dict):
                continue
            is_network_server = "url" in config or config.get("type") == "http"
            entries.append({
                "name": name,
                "server_type": "sse" if is_network_server else "stdio",
                "command": config.get("command", config.get("url", "")),
                "args": config.get("args", []) if isinstance(config.get("args"), list) else [],
                "env": config.get("env", {}) if isinstance(config.get("env"), dict) else {},
                "enabled": True,
                "scope": scope,
                "project_path": project_path,
            })

    append_entries(payload.get("mcpServers"), "global")

    projects = payload.get("projects", {})
    if isinstance(projects, dict):
        for project_path, project_config in sorted(projects.items()):
            if not isinstance(project_config, dict):
                continue
            append_entries(project_config.get("mcpServers"), "project", str(project_path))

    return entries


def set_mcp_servers(servers: dict) -> dict:
    """Write mcpServers section, preserving all other keys."""
    data = read_claude_json()
    data["mcpServers"] = servers
    safe_write_json(_claude_json_path(), data)
    return servers


def add_mcp_server(name: str, config: dict) -> dict:
    """Add a new MCP server."""
    servers = get_mcp_servers()
    if name in servers:
        raise ValueError(f"MCP server '{name}' already exists")
    servers[name] = config
    return set_mcp_servers(servers)


def remove_mcp_server(name: str) -> dict:
    """Remove an MCP server."""
    servers = get_mcp_servers()
    if name not in servers:
        raise KeyError(f"MCP server '{name}' not found")
    del servers[name]
    return set_mcp_servers(servers)


def update_mcp_server(name: str, config: dict) -> dict:
    """Update an existing MCP server's config."""
    servers = get_mcp_servers()
    if name not in servers:
        raise KeyError(f"MCP server '{name}' not found")
    servers[name] = config
    return set_mcp_servers(servers)
