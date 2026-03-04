"""Data models for the configuration scanner."""

from dataclasses import dataclass, field


@dataclass
class PluginInfo:
    plugin_id: str
    name: str
    marketplace: str
    enabled: bool
    skills: list[str] = field(default_factory=list)
    agents: list[str] = field(default_factory=list)
    commands: list[str] = field(default_factory=list)
    size_bytes: int = 0


@dataclass
class McpServerInfo:
    name: str
    server_type: str  # stdio, sse
    command: str
    args: list[str] = field(default_factory=list)
    env: dict[str, str] = field(default_factory=dict)
    enabled: bool = True
    scope: str = "global"  # global or project


@dataclass
class ClaudeMdInfo:
    path: str
    scope: str  # global, project
    size_bytes: int = 0
    last_modified: float = 0.0


@dataclass
class CommandFileInfo:
    name: str
    file_path: str
    size_bytes: int = 0


@dataclass
class HookInfo:
    event: str
    command: str
    file_path: str


@dataclass
class AgentFileInfo:
    name: str
    file_path: str
    size_bytes: int = 0


@dataclass
class MemoryFileInfo:
    name: str
    file_path: str
    size_bytes: int = 0
    last_modified: float = 0.0


@dataclass
class ConfigTree:
    plugins: list[PluginInfo] = field(default_factory=list)
    mcp_servers: list[McpServerInfo] = field(default_factory=list)
    claude_md_files: list[ClaudeMdInfo] = field(default_factory=list)
    commands: list[CommandFileInfo] = field(default_factory=list)
    hooks: list[HookInfo] = field(default_factory=list)
    agents: list[AgentFileInfo] = field(default_factory=list)
    memory_files: list[MemoryFileInfo] = field(default_factory=list)
    settings_json: dict | None = None
    claude_json: dict | None = None
