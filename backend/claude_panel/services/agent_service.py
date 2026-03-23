"""Custom agent management — list, read, create, update, rename, delete, import."""

import shutil
from pathlib import Path

from claude_panel.config import settings
from claude_panel.services.backup import backup_file, safe_write_text
from claude_panel.services.frontmatter import parse_frontmatter, validate_name
from claude_panel.services.token_estimator import estimate_file_tokens


def _agents_dir() -> Path:
    """Get agents directory, creating if needed."""
    d = settings.claude_home / "agents"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _resolve_agent_path(name: str) -> Path:
    """Resolve and validate agent file path.

    Raises ``ValueError`` if the name contains invalid characters or
    the resolved path escapes the agents directory (path traversal).
    """
    validate_name(name)
    agents = _agents_dir()
    file_path = agents / f"{name}.md"

    resolved = file_path.resolve()
    agents_resolved = agents.resolve()

    try:
        resolved.relative_to(agents_resolved)
    except ValueError:
        raise ValueError("Invalid path: escapes agents directory")

    return resolved


def _build_agent_info(file_path: Path, agents_dir: Path) -> dict | None:
    """Build an AgentInfo-compatible dict from a .md file."""
    try:
        stat = file_path.stat()
        content = file_path.read_text(encoding="utf-8")
    except OSError:
        return None

    name = file_path.stem
    fm = parse_frontmatter(content)

    return {
        "name": name,
        "display_name": fm.get("name", ""),
        "file_path": str(file_path),
        "size_bytes": stat.st_size,
        "token_estimate": estimate_file_tokens(stat.st_size),
        "description": fm.get("description", ""),
        "color": fm.get("color", ""),
        "emoji": fm.get("emoji", ""),
        "vibe": fm.get("vibe", ""),
        "model": fm.get("model", ""),
    }


def list_agents() -> dict:
    """Scan ~/.claude/agents/ for .md files.

    Returns an AgentListResponse-compatible dict.
    """
    agents_dir = _agents_dir()
    agents: list[dict] = []

    for md_file in sorted(agents_dir.glob("*.md")):
        if md_file.name.lower() == "readme.md":
            continue
        info = _build_agent_info(md_file, agents_dir)
        if info is not None:
            agents.append(info)

    total_tokens = sum(a["token_estimate"] for a in agents)

    return {
        "agents": agents,
        "total_count": len(agents),
        "total_tokens": total_tokens,
    }


def read_agent(name: str) -> dict:
    """Read a single agent file and return full details including content."""
    file_path = _resolve_agent_path(name)

    if not file_path.exists():
        raise FileNotFoundError(f"Agent not found: {name}")

    content = file_path.read_text(encoding="utf-8")
    stat = file_path.stat()
    fm = parse_frontmatter(content)

    return {
        "name": name,
        "display_name": fm.get("name", ""),
        "file_path": str(file_path),
        "size_bytes": stat.st_size,
        "token_estimate": estimate_file_tokens(stat.st_size),
        "description": fm.get("description", ""),
        "color": fm.get("color", ""),
        "emoji": fm.get("emoji", ""),
        "vibe": fm.get("vibe", ""),
        "model": fm.get("model", ""),
        "content": content,
    }


def create_agent(name: str, content: str) -> dict:
    """Create a new agent .md file.

    Raises ``FileExistsError`` if the agent already exists.
    """
    file_path = _resolve_agent_path(name)

    if file_path.exists():
        raise FileExistsError(f"Agent already exists: {name}")

    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(content, encoding="utf-8")

    stat = file_path.stat()
    fm = parse_frontmatter(content)

    return {
        "name": name,
        "display_name": fm.get("name", ""),
        "file_path": str(file_path),
        "size_bytes": stat.st_size,
        "token_estimate": estimate_file_tokens(stat.st_size),
        "description": fm.get("description", ""),
        "color": fm.get("color", ""),
        "emoji": fm.get("emoji", ""),
        "vibe": fm.get("vibe", ""),
        "model": fm.get("model", ""),
        "content": content,
    }


def update_agent(name: str, content: str) -> dict:
    """Update an existing agent's content.

    Backs up the original file before writing.
    Raises ``FileNotFoundError`` if the agent does not exist.
    """
    file_path = _resolve_agent_path(name)

    if not file_path.exists():
        raise FileNotFoundError(f"Agent not found: {name}")

    backup_file(file_path)
    safe_write_text(file_path, content)

    stat = file_path.stat()
    fm = parse_frontmatter(content)

    return {
        "name": name,
        "display_name": fm.get("name", ""),
        "file_path": str(file_path),
        "size_bytes": stat.st_size,
        "token_estimate": estimate_file_tokens(stat.st_size),
        "description": fm.get("description", ""),
        "color": fm.get("color", ""),
        "emoji": fm.get("emoji", ""),
        "vibe": fm.get("vibe", ""),
        "model": fm.get("model", ""),
        "content": content,
    }


