"""Models for multi-instance management."""

from pydantic import BaseModel


class InstanceInfo(BaseModel):
    """Metadata for a discovered Claude config instance."""

    id: str                    # unique id (directory name like ".claude" or ".claude-t")
    path: str                  # absolute path to config dir
    claude_json_path: str      # path to the .claude.json file
    label: str                 # human-readable label (dir name)
    has_credentials: bool
    has_settings: bool
    has_plugins: bool
    has_commands: bool
    settings_count: int
    mcp_server_count: int
    is_active: bool


class InstanceListResponse(BaseModel):
    """Response listing all instances and the active one."""

    instances: list[InstanceInfo]
    active: InstanceInfo | None


class InstanceSwitchRequest(BaseModel):
    """Request to switch the active instance."""

    path: str


class InstanceAddRequest(BaseModel):
    """Request to add a new instance by path."""

    path: str
