"""Models for cross-instance configuration transfer."""

from pydantic import BaseModel, Field


# --- Transfer item references (what the user selected to transfer) ---

class TransferCommandRef(BaseModel):
    namespace: str
    name: str


class TransferPluginRef(BaseModel):
    plugin_id: str


class TransferMcpRef(BaseModel):
    name: str


class TransferAgentRef(BaseModel):
    name: str


# --- Preview request/response ---

class TransferPreviewRequest(BaseModel):
    source_path: str
    target_path: str
    commands: list[TransferCommandRef] = Field(default_factory=list)
    plugins: list[TransferPluginRef] = Field(default_factory=list)
    mcp_servers: list[TransferMcpRef] = Field(default_factory=list)
    agents: list[TransferAgentRef] = Field(default_factory=list)


class TransferItemPreview(BaseModel):
    """Preview result for a single transferable item."""
    name: str
    status: str  # "new", "noop", "conflict"
    source_summary: str = ""
    target_summary: str = ""
    warnings: list[str] = Field(default_factory=list)


class TransferCategorySummary(BaseModel):
    selected: int = 0
    new: int = 0
    noop: int = 0
    conflict: int = 0


class TransferPreviewSummary(BaseModel):
    commands: TransferCategorySummary = Field(default_factory=TransferCategorySummary)
    plugins: TransferCategorySummary = Field(default_factory=TransferCategorySummary)
    mcp_servers: TransferCategorySummary = Field(default_factory=TransferCategorySummary)
    agents: TransferCategorySummary = Field(default_factory=TransferCategorySummary)


class TransferPreviewResponse(BaseModel):
    summary: TransferPreviewSummary
    commands: list[TransferItemPreview] = Field(default_factory=list)
    plugins: list[TransferItemPreview] = Field(default_factory=list)
    mcp_servers: list[TransferItemPreview] = Field(default_factory=list)
    agents: list[TransferItemPreview] = Field(default_factory=list)


# --- Apply request/response ---

class TransferApplyRequest(BaseModel):
    source_path: str
    target_path: str
    commands: list[TransferCommandRef] = Field(default_factory=list)
    plugins: list[TransferPluginRef] = Field(default_factory=list)
    mcp_servers: list[TransferMcpRef] = Field(default_factory=list)
    agents: list[TransferAgentRef] = Field(default_factory=list)
    conflict_mode: str = "skip"  # "skip" or "overwrite"


class TransferItemResult(BaseModel):
    """Result for a single transferred item."""
    name: str
    action: str  # "copied", "skipped", "overwritten", "failed"
    error: str = ""


class TransferApplySummary(BaseModel):
    copied: int = 0
    skipped: int = 0
    overwritten: int = 0
    failed: int = 0


class TransferApplyResponse(BaseModel):
    summary: TransferApplySummary
    commands: list[TransferItemResult] = Field(default_factory=list)
    plugins: list[TransferItemResult] = Field(default_factory=list)
    mcp_servers: list[TransferItemResult] = Field(default_factory=list)
    agents: list[TransferItemResult] = Field(default_factory=list)
