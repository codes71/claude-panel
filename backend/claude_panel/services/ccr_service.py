"""Claude Code Router (CCR) service — reads config and checks status."""

import json
import re
import urllib.request
from pathlib import Path

from claude_panel.models.ccr import (
    CcrDashboardResponse,
    CcrProvider,
    CcrRouterConfig,
    CcrStatus,
)

CONFIG_PATH = Path.home() / ".claude-code-router" / "config.json"
HEALTH_URL = "http://127.0.0.1:3456/health"

_SENSITIVE_KEY_RE = re.compile(r"(api[_-]?key|token|secret|password)", re.IGNORECASE)


def _mask_value(value: str) -> str:
    """Mask a string that looks like a secret."""
    if len(value) <= 8:
        return "***"
    return f"{value[:3]}***{value[-3:]}"


def _should_mask(key: str, value: str) -> bool:
    """Decide whether a config value should be masked."""
    if _SENSITIVE_KEY_RE.search(key):
        return True
    if isinstance(value, str) and len(value) > 20 and value.startswith(("sk-", "key-")):
        return True
    return False


def _mask_config(obj: object, parent_key: str = "") -> object:
    """Recursively mask sensitive values in a config dict."""
    if isinstance(obj, dict):
        return {
            k: _mask_config(v, parent_key=k)
            for k, v in obj.items()
        }
    if isinstance(obj, list):
        return [_mask_config(item, parent_key=parent_key) for item in obj]
    if isinstance(obj, str) and _should_mask(parent_key, obj):
        return _mask_value(obj)
    return obj


def _read_config() -> dict | None:
    """Read and parse the CCR config file, or None if missing."""
    if not CONFIG_PATH.exists():
        return None
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, PermissionError, OSError):
        return None


def _check_running() -> bool:
    """Probe the CCR health endpoint."""
    try:
        req = urllib.request.Request(HEALTH_URL, method="GET")
        with urllib.request.urlopen(req, timeout=1):
            return True
    except Exception:
        return False


def _parse_providers(raw: list[dict]) -> list[CcrProvider]:
    """Convert raw provider entries to CcrProvider models."""
    providers: list[CcrProvider] = []
    for entry in raw:
        transformer_names: list[str] = []
        for t in entry.get("transformers", []):
            if isinstance(t, dict):
                uses = t.get("use", [])
                if isinstance(uses, list):
                    transformer_names.extend(uses)
                elif isinstance(uses, str):
                    transformer_names.append(uses)

        providers.append(CcrProvider(
            name=entry.get("name", "unknown"),
            api_base_url=entry.get("api_base_url", ""),
            models=entry.get("models", []),
            has_api_key=bool(entry.get("api_key")),
            transformer_names=transformer_names,
        ))
    return providers


def _parse_router(raw: dict) -> CcrRouterConfig:
    """Convert the Router section to CcrRouterConfig."""
    return CcrRouterConfig(
        default_model=raw.get("default"),
        background=raw.get("background"),
        think=raw.get("think"),
        long_context=raw.get("longContext"),
        long_context_threshold=raw.get("longContextThreshold", 60000),
        web_search=raw.get("webSearch"),
    )


def get_status() -> CcrStatus:
    """Return lightweight CCR status."""
    config = _read_config()
    return CcrStatus(
        installed=config is not None,
        running=_check_running(),
        config_path=str(CONFIG_PATH),
    )


def get_dashboard() -> CcrDashboardResponse:
    """Build the full dashboard response."""
    raw = _read_config()
    status = CcrStatus(
        installed=raw is not None,
        running=_check_running(),
        config_path=str(CONFIG_PATH),
    )

    if raw is None:
        return CcrDashboardResponse(status=status)

    providers = _parse_providers(raw.get("Providers", []))
    router = _parse_router(raw.get("Router", {}))
    masked = _mask_config(raw)

    return CcrDashboardResponse(
        status=status,
        providers=providers,
        router=router,
        raw_config=masked,
    )
