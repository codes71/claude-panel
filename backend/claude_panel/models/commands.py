"""Models for custom slash commands."""

from pydantic import BaseModel, Field


class CommandNamespace(BaseModel):
    """A namespace (subdirectory) grouping related commands."""

    name: str
    command_count: int
    total_tokens: int


class CommandInfo(BaseModel):
    """Summary metadata for a single command."""

    name: str
    namespace: str
    qualified_name: str
    file_path: str
    size_bytes: int
    token_estimate: int
    description: str = ""
    category: str = ""


class CommandDetail(CommandInfo):
    """Full command details including file content."""

    content: str


class CommandCreateRequest(BaseModel):
    """Request to create a new command."""

    namespace: str = ""
    name: str
    content: str


class CommandUpdateRequest(BaseModel):
    """Request to update an existing command's content."""

    content: str


class CommandRenameRequest(BaseModel):
    """Request to rename/move a command to a new namespace and/or name."""

    new_namespace: str = ""
    new_name: str


class CommandListResponse(BaseModel):
    """Response listing all commands with namespace groupings."""

    namespaces: list[CommandNamespace] = Field(default_factory=list)
    commands: list[CommandInfo] = Field(default_factory=list)
    total_count: int = 0
    total_tokens: int = 0
