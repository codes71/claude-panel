import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from claude_panel.config import settings


def ensure_backup_dir() -> Path:
    settings.backup_dir.mkdir(parents=True, exist_ok=True)
    return settings.backup_dir


def backup_file(file_path: Path) -> Path | None:
    """Create a timestamped backup of a file before modifying it. Returns backup path."""
    if not file_path.exists():
        return None

    backup_dir = ensure_backup_dir()
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    safe_name = file_path.name.replace("/", "_")
    backup_path = backup_dir / f"{safe_name}.{timestamp}.bak"

    shutil.copy2(file_path, backup_path)
    return backup_path


def safe_write_json(file_path: Path, data: dict) -> Path | None:
    """Backup file, validate JSON serialization, then write atomically."""
    backup_path = backup_file(file_path)

    # Validate serialization first
    content = json.dumps(data, indent=2, ensure_ascii=False) + "\n"

    # Write to temp file then rename for atomicity
    tmp_path = file_path.with_suffix(".tmp")
    try:
        tmp_path.write_text(content, encoding="utf-8")
        tmp_path.rename(file_path)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise

    return backup_path


def safe_write_text(file_path: Path, content: str) -> Path | None:
    """Backup file then write text content atomically."""
    backup_path = backup_file(file_path)

    tmp_path = file_path.with_suffix(".tmp")
    try:
        tmp_path.write_text(content, encoding="utf-8")
        tmp_path.rename(file_path)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise

    return backup_path


def backup_file_at(file_path: Path, backup_dir: Path) -> Path | None:
    """Create a timestamped backup using an explicit backup directory.

    Unlike ``backup_file``, this does not rely on the global settings singleton,
    making it safe for cross-instance transfer operations.
    """
    if not file_path.exists():
        return None

    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    safe_name = file_path.name.replace("/", "_")
    backup_path = backup_dir / f"{safe_name}.{timestamp}.bak"

    shutil.copy2(file_path, backup_path)
    return backup_path


def safe_write_text_at(file_path: Path, content: str, backup_dir: Path) -> Path | None:
    """Backup to an explicit directory then write text atomically."""
    backup_path = backup_file_at(file_path, backup_dir)

    file_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = file_path.with_suffix(".tmp")
    try:
        tmp_path.write_text(content, encoding="utf-8")
        tmp_path.rename(file_path)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise

    return backup_path


def safe_write_json_at(file_path: Path, data: dict, backup_dir: Path) -> Path | None:
    """Backup to an explicit directory then write JSON atomically."""
    backup_path = backup_file_at(file_path, backup_dir)

    content = json.dumps(data, indent=2, ensure_ascii=False) + "\n"

    file_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = file_path.with_suffix(".tmp")
    try:
        tmp_path.write_text(content, encoding="utf-8")
        tmp_path.rename(file_path)
    except Exception:
        tmp_path.unlink(missing_ok=True)
        raise

    return backup_path


def list_backups() -> list[dict]:
    """List all Claude Panel backups."""
    backup_dir = ensure_backup_dir()
    backups = []
    for f in sorted(backup_dir.glob("*.bak"), reverse=True):
        backups.append({
            "path": str(f),
            "timestamp": f.stat().st_mtime,
            "original_file": f.name.rsplit(".", 2)[0],
        })
    return backups
