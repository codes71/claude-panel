"""Scans ~/.claude/ directory tree and discovers all configuration components."""

import json
import logging
from pathlib import Path

from ccm.config import settings
from ccm.models.scanner import (
    AgentFileInfo,
    ClaudeMdInfo,
    CommandFileInfo,
    ConfigTree,
    HookInfo,
    McpServerInfo,
    MemoryFileInfo,
    PluginInfo,
)


def _read_json(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, PermissionError):
        return None


def _discover_plugins(claude_home: Path, settings_data: dict | None) -> list[PluginInfo]:
    """Discover installed plugins from the plugins directory and settings."""
    plugins = []
    enabled_plugins = {}
    if settings_data:
        enabled_plugins = settings_data.get("enabledPlugins", {})

    installed_file = claude_home / "plugins" / "installed_plugins.json"
    installed_data = _read_json(installed_file)
    if not installed_data:
        return plugins

    for plugin_entry in installed_data if isinstance(installed_data, list) else []:
        plugin_id = plugin_entry.get("id", "")
        name = plugin_entry.get("name", plugin_id)
        marketplace = plugin_entry.get("marketplace", "unknown")

        info = PluginInfo(
            plugin_id=plugin_id,
            name=name,
            marketplace=marketplace,
            enabled=enabled_plugins.get(plugin_id, False),
        )

        # Try to find plugin cache for size/component info
        cache_dir = claude_home / "plugins" / "cache"
        if cache_dir.exists():
            try:
                cache_entries = list(cache_dir.iterdir())
            except OSError as e:
                logger.debug("Cannot read plugin cache dir %s: %s", cache_dir, e)
                cache_entries = []
            for d in cache_entries:
                if d.is_dir() and plugin_id.split("@")[0] in d.name:
                    try:
                        info.size_bytes = sum(f.stat().st_size for f in d.rglob("*") if f.is_file())
                    except OSError as e:
                        logger.debug("Error calculating plugin size %s: %s", d, e)
                    try:
                        md_files = list(d.rglob("*.md"))
                    except OSError as e:
                        logger.debug("Error scanning plugin md files %s: %s", d, e)
                        md_files = []
                    for f in md_files:
                        if "skill" in f.name.lower():
                            info.skills.append(f.stem)
                        elif "agent" in f.name.lower():
                            info.agents.append(f.stem)
                    break

        plugins.append(info)

    # Also check enabledPlugins for plugins not in installed list
    for pid, enabled in enabled_plugins.items():
        if not any(p.plugin_id == pid for p in plugins):
            name_part = pid.split("@")[0]
            marketplace = pid.split("@")[1] if "@" in pid else "unknown"
            plugins.append(PluginInfo(
                plugin_id=pid,
                name=name_part,
                marketplace=marketplace,
                enabled=enabled,
            ))

    return plugins


def _discover_mcp_servers(claude_json: dict | None) -> list[McpServerInfo]:
    """Discover MCP servers from ~/.claude.json."""
    servers = []
    if not claude_json:
        return servers

    mcp_servers = claude_json.get("mcpServers", {})
    for name, config in mcp_servers.items():
        server_type = "sse" if "url" in config else "stdio"
        servers.append(McpServerInfo(
            name=name,
            server_type=server_type,
            command=config.get("command", config.get("url", "")),
            args=config.get("args", []),
            env=config.get("env", {}),
            enabled=True,
            scope="global",
        ))

    return servers


def _discover_claude_md_files(claude_home: Path) -> list[ClaudeMdInfo]:
    """Find all CLAUDE.md files — global and per-project."""
    files = []

    # Global CLAUDE.md
    global_md = claude_home / "CLAUDE.md"
    if global_md.exists():
        try:
            stat = global_md.stat()
        except OSError as e:
            logger.debug("Cannot stat %s: %s", global_md, e)
        else:
            files.append(ClaudeMdInfo(
                path=str(global_md),
                scope="global",
                size_bytes=stat.st_size,
                last_modified=stat.st_mtime,
            ))

    # Per-project CLAUDE.md files (in projects/ subdirectories)
    projects_dir = claude_home / "projects"
    if projects_dir.exists():
        try:
            project_entries = list(projects_dir.iterdir())
        except OSError as e:
            logger.debug("Cannot read projects dir %s: %s", projects_dir, e)
            project_entries = []
        for project_dir in project_entries:
            if project_dir.is_dir():
                for md_file in project_dir.glob("CLAUDE.md"):
                    try:
                        stat = md_file.stat()
                    except OSError as e:
                        logger.debug("Cannot stat %s: %s", md_file, e)
                        continue
                    files.append(ClaudeMdInfo(
                        path=str(md_file),
                        scope="project",
                        size_bytes=stat.st_size,
                        last_modified=stat.st_mtime,
                    ))

    # Also check CWD and common locations
    cwd_claude = Path.cwd() / "CLAUDE.md"
    if cwd_claude.exists() and str(cwd_claude) not in [f.path for f in files]:
        try:
            stat = cwd_claude.stat()
        except OSError as e:
            logger.debug("Cannot stat %s: %s", cwd_claude, e)
        else:
            files.append(ClaudeMdInfo(
                path=str(cwd_claude),
                scope="project",
                size_bytes=stat.st_size,
                last_modified=stat.st_mtime,
            ))

    return files


