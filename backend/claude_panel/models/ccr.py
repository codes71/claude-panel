"""Models for Claude Code Router (CCR) dashboard."""

from pydantic import BaseModel, Field


class CcrProvider(BaseModel):
    """A configured LLM provider in CCR."""

    name: str
    api_base_url: str
    models: list[str] = Field(default_factory=list)
    has_api_key: bool = False
    transformer_names: list[str] = Field(default_factory=list)


class CcrRouterConfig(BaseModel):
    """Routing rules mapping request types to provider/model pairs."""

    default_model: str | None = None
    background: str | None = None
    think: str | None = None
    long_context: str | None = None
    long_context_threshold: int = 60000
    web_search: str | None = None


class CcrStatus(BaseModel):
    """Installation and runtime status of CCR."""

    installed: bool = False
    running: bool = False
    config_path: str = ""


class CcrDashboardResponse(BaseModel):
    """Full dashboard payload for the CCR page."""

    status: CcrStatus
    providers: list[CcrProvider] = Field(default_factory=list)
    router: CcrRouterConfig = Field(default_factory=CcrRouterConfig)
    raw_config: dict | None = None
