"""Read-only visibility into commands, hooks, agents, memory files."""

import json
from pathlib import Path

from claude_panel.config import settings


def list_commands() -> list[dict]:
    """List custom commands from ~/.claude/commands/."""
    commands_dir = settings.claude_home / "commands"
    commands = []
    if not commands_dir.exists():
        return commands

    for f in commands_dir.rglob("*.md"):
        # Try to extract description from first line
        description = ""
        try:
            first_line = f.read_text(encoding="utf-8").split("\n")[0].strip()
            if first_line.startswith("#"):
                description = first_line.lstrip("# ").strip()
        except (PermissionError, UnicodeDecodeError):
            pass

        commands.append({
            "name": f.stem,
            "file_path": str(f),
            "size_bytes": f.stat().st_size,
            "description": description,
        })

    return commands


def list_hooks() -> list[dict]:
    """List hooks from settings.json."""
    settings_path = settings.claude_home / "settings.json"
    if not settings_path.exists():
        return []

    try:
        data = json.loads(settings_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, PermissionError):
        return []

    hooks = []
    hook_configs = data.get("hooks", {})
    for event, hook_list in hook_configs.items():
        if isinstance(hook_list, list):
            for hook in hook_list:
                if isinstance(hook, dict):
                    hooks.append({
                        "event": event,
                        "command": hook.get("command", ""),
                        "file_path": hook.get("file", ""),
                    })
        elif isinstance(hook_list, dict):
            hooks.append({
                "event": event,
                "command": hook_list.get("command", ""),
                "file_path": hook_list.get("file", ""),
            })

    return hooks


def list_agents() -> list[dict]:
    """List custom agent definitions."""
    agents = []
    search_dirs = [
        settings.claude_home / "agents",
        Path.cwd() / ".claude" / "agents",
    ]

    seen_paths = set()
    for search_dir in search_dirs:
        if not search_dir.exists():
            continue
        for f in search_dir.rglob("*.md"):
            abs_path = str(f.resolve())
            if abs_path in seen_paths:
                continue
            seen_paths.add(abs_path)

            description = ""
            try:
                first_line = f.read_text(encoding="utf-8").split("\n")[0].strip()
                if first_line.startswith("#"):
                    description = first_line.lstrip("# ").strip()
            except (PermissionError, UnicodeDecodeError):
                pass

            agents.append({
                "name": f.stem,
                "file_path": abs_path,
                "description": description,
                "size_bytes": f.stat().st_size,
            })

    return agents


def list_memory_files() -> list[dict]:
    """List memory files from project directories."""
    memory_files = []
    projects_dir = settings.claude_home / "projects"
    if not projects_dir.exists():
        return memory_files

    for project_dir in projects_dir.iterdir():
        if not project_dir.is_dir():
            continue
        memory_dir = project_dir / "memory"
        if not memory_dir.exists():
            continue
        for f in memory_dir.rglob("*"):
            if f.is_file():
                stat = f.stat()
                memory_files.append({
                    "name": f.name,
                    "file_path": str(f),
                    "size_bytes": stat.st_size,
                    "last_modified": stat.st_mtime,
                })

    return memory_files


def get_visibility() -> dict:
    """Get full visibility data."""
    return {
        "commands": list_commands(),
        "hooks": list_hooks(),
        "agents": list_agents(),
        "memory_files": list_memory_files(),
    }