def _discover_commands(claude_home: Path) -> list[CommandFileInfo]:
    """Find custom commands in ~/.claude/commands/."""
    commands = []
    commands_dir = claude_home / "commands"
    if commands_dir.exists():
        try:
            md_files = list(commands_dir.rglob("*.md"))
        except OSError as e:
            logger.debug("Cannot scan commands dir %s: %s", commands_dir, e)
            md_files = []
        for f in md_files:
            try:
                size = f.stat().st_size
            except OSError as e:
                logger.debug("Cannot stat %s: %s", f, e)
                continue
            commands.append(CommandFileInfo(
                name=f.stem,
                file_path=str(f),
                size_bytes=size,
            ))
    return commands


def _discover_hooks(settings_data: dict | None) -> list[HookInfo]:
    """Extract hooks from settings.json."""
    hooks = []
    if not settings_data:
        return hooks

    hook_configs = settings_data.get("hooks", {})
    for event, hook_list in hook_configs.items():
        if isinstance(hook_list, list):
            for hook in hook_list:
                if isinstance(hook, dict):
                    hooks.append(HookInfo(
                        event=event,
                        command=hook.get("command", ""),
                        file_path=hook.get("file", ""),
                    ))
    return hooks


def _discover_agents(claude_home: Path) -> list[AgentFileInfo]:
    """Find custom agent definitions."""
    agents = []
    for search_dir in [claude_home / "agents", Path.cwd() / ".claude" / "agents"]:
        if search_dir.exists():
            try:
                md_files = list(search_dir.rglob("*.md"))
            except OSError as e:
                logger.debug("Cannot scan agents dir %s: %s", search_dir, e)
                md_files = []
            for f in md_files:
                try:
                    size = f.stat().st_size
                except OSError as e:
                    logger.debug("Cannot stat %s: %s", f, e)
                    continue
                agents.append(AgentFileInfo(
                    name=f.stem,
                    file_path=str(f),
                    size_bytes=size,
                ))
    return agents


def _discover_memory_files(claude_home: Path) -> list[MemoryFileInfo]:
    """Find memory files in project directories."""
    memory_files = []
    projects_dir = claude_home / "projects"
    if projects_dir.exists():
        try:
            project_entries = list(projects_dir.iterdir())
        except OSError as e:
            logger.debug("Cannot read projects dir %s: %s", projects_dir, e)
            project_entries = []
        for project_dir in project_entries:
            if project_dir.is_dir():
                memory_dir = project_dir / "memory"
                if memory_dir.exists():
                    try:
                        mem_files = list(memory_dir.rglob("*"))
                    except OSError as e:
                        logger.debug("Cannot scan memory dir %s: %s", memory_dir, e)
                        mem_files = []
                    for f in mem_files:
                        if f.is_file():
                            try:
                                stat = f.stat()
                            except OSError as e:
                                logger.debug("Cannot stat %s: %s", f, e)
                                continue
                            memory_files.append(MemoryFileInfo(
                                name=f.name,
                                file_path=str(f),
                                size_bytes=stat.st_size,
                                last_modified=stat.st_mtime,
                            ))
    return memory_files


def scan_config_tree() -> ConfigTree:
    """Perform a full scan of the Claude Code configuration directory."""
    claude_home = settings.claude_home
    settings_data = _read_json(claude_home / "settings.json")
    claude_json = _read_json(settings.claude_json_path)

    return ConfigTree(
        plugins=_discover_plugins(claude_home, settings_data),
        mcp_servers=_discover_mcp_servers(claude_json),
        claude_md_files=_discover_claude_md_files(claude_home),
        commands=_discover_commands(claude_home),
        hooks=_discover_hooks(settings_data),
        agents=_discover_agents(claude_home),
        memory_files=_discover_memory_files(claude_home),
        settings_json=settings_data,
        claude_json=claude_json,
    )
