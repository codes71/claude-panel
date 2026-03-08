"""Models for the token budget dashboard."""

from pydantic import BaseModel, Field


class TokenItem(BaseModel):
    """A single item contributing to token usage."""

    name: str
    category: str
    estimated_tokens: int = 0
    file_path: str = ""
    enabled: bool = True


class TokenCategory(BaseModel):
    """A group of token items (e.g. plugins, MCP servers)."""

    name: str
    total_tokens: int = 0
    items: list[TokenItem] = Field(default_factory=list)
    color: str = "#6366f1"


class OptimizationSuggestion(BaseModel):
    """An actionable suggestion to reduce token usage."""

    title: str
    description: str
    savings_tokens: int = 0
    action_type: str = ""
    action_params: dict[str, str] = Field(default_factory=dict)


class DashboardResponse(BaseModel):
    """Full dashboard payload for the frontend."""

    total_tokens: int = 0
    categories: list[TokenCategory] = Field(default_factory=list)
    suggestions: list[OptimizationSuggestion] = Field(default_factory=list)
    top_consumers: list[TokenItem] = Field(default_factory=list)
