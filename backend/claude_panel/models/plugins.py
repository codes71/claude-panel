"""Models for Claude Code plugin management."""

from datetime import datetime

from pydantic import BaseModel, Field


class PluginMetadata(BaseModel):
    """Core plugin identification and versioning."""

    name: str
    marketplace_id: str
    version: str
    scope: str = "user"
    install_path: str = ""
    installed_at: datetime | None = None
    last_updated: datetime | None = None
    git_commit_sha: str | None = None


class PluginComponents(BaseModel):
    """Breakdown of what a plugin provides."""

    skills: list[str] = Field(default_factory=list)
    agents: list[str] = Field(default_factory=list)
    commands: list[str] = Field(default_factory=list)


class PluginDetail(BaseModel):
    """Full plugin details for API responses."""

    metadata: PluginMetadata
    components: PluginComponents = Field(default_factory=PluginComponents)
    enabled: bool = True
    estimated_tokens: int = 0


class PluginToggleRequest(BaseModel):
    """Request to enable or disable a plugin."""

    plugin_id: str
    enabled: bool


class PluginListResponse(BaseModel):
    """Response listing all plugins with token totals."""

    plugins: list[PluginDetail] = Field(default_factory=list)
    total_tokens: int = 0
