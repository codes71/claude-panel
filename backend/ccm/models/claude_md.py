"""Models for CLAUDE.md file management."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class ClaudeMdScope(str, Enum):
    """Where a CLAUDE.md file applies."""

    GLOBAL = "global"
    PROJECT = "project"


class ClaudeMdFile(BaseModel):
    """Representation of a single CLAUDE.md file."""

    path: str
    scope: ClaudeMdScope = ClaudeMdScope.PROJECT
    content: str = ""
    token_estimate: int = 0
    last_modified: datetime | None = None


class ClaudeMdUpdateRequest(BaseModel):
    """Request to update an existing CLAUDE.md file."""

    path: str
    content: str


class ClaudeMdCreateRequest(BaseModel):
    """Request to create a new CLAUDE.md file."""

    path: str
    content: str


class ClaudeMdListResponse(BaseModel):
    """Response listing all discovered CLAUDE.md files."""

    files: list[ClaudeMdFile] = Field(default_factory=list)
    total_tokens: int = 0


class ClaudeMdTreeNode(BaseModel):
    """A node in the CLAUDE.md file tree (directory or file)."""

    name: str
    path: str | None = None
    scope: ClaudeMdScope | None = None
    token_estimate: int = 0
    size_bytes: int = 0
    children: list["ClaudeMdTreeNode"] = Field(default_factory=list)


class ClaudeMdTreeResponse(BaseModel):
    """Response with both tree and flat file list."""

    tree: list[ClaudeMdTreeNode] = Field(default_factory=list)
    files: list[ClaudeMdFile] = Field(default_factory=list)
    total_tokens: int = 0
