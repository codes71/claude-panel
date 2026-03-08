"""Custom slash command management — list, read, create, update, delete."""

import re
from pathlib import Path

import yaml

VALID_NAME_RE = re.compile(r"^[a-zA-Z0-9_-]+$")

from claude_panel.config import settings
from claude_panel.services.backup import backup_file, safe_write_text
from claude_panel.services.token_estimator import estimate_file_tokens


def _commands_dir() -> Path:
    """Get commands directory, creating if needed."""
    d = settings.claude_home / "commands"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _parse_frontmatter(text: str) -> dict:
    """Extract YAML frontmatter from markdown text.

    Looks for content between opening and closing ``---`` markers
    at the start of the file. Returns a dict with parsed keys
    (typically 'description', 'category', etc.) or an empty dict
    if no valid frontmatter is found.
    """
    text = text.strip()
    if not text.startswith("---"):
        return {}

    # Find the closing --- marker (skip the opening one)
    end_idx = text.find("---", 3)
    if end_idx == -1:
        return {}

    frontmatter_text = text[3:end_idx].strip()
    if not frontmatter_text:
        return {}

    try:
        parsed = yaml.safe_load(frontmatter_text)
        if isinstance(parsed, dict):
            return parsed
    except yaml.YAMLError:
        pass

    return {}


def _validate_name(name: str) -> None:
    """Validate a command or namespace name segment."""
    if not VALID_NAME_RE.match(name):
        raise ValueError(
            f"Invalid name '{name}': only letters, numbers, hyphens, and underscores are allowed"
        )


def _resolve_command_path(namespace: str, name: str) -> Path:
    """Resolve and validate command file path.

    Raises ``ValueError`` if the name contains invalid characters or
    the resolved path escapes the commands directory (path traversal).
    """
    _validate_name(name)
    if namespace:
        _validate_name(namespace)
    cmds = _commands_dir()

    if namespace:
        file_path = cmds / namespace / f"{name}.md"
    else:
        file_path = cmds / f"{name}.md"

    # Resolve to catch any '..' traversal
    resolved = file_path.resolve()
    cmds_resolved = cmds.resolve()

    try:
        resolved.relative_to(cmds_resolved)
    except ValueError:
        raise ValueError(f"Invalid path: escapes commands directory")

    return resolved


def _build_command_info(file_path: Path, commands_dir: Path) -> dict:
    """Build a CommandInfo-compatible dict from a .md file."""
    try:
        stat = file_path.stat()
        content = file_path.read_text(encoding="utf-8")
    except OSError:
        return None

    # Derive namespace and name from path
    rel = file_path.relative_to(commands_dir)
    parts = rel.parts

    if len(parts) == 1:
        # Root-level command: commands/foo.md
        namespace = ""
        name = parts[0].removesuffix(".md")
    elif len(parts) == 2:
        # Namespaced command: commands/sc/load.md
        namespace = parts[0]
        name = parts[1].removesuffix(".md")
    else:
        # Deeper nesting not expected, but handle gracefully
        namespace = "/".join(parts[:-1])
        name = parts[-1].removesuffix(".md")

    qualified_name = f"{namespace}:{name}" if namespace else name

    # Parse frontmatter for description and category
    fm = _parse_frontmatter(content)

    return {
        "name": name,
        "namespace": namespace,
        "qualified_name": qualified_name,
        "file_path": str(file_path),
        "size_bytes": stat.st_size,
        "token_estimate": estimate_file_tokens(stat.st_size),
        "description": fm.get("description", ""),
        "category": fm.get("category", ""),
    }


def list_commands() -> dict:
    """Scan ~/.claude/commands/ recursively for .md files.

    Returns a CommandListResponse-compatible dict with namespace
    groupings, individual command info, and totals.
    """
    cmds_dir = _commands_dir()
    commands: list[dict] = []

    for md_file in sorted(cmds_dir.rglob("*.md")):
        # Skip README files
        if md_file.name.lower() == "readme.md":
            continue

        info = _build_command_info(md_file, cmds_dir)
        if info is not None:
            commands.append(info)

    # Build namespace aggregations
    ns_map: dict[str, dict] = {}
    for cmd in commands:
        ns = cmd["namespace"]
        if ns not in ns_map:
            ns_map[ns] = {"name": ns, "command_count": 0, "total_tokens": 0}
        ns_map[ns]["command_count"] += 1
        ns_map[ns]["total_tokens"] += cmd["token_estimate"]

    # Sort namespaces: root ("") last so named namespaces appear first
    namespaces = [v for _, v in sorted(ns_map.items(), key=lambda x: (x[0] == "", x[0]))]

    total_tokens = sum(cmd["token_estimate"] for cmd in commands)

    return {
        "namespaces": namespaces,
        "commands": commands,
        "total_count": len(commands),
        "total_tokens": total_tokens,
    }


