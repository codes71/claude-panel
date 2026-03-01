"""Models for MCP server management."""

from enum import Enum

from pydantic import BaseModel, Field


class McpServerType(str, Enum):
    """Transport type for an MCP server."""

    STDIO = "stdio"
    HTTP = "http"


class McpScope(str, Enum):
    """Whether a server is configured globally or per-project."""

    GLOBAL = "global"
    PROJECT = "project"


class McpServer(BaseModel):
    """Representation of a configured MCP server."""

    name: str
    server_type: McpServerType = McpServerType.STDIO
    command: str | None = None
    args: list[str] = Field(default_factory=list)
    env: dict[str, str] = Field(default_factory=dict)
    url: str | None = None
    tool_count: int = 0
    estimated_tokens: int = 0
    enabled: bool = True
    scope: McpScope = McpScope.GLOBAL


class McpServerToggleRequest(BaseModel):
    """Request to enable or disable an MCP server."""

    name: str
    enabled: bool


class McpServerCreateRequest(BaseModel):
    """Request to add a new MCP server."""

    name: str
    server_type: McpServerType = McpServerType.STDIO
    command: str | None = None
    args: list[str] = Field(default_factory=list)
    env: dict[str, str] = Field(default_factory=dict)
    url: str | None = None
    scope: McpScope = McpScope.GLOBAL


class McpServerListResponse(BaseModel):
    """Response listing all configured MCP servers."""

    servers: list[McpServer] = Field(default_factory=list)
    total_tokens: int = 0
