"""Read and write ~/.claude.json — only mcpServers section."""

import json
from pathlib import Path

from ccm.config import settings
from ccm.services.backup import safe_write_json


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