def rename_agent(name: str, new_name: str) -> dict:
    """Rename an agent file.

    Raises ``FileNotFoundError`` if the source does not exist,
    ``FileExistsError`` if the destination already exists.
    """
    old_path = _resolve_agent_path(name)
    new_path = _resolve_agent_path(new_name)

    if not old_path.exists():
        raise FileNotFoundError(f"Agent not found: {name}")

    if new_path.exists():
        raise FileExistsError(f"Agent already exists: {new_name}")

    content = old_path.read_text(encoding="utf-8")

    new_path.write_text(content, encoding="utf-8")

    backup_file(old_path)
    old_path.unlink()

    stat = new_path.stat()
    fm = parse_frontmatter(content)

    return {
        "name": new_name,
        "display_name": fm.get("name", ""),
        "file_path": str(new_path),
        "size_bytes": stat.st_size,
        "token_estimate": estimate_file_tokens(stat.st_size),
        "description": fm.get("description", ""),
        "color": fm.get("color", ""),
        "emoji": fm.get("emoji", ""),
        "vibe": fm.get("vibe", ""),
        "model": fm.get("model", ""),
        "content": content,
    }


def delete_agent(name: str) -> dict:
    """Delete an agent file after backing it up.

    Raises ``FileNotFoundError`` if the agent does not exist.
    """
    file_path = _resolve_agent_path(name)

    if not file_path.exists():
        raise FileNotFoundError(f"Agent not found: {name}")

    backup_file(file_path)
    file_path.unlink()

    return {
        "deleted": True,
        "name": name,
    }


def browse_directory(path: str = "") -> dict:
    """Browse a directory, listing subdirectories and .md file counts.

    Returns a BrowseResponse-compatible dict.
    Defaults to user's home directory if path is empty.
    """
    if not path:
        target = Path.home()
    else:
        target = Path(path).resolve()

    if not target.exists():
        raise FileNotFoundError(f"Path not found: {path}")
    if not target.is_dir():
        raise ValueError(f"Path is not a directory: {path}")

    parent = str(target.parent) if target.parent != target else None

    entries: list[dict] = []
    try:
        for item in sorted(target.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
            # Skip hidden files/directories
            if item.name.startswith("."):
                continue

            if item.is_dir():
                # Count .md files recursively for hint
                try:
                    md_count = sum(
                        1
                        for f in item.rglob("*.md")
                        if f.name.lower() != "readme.md"
                    )
                except PermissionError:
                    md_count = 0

                entries.append({
                    "name": item.name,
                    "path": str(item),
                    "is_dir": True,
                    "md_count": md_count,
                })
    except PermissionError:
        raise ValueError(f"Permission denied: {path}")

    return {
        "path": str(target),
        "parent": parent,
        "entries": entries,
    }


def scan_folder(folder_path: str) -> dict:
    """Scan a folder recursively for .md files with agent frontmatter.

    Returns an AgentScanResponse-compatible dict with discovered agents.
    Raises ``FileNotFoundError`` if the folder does not exist.
    Raises ``ValueError`` if the path is not a directory.
    """
    folder = Path(folder_path).resolve()

    if not folder.exists():
        raise FileNotFoundError(f"Folder not found: {folder_path}")
    if not folder.is_dir():
        raise ValueError(f"Path is not a directory: {folder_path}")

    agents: list[dict] = []

    for md_file in sorted(folder.rglob("*.md")):
        if md_file.name.lower() == "readme.md":
            continue

        try:
            content = md_file.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue

        fm = parse_frontmatter(content)
        # Only include files that have agent-like frontmatter
        if not fm.get("name") and not fm.get("description"):
            continue

        stat = md_file.stat()
        rel_path = md_file.relative_to(folder)

        agents.append({
            "name": md_file.stem,
            "display_name": fm.get("name", ""),
            "file_path": str(md_file),
            "size_bytes": stat.st_size,
            "token_estimate": estimate_file_tokens(stat.st_size),
            "description": fm.get("description", ""),
            "color": fm.get("color", ""),
            "emoji": fm.get("emoji", ""),
            "vibe": fm.get("vibe", ""),
            "model": fm.get("model", ""),
        })

    return {
        "folder_path": str(folder),
        "agents": agents,
        "total_count": len(agents),
    }


def import_agents(folder_path: str, names: list[str], overwrite: bool = False) -> dict:
    """Import selected agent .md files from a folder into the agents directory.

    Returns a summary of imported, skipped, and failed agents.
    Raises ``FileNotFoundError`` if the folder does not exist.
    """
    folder = Path(folder_path).resolve()

    if not folder.exists():
        raise FileNotFoundError(f"Folder not found: {folder_path}")
    if not folder.is_dir():
        raise ValueError(f"Path is not a directory: {folder_path}")

    agents_dir = _agents_dir()
    imported: list[str] = []
    skipped: list[str] = []
    failed: list[dict] = []

    # Build lookup: name -> file path (first match wins in rglob order)
    source_files: dict[str, Path] = {}
    for md_file in sorted(folder.rglob("*.md")):
        if md_file.name.lower() == "readme.md":
            continue
        stem = md_file.stem
        if stem not in source_files:
            source_files[stem] = md_file

    for name in names:
        source_file = source_files.get(name)
        if source_file is None:
            failed.append({"name": name, "reason": f"Not found in {folder_path}"})
            continue

        target_file = agents_dir / f"{name}.md"

        if target_file.exists() and not overwrite:
            skipped.append(name)
            continue

        try:
            if target_file.exists():
                backup_file(target_file)

            content = source_file.read_text(encoding="utf-8")
            target_file.write_text(content, encoding="utf-8")
            imported.append(name)
        except OSError as e:
            failed.append({"name": name, "reason": str(e)})

    return {
        "imported": imported,
        "skipped": skipped,
        "failed": failed,
        "imported_count": len(imported),
        "skipped_count": len(skipped),
        "failed_count": len(failed),
    }
