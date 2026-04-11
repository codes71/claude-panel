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
    PLUGIN = "plugin"


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
    project_path: str | None = None
    plugin_id: str | None = None
    read_only: bool = False
    # OAuth configuration
    oauth_auth_server_metadata_url: str | None = None
    # Connection status
    has_headers_helper: bool = False
    connection_status: str = "unknown"  # "connected" | "reconnecting" | "disconnected" | "unknown"
    last_connection_attempt: float | None = None
    # Validation warnings
    has_output_schema_issues: bool = False
    validation_warnings: list[str] = Field(default_factory=list)


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
    # OAuth configuration
    oauth_auth_server_metadata_url: str | None = None


class McpServerListResponse(BaseModel):
    """Response listing all configured MCP servers."""

    servers: list[McpServer] = Field(default_factory=list)
    total_tokens: int = 0


class McpDiagnosticCheck(BaseModel):
    """One validation check in an MCP diagnostics report."""

    code: str
    status: str  # "ok" | "warn" | "fail"
    message: str


class McpDiagnosticReport(BaseModel):
    """Diagnostics report for a single MCP server."""

    name: str
    enabled: bool = True
    server_type: McpServerType = McpServerType.STDIO
    scope: McpScope = McpScope.GLOBAL
    project_path: str | None = None
    status: str  # "ok" | "warn" | "fail"
    checks: list[McpDiagnosticCheck] = Field(default_factory=list)
    checked_at: float = 0


class McpDiagnosticsResponse(BaseModel):
    """Diagnostics response across all MCP servers."""

    servers: list[McpDiagnosticReport] = Field(default_factory=list)
    total: int = 0


class McpHealthItem(BaseModel):
    """Persisted MCP health status for a server."""

    name: str
    enabled: bool = True
    scope: McpScope = McpScope.GLOBAL
    project_path: str | None = None
    status: str = "unknown"  # "ok" | "warn" | "fail" | "unknown"
    error_code: str = ""
    message: str = ""
    checked_at: float = 0


class McpHealthResponse(BaseModel):
    """MCP health response across all servers."""

    servers: list[McpHealthItem] = Field(default_factory=list)
    updated_at: float = 0