def read_command(namespace: str, name: str) -> dict:
    """Read a single command file and return full details.

    Returns a CommandDetail-compatible dict including the file content.
    """
    file_path = _resolve_command_path(namespace, name)

    if not file_path.exists():
        raise FileNotFoundError(
            f"Command not found: {namespace + ':' + name if namespace else name}"
        )

    content = file_path.read_text(encoding="utf-8")
    stat = file_path.stat()
    fm = _parse_frontmatter(content)

    qualified_name = f"{namespace}:{name}" if namespace else name

    return {
        "name": name,
        "namespace": namespace,
        "qualified_name": qualified_name,
        "file_path": str(file_path),
        "size_bytes": stat.st_size,
        "token_estimate": estimate_file_tokens(stat.st_size),
        "description": fm.get("description", ""),
        "category": fm.get("category", ""),
        "content": content,
    }


def create_command(namespace: str, name: str, content: str) -> dict:
    """Create a new command .md file.

    Creates the namespace subdirectory if it does not exist.
    Raises ``FileExistsError`` if the command already exists.
    """
    file_path = _resolve_command_path(namespace, name)

    if file_path.exists():
        raise FileExistsError(
            f"Command already exists: {namespace + ':' + name if namespace else name}"
        )

    # Create namespace directory if needed
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(content, encoding="utf-8")

    stat = file_path.stat()
    fm = _parse_frontmatter(content)
    qualified_name = f"{namespace}:{name}" if namespace else name

    return {
        "name": name,
        "namespace": namespace,
        "qualified_name": qualified_name,
        "file_path": str(file_path),
        "size_bytes": stat.st_size,
        "token_estimate": estimate_file_tokens(stat.st_size),
        "description": fm.get("description", ""),
        "category": fm.get("category", ""),
        "content": content,
    }


def update_command(namespace: str, name: str, content: str) -> dict:
    """Update an existing command's content.

    Backs up the original file before writing. Raises
    ``FileNotFoundError`` if the command does not exist.
    """
    file_path = _resolve_command_path(namespace, name)

    if not file_path.exists():
        raise FileNotFoundError(
            f"Command not found: {namespace + ':' + name if namespace else name}"
        )

    backup_file(file_path)
    safe_write_text(file_path, content)

    stat = file_path.stat()
    fm = _parse_frontmatter(content)
    qualified_name = f"{namespace}:{name}" if namespace else name

    return {
        "name": name,
        "namespace": namespace,
        "qualified_name": qualified_name,
        "file_path": str(file_path),
        "size_bytes": stat.st_size,
        "token_estimate": estimate_file_tokens(stat.st_size),
        "description": fm.get("description", ""),
        "category": fm.get("category", ""),
        "content": content,
    }


def rename_command(namespace: str, name: str, new_namespace: str, new_name: str) -> dict:
    """Rename/move a command to a new namespace and/or name.

    Creates the file at the new location and removes the old one.
    Raises ``FileNotFoundError`` if the source does not exist,
    ``FileExistsError`` if the destination already exists.
    """
    old_path = _resolve_command_path(namespace, name)
    new_path = _resolve_command_path(new_namespace, new_name)

    if not old_path.exists():
        raise FileNotFoundError(
            f"Command not found: {namespace + ':' + name if namespace else name}"
        )

    if new_path.exists():
        raise FileExistsError(
            f"Command already exists: {new_namespace + ':' + new_name if new_namespace else new_name}"
        )

    content = old_path.read_text(encoding="utf-8")

    # Create target directory if needed
    new_path.parent.mkdir(parents=True, exist_ok=True)
    new_path.write_text(content, encoding="utf-8")

    # Remove old file (with backup)
    backup_file(old_path)
    old_path.unlink()

    # Clean up empty old namespace directory
    cmds_dir = _commands_dir().resolve()
    parent = old_path.parent.resolve()
    if parent != cmds_dir and parent.is_dir() and not any(parent.iterdir()):
        parent.rmdir()

    stat = new_path.stat()
    fm = _parse_frontmatter(content)
    qualified_name = f"{new_namespace}:{new_name}" if new_namespace else new_name

    return {
        "name": new_name,
        "namespace": new_namespace,
        "qualified_name": qualified_name,
        "file_path": str(new_path),
        "size_bytes": stat.st_size,
        "token_estimate": estimate_file_tokens(stat.st_size),
        "description": fm.get("description", ""),
        "category": fm.get("category", ""),
        "content": content,
    }


def delete_command(namespace: str, name: str) -> dict:
    """Delete a command file after backing it up.

    Removes the namespace directory if it becomes empty.
    Raises ``FileNotFoundError`` if the command does not exist.
    """
    file_path = _resolve_command_path(namespace, name)

    if not file_path.exists():
        raise FileNotFoundError(
            f"Command not found: {namespace + ':' + name if namespace else name}"
        )

    qualified_name = f"{namespace}:{name}" if namespace else name

    # Backup before deletion
    backup_file(file_path)
    file_path.unlink()

    # Remove empty namespace directory (but not the root commands dir)
    cmds_dir = _commands_dir().resolve()
    parent = file_path.parent.resolve()
    if parent != cmds_dir and parent.is_dir() and not any(parent.iterdir()):
        parent.rmdir()

    return {
        "deleted": True,
        "qualified_name": qualified_name,
    }
