"""Models for Claude Code visibility/introspection data."""

from datetime import datetime

from pydantic import BaseModel, Field


class CommandInfo(BaseModel):
    """A custom slash command file."""

    name: str
    file_path: str
    size_bytes: int = 0
    description: str = ""


class HookConfig(BaseModel):
    """A configured hook entry."""

    event: str
    command: str
    file_path: str = ""


class AgentInfo(BaseModel):
    """A custom agent definition."""

    name: str
    file_path: str
    description: str = ""
    size_bytes: int = 0


class MemoryFile(BaseModel):
    """A file in the auto-memory directory."""

    name: str
    file_path: str
    size_bytes: int = 0
    last_modified: datetime | None = None


class VisibilityResponse(BaseModel):
    """Aggregated view of commands, hooks, agents, and memory files."""

    commands: list[CommandInfo] = Field(default_factory=list)
    hooks: list[HookConfig] = Field(default_factory=list)
    agents: list[AgentInfo] = Field(default_factory=list)
    memory_files: list[MemoryFile] = Field(default_factory=list)
