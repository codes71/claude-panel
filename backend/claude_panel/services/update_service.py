"""Update checking and auto-update service for claude-panel."""

import json
import logging
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

_NPM_REGISTRY_URL = "https://registry.npmjs.org/claude-panel/latest"
_CHECK_INTERVAL = 86400.0  # 24 hours


@dataclass
class _CheckResult:
    current_version: str
    latest_version: str
    update_available: bool
    install_method: str
    checked_at: float
    error: str | None = None


_last_check: _CheckResult | None = None


def _package_root() -> Path:
    """Resolve the package root (directory containing package.json)."""
    return Path(__file__).resolve().parent.parent.parent.parent


def _get_current_version() -> str:
    pkg = _package_root() / "package.json"
    try:
        data = json.loads(pkg.read_text(encoding="utf-8"))
        return data.get("version", "0.0.0")
    except (OSError, json.JSONDecodeError):
        return "0.0.0"


def _detect_install_method() -> str:
    """Detect how claude-panel was installed."""
    file_path = str(Path(__file__).resolve())
    pkg_root = _package_root()

    if (pkg_root / ".git").is_dir():
        return "local-dev"
    if "node_modules" in file_path or "node_modules" in str(pkg_root):
        return "npm-global"
    # npx creates temp dirs — check for common patterns
    for pattern in ("/tmp/", "/_npx/", "/npx-"):
        if pattern in str(pkg_root):
            return "npx"
    return "npm-global"  # default assumption for pip/npm installed packages


def _parse_semver(version: str) -> tuple[int, int, int]:
    """Parse a semver string into (major, minor, patch)."""
    # Strip pre-release suffix (e.g., "2.3.0-beta.1" -> "2.3.0")
    base = version.split("-")[0]
    parts = base.split(".")
    try:
        return (int(parts[0]), int(parts[1]) if len(parts) > 1 else 0, int(parts[2]) if len(parts) > 2 else 0)
    except (ValueError, IndexError):
        return (0, 0, 0)


def _is_newer(latest: str, current: str) -> bool:
    return _parse_semver(latest) > _parse_semver(current)


async def check_for_update(force: bool = False) -> dict:
    """Check npm registry for a newer version of claude-panel.

    Results are cached for 24 hours unless force=True.
    """
    global _last_check
    now = time.time()

    if not force and _last_check is not None and (now - _last_check.checked_at) < _CHECK_INTERVAL:
        return _result_to_dict(_last_check)

    current = _get_current_version()
    install_method = _detect_install_method()

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(_NPM_REGISTRY_URL)
            resp.raise_for_status()
            data = resp.json()
            latest = data.get("version", current)
    except Exception as exc:
        logger.warning("Failed to check npm registry: %s", exc)
        result = _CheckResult(
            current_version=current,
            latest_version=current,
            update_available=False,
            install_method=install_method,
            checked_at=now,
            error=f"Failed to check for updates: {exc}",
        )
        _last_check = result
        return _result_to_dict(result)

    result = _CheckResult(
        current_version=current,
        latest_version=latest,
        update_available=_is_newer(latest, current),
        install_method=install_method,
        checked_at=now,
    )
    _last_check = result
    return _result_to_dict(result)


def apply_update() -> dict:
    """Attempt to update claude-panel to the latest version."""
    install_method = _detect_install_method()

    if install_method == "local-dev":
        return {"success": False, "error": "Cannot auto-update a local development install. Pull from git instead."}

    if install_method == "npx":
        return {"success": False, "error": "npx always fetches the latest version. Restart to update."}

    cmd = ["npm", "install", "-g", "claude-panel@latest"]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if proc.returncode == 0:
            # Clear cached check so next check reflects the new version
            global _last_check
            _last_check = None
            return {
                "success": True,
                "message": "Update installed. Restart claude-panel to use the new version.",
                "output": proc.stdout.strip(),
            }
        error_msg = proc.stderr.strip() or proc.stdout.strip()
        if "EACCES" in error_msg or "permission" in error_msg.lower():
            return {"success": False, "error": "Permission denied. Try: sudo npm install -g claude-panel@latest"}
        return {"success": False, "error": error_msg}
    except FileNotFoundError:
        return {"success": False, "error": "npm not found in PATH."}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Update timed out after 120 seconds."}


def _result_to_dict(r: _CheckResult) -> dict:
    return {
        "current_version": r.current_version,
        "latest_version": r.latest_version,
        "update_available": r.update_available,
        "install_method": r.install_method,
        "checked_at": r.checked_at,
        "error": r.error,
    }
