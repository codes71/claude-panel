"""Models for custom agents."""

from pydantic import BaseModel, Field


class AgentInfo(BaseModel):
    """Summary metadata for a single agent."""

    name: str
    display_name: str = ""
    file_path: str = ""
    size_bytes: int = 0
    token_estimate: int = 0
    description: str = ""
    color: str = ""
    emoji: str = ""
    vibe: str = ""
    model: str = ""


class AgentDetail(AgentInfo):
    """Full agent details including file content."""

    content: str = ""


class AgentCreateRequest(BaseModel):
    """Request to create a new agent."""

    name: str
    content: str


class AgentUpdateRequest(BaseModel):
    """Request to update an existing agent's content."""

    content: str


class AgentRenameRequest(BaseModel):
    """Request to rename an agent."""

    new_name: str


class AgentListResponse(BaseModel):
    """Response listing all agents."""

    agents: list[AgentInfo] = Field(default_factory=list)
    total_count: int = 0
    total_tokens: int = 0


class BrowseRequest(BaseModel):
    """Request to browse a directory."""

    path: str = ""


class BrowseEntry(BaseModel):
    """A single entry in a directory listing."""

    name: str
    path: str
    is_dir: bool
    md_count: int = 0


class BrowseResponse(BaseModel):
    """Response listing directory contents."""

    path: str
    parent: str | None = None
    entries: list[BrowseEntry] = Field(default_factory=list)


class AgentScanRequest(BaseModel):
    """Request to scan a folder for importable agents."""

    folder_path: str


class AgentScanResponse(BaseModel):
    """Response listing agents found in a scanned folder."""

    folder_path: str
    agents: list[AgentInfo] = Field(default_factory=list)
    total_count: int = 0


class AgentImportRequest(BaseModel):
    """Request to import agents from a folder."""

    folder_path: str
    names: list[str]
    overwrite: bool = False
