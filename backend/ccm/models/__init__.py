"""CCM Pydantic models – re-exports for convenient imports."""

from ccm.models.claude_json import ClaudeJsonMcpServers, McpServerConfig
from ccm.models.claude_md import (
    ClaudeMdCreateRequest,
    ClaudeMdFile,
    ClaudeMdListResponse,
    ClaudeMdScope,
    ClaudeMdUpdateRequest,
)
from ccm.models.common import BackupRecord, ErrorResponse, HealthCheck
from ccm.models.dashboard import (
    DashboardResponse,
    OptimizationSuggestion,
    TokenCategory,
    TokenItem,
)
from ccm.models.mcp import (
    McpScope,
    McpServer,
    McpServerCreateRequest,
    McpServerListResponse,
    McpServerToggleRequest,
    McpServerType,
)
from ccm.models.plugins import (
    PluginComponents,
    PluginDetail,
    PluginListResponse,
    PluginMetadata,
    PluginToggleRequest,
)
from ccm.models.settings import (
    EnvVarUpdate,
    SettingsJson,
    SettingsUpdateRequest,
    StatusLineConfig,
)
from ccm.models.visibility import (
    AgentInfo,
    CommandInfo,
    HookConfig,
    MemoryFile,
    VisibilityResponse,
)

__all__ = [
    # common
    "BackupRecord",
    "ErrorResponse",
    "HealthCheck",
    # settings
    "EnvVarUpdate",
    "SettingsJson",
    "SettingsUpdateRequest",
    "StatusLineConfig",
    # claude_json
    "ClaudeJsonMcpServers",
    "McpServerConfig",
    # plugins
    "PluginComponents",
    "PluginDetail",
    "PluginListResponse",
    "PluginMetadata",
    "PluginToggleRequest",
    # mcp
    "McpScope",
    "McpServer",
    "McpServerCreateRequest",
    "McpServerListResponse",
    "McpServerToggleRequest",
    "McpServerType",
    # claude_md
    "ClaudeMdCreateRequest",
    "ClaudeMdFile",
    "ClaudeMdListResponse",
    "ClaudeMdScope",
    "ClaudeMdUpdateRequest",
    # visibility
    "AgentInfo",
    "CommandInfo",
    "HookConfig",
    "MemoryFile",
    "VisibilityResponse",
    # dashboard
    "DashboardResponse",
    "OptimizationSuggestion",
    "TokenCategory",
    "TokenItem",
]
