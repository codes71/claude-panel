"""Common models shared across the CCM application."""

from datetime import datetime

from pydantic import BaseModel


class HealthCheck(BaseModel):
    """API health check response."""

    status: str = "ok"
    version: str = "1.0.0"
    claude_home: str


class BackupRecord(BaseModel):
    """Record of a configuration file backup."""

    path: str
    timestamp: datetime
    original_file: str


class ErrorResponse(BaseModel):
    """Standardized error response."""

    detail: str
    code: str | None = None


class ConfigBundleResponse(BaseModel):
    """Exported configuration bundle response."""

    bundle: dict


class ConfigBundleValidationResponse(BaseModel):
    """Validation result for a configuration bundle."""

    valid: bool = True
    errors: list[str] = []
    warnings: list[str] = []


class ConfigBundleApplyResponse(BaseModel):
    """Apply/dry-run result for a configuration bundle."""

    applied: bool = False
    changes: list[str] = []
    errors: list[str] = []
    warnings: list[str] = []
