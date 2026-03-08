from pydantic import BaseModel, Field


class MarketplaceInfo(BaseModel):
    id: str
    name: str
    description: str = ""
    owner: str = ""
    plugin_count: int = 0
    last_updated: str = ""


class MarketplacePlugin(BaseModel):
    name: str
    marketplace_id: str
    plugin_id: str
    description: str = ""
    version: str = ""
    category: str = ""
    author: str = ""
    homepage: str = ""
    installed: bool = False
    installed_version: str = ""
    installed_scope: str = ""
    enabled: bool = False
    skills: list[str] = Field(default_factory=list)
    agents: list[str] = Field(default_factory=list)
    commands: list[str] = Field(default_factory=list)


class MarketplaceListResponse(BaseModel):
    marketplaces: list[MarketplaceInfo] = Field(default_factory=list)
    plugins: list[MarketplacePlugin] = Field(default_factory=list)
    total_available: int = 0
    total_installed: int = 0


class PluginInstallRequest(BaseModel):
    plugin_id: str
    scope: str = "user"


class PluginActionResponse(BaseModel):
    plugin_id: str
    action: str
    success: bool
    message: str = ""


class ProviderInfo(BaseModel):
    id: str
    name: str
    description: str = ""
    owner: str = ""
    repo: str = ""
    plugin_count: int = 0
    last_updated: str = ""
    install_location: str = ""


class ProviderAddRequest(BaseModel):
    source: str


class ProviderActionResponse(BaseModel):
    name: str
    action: str
    success: bool
    message: str = ""
