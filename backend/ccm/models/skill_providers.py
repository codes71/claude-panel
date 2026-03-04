"""Models for skill provider management."""

from pydantic import BaseModel, Field


class SkillProviderInfo(BaseModel):
    """Metadata for a registered skill provider."""

    slug: str
    display_name: str
    owner: str
    repo_url: str
    branch: str = "main"
    added_at: str = ""
    last_updated: str = ""
    skill_count: int = 0
    command_count: int = 0


class DiscoveredSkill(BaseModel):
    """A skill discovered in a provider repo."""

    id: str  # "slug::skills/name"
    provider_slug: str
    name: str
    path_in_repo: str
    description: str = ""
    token_estimate: int = 0
    installed: bool = False
    installed_scope: str = ""  # "personal" | "project" | ""
    installed_path: str = ""


class DiscoveredCommand(BaseModel):
    """A command discovered in a provider repo."""

    id: str  # "slug::commands/name.md"
    provider_slug: str
    name: str
    path_in_repo: str
    description: str = ""
    token_estimate: int = 0
    installed: bool = False
    installed_scope: str = ""
    installed_path: str = ""


class SkillProviderListResponse(BaseModel):
    """Response listing all providers and discovered items."""

    providers: list[SkillProviderInfo] = Field(default_factory=list)
    skills: list[DiscoveredSkill] = Field(default_factory=list)
    commands: list[DiscoveredCommand] = Field(default_factory=list)
    total_providers: int = 0
    total_skills: int = 0
    total_commands: int = 0


class SkillProviderAddRequest(BaseModel):
    """Request to add a skill provider."""

    source: str  # "owner/repo" or full GitHub URL
    branch: str = "main"


class SkillInstallRequest(BaseModel):
    """Request to install a skill or command."""

    item_id: str  # "slug::path"
    scope: str = "personal"  # "personal" | "project"


class SkillProviderActionResponse(BaseModel):
    """Response for provider add/remove/update actions."""

    slug: str
    action: str
    success: bool
    message: str = ""


class SkillInstallActionResponse(BaseModel):
    """Response for skill install/uninstall actions."""

    item_id: str
    action: str
    success: bool
    message: str = ""
    installed_path: str = ""


class CatalogItem(BaseModel):
    """A single item in the paginated catalog."""
    id: str
    provider_slug: str
    name: str
    path_in_repo: str
    description: str = ""
    category: str = ""
    token_estimate: int = 0
    item_type: str = "skill"  # "skill" | "command"
    installed: bool = False
    installed_scope: str = ""
    installed_path: str = ""


class CatalogPageResponse(BaseModel):
    """Paginated catalog response."""
    items: list[CatalogItem] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 48
    total_pages: int = 1
