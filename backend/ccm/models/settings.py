"""Models for ~/.claude/settings.json configuration."""

from pydantic import BaseModel, Field


class StatusLineConfig(BaseModel):
    """Status line configuration for Claude Code CLI."""

    type: str = "command"
    command: str = ""


class EnvVarUpdate(BaseModel):
    """Environment variable set/delete operation.

    Set value to None to delete the variable.
    """

    key: str
    value: str | None = None


class SettingsJson(BaseModel):
    """Full model of ~/.claude/settings.json."""

    model_config = {"extra": "allow"}

    env: dict[str, str] = Field(default_factory=dict)
    statusLine: StatusLineConfig | None = None
    enabledPlugins: dict[str, bool] = Field(default_factory=dict)
    skipDangerousModePermissionPrompt: bool = False


class SettingsUpdateRequest(BaseModel):
    """PATCH request body for updating settings.

    All fields are optional; only provided fields are applied.
    """

    env: list[EnvVarUpdate] | None = None
    statusLine: StatusLineConfig | None = None
    enabledPlugins: dict[str, bool] | None = None
    skipDangerousModePermissionPrompt: bool | None = None
