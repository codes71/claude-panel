"""Models for the mcpServers section of ~/.claude.json."""

from pydantic import BaseModel, Field


class McpServerConfig(BaseModel):
    """Configuration for a single MCP server entry in .claude.json.

    Supports both stdio and http server types.
    """

    model_config = {"extra": "allow"}

    type: str = "stdio"
    command: str | None = None
    args: list[str] = Field(default_factory=list)
    env: dict[str, str] = Field(default_factory=dict)
    cwd: str | None = None
    url: str | None = None


class ClaudeJsonMcpServers(BaseModel):
    """Container for mcpServers dict from .claude.json.

    Only models the mcpServers section; the rest of .claude.json
    is treated as opaque pass-through data.
    """

    servers: dict[str, McpServerConfig] = Field(default_factory=dict)
