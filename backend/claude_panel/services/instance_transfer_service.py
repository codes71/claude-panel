"""Cross-instance configuration transfer — preview and apply.

All operations accept explicit source_path and target_path parameters and
never mutate the active instance singleton.
"""

import json
import os
import subprocess
from pathlib import Path

from claude_panel.models.transfers import (
    TransferApplyResponse,
    TransferApplySummary,
    TransferCategorySummary,
    TransferItemPreview,
    TransferItemResult,
    TransferPreviewResponse,
    TransferPreviewSummary,
)
from claude_panel.services.backup import safe_write_json_at, safe_write_text_at
from claude_panel.services.instance_paths import (
    agents_dir_for,
    backup_dir_for,
    claude_json_path_for,
    commands_dir_for,
    get_global_mcp_servers_for,
    read_claude_json_for,
)


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def _validate_paths(source_path: str, target_path: str) -> tuple[Path, Path]:
    source = Path(source_path).resolve()
    target = Path(target_path).resolve()
    if source == target:
        raise ValueError("Source and target instances must be different")
    if not source.is_dir():
        raise FileNotFoundError(f"Source instance not found: {source}")
    if not target.is_dir():
        raise FileNotFoundError(f"Target instance not found: {target}")
    return source, target


# ---------------------------------------------------------------------------
# Command helpers
# ---------------------------------------------------------------------------

def _command_path_for(instance: Path, namespace: str, name: str) -> Path:
    base = commands_dir_for(instance)
    if namespace:
        return base / namespace / f"{name}.md"
    return base / f"{name}.md"


def _qualified_name(namespace: str, name: str) -> str:
    return f"{namespace}:{name}" if namespace else name


def _preview_commands(source: Path, target: Path, refs: list[dict]) -> list[TransferItemPreview]:
    items = []
    for ref in refs:
        ns, name = ref["namespace"], ref["name"]
        qname = _qualified_name(ns, name)
        src_file = _command_path_for(source, ns, name)
        tgt_file = _command_path_for(target, ns, name)

        if not src_file.exists():
            items.append(TransferItemPreview(
                name=qname, status="failed",
                warnings=[f"Source command not found: {qname}"],
            ))
            continue

        src_content = src_file.read_text(encoding="utf-8")

        if not tgt_file.exists():
            items.append(TransferItemPreview(
                name=qname, status="new",
                source_summary=f"{len(src_content)} chars",
            ))
        elif tgt_file.read_text(encoding="utf-8") == src_content:
            items.append(TransferItemPreview(name=qname, status="noop"))
        else:
            items.append(TransferItemPreview(
                name=qname, status="conflict",
                source_summary=f"{len(src_content)} chars",
                target_summary=f"{len(tgt_file.read_text(encoding='utf-8'))} chars",
            ))
    return items


def _apply_commands(
    source: Path, target: Path, refs: list[dict], conflict_mode: str
) -> list[TransferItemResult]:
    results = []
    bdir = backup_dir_for(target)
    for ref in refs:
        ns, name = ref["namespace"], ref["name"]
        qname = _qualified_name(ns, name)
        src_file = _command_path_for(source, ns, name)
        tgt_file = _command_path_for(target, ns, name)

        if not src_file.exists():
            results.append(TransferItemResult(
                name=qname, action="failed", error=f"Source not found: {qname}",
            ))
            continue

        src_content = src_file.read_text(encoding="utf-8")

        if not tgt_file.exists():
            safe_write_text_at(tgt_file, src_content, bdir)
            results.append(TransferItemResult(name=qname, action="copied"))
        elif tgt_file.read_text(encoding="utf-8") == src_content:
            results.append(TransferItemResult(name=qname, action="skipped"))
        elif conflict_mode == "overwrite":
            safe_write_text_at(tgt_file, src_content, bdir)
            results.append(TransferItemResult(name=qname, action="overwritten"))
        else:
            results.append(TransferItemResult(name=qname, action="skipped"))
    return results


# ---------------------------------------------------------------------------
# Agent helpers
# ---------------------------------------------------------------------------

def _agent_path_for(instance: Path, name: str) -> Path:
    return agents_dir_for(instance) / f"{name}.md"


def _preview_agents(source: Path, target: Path, refs: list[dict]) -> list[TransferItemPreview]:
    items = []
    for ref in refs:
        name = ref["name"]
        src_file = _agent_path_for(source, name)
        tgt_file = _agent_path_for(target, name)

        if not src_file.exists():
            items.append(TransferItemPreview(
                name=name, status="failed",
                warnings=[f"Source agent not found: {name}"],
            ))
            continue

        src_content = src_file.read_text(encoding="utf-8")

        if not tgt_file.exists():
            items.append(TransferItemPreview(
                name=name, status="new",
                source_summary=f"{len(src_content)} chars",
            ))
        elif tgt_file.read_text(encoding="utf-8") == src_content:
            items.append(TransferItemPreview(name=name, status="noop"))
        else:
            items.append(TransferItemPreview(
                name=name, status="conflict",
                source_summary=f"{len(src_content)} chars",
                target_summary=f"{len(tgt_file.read_text(encoding='utf-8'))} chars",
            ))
    return items


def _apply_agents(
    source: Path, target: Path, refs: list[dict], conflict_mode: str
) -> list[TransferItemResult]:
    results = []
    bdir = backup_dir_for(target)
    for ref in refs:
        name = ref["name"]
        src_file = _agent_path_for(source, name)
        tgt_file = _agent_path_for(target, name)

        if not src_file.exists():
            results.append(TransferItemResult(
                name=name, action="failed", error=f"Source not found: {name}",
            ))
            continue

        src_content = src_file.read_text(encoding="utf-8")

        if not tgt_file.exists():
            safe_write_text_at(tgt_file, src_content, bdir)
            results.append(TransferItemResult(name=name, action="copied"))
        elif tgt_file.read_text(encoding="utf-8") == src_content:
            results.append(TransferItemResult(name=name, action="skipped"))
        elif conflict_mode == "overwrite":
            safe_write_text_at(tgt_file, src_content, bdir)
            results.append(TransferItemResult(name=name, action="overwritten"))
        else:
            results.append(TransferItemResult(name=name, action="skipped"))
    return results


# ---------------------------------------------------------------------------
# MCP helpers
# ---------------------------------------------------------------------------

def _preview_mcp(source: Path, target: Path, refs: list[dict]) -> list[TransferItemPreview]:
    src_servers = get_global_mcp_servers_for(source)
    tgt_servers = get_global_mcp_servers_for(target)
    items = []

    for ref in refs:
        name = ref["name"]
        if name not in src_servers:
            items.append(TransferItemPreview(
                name=name, status="failed",
                warnings=[f"Source MCP server not found: {name}"],
            ))
            continue

        src_config = src_servers[name]

        if name not in tgt_servers:
            items.append(TransferItemPreview(
                name=name, status="new",
                source_summary=src_config.get("command", src_config.get("url", "")),
            ))
        elif src_config == tgt_servers[name]:
            items.append(TransferItemPreview(name=name, status="noop"))
        else:
            items.append(TransferItemPreview(
                name=name, status="conflict",
                source_summary=src_config.get("command", src_config.get("url", "")),
                target_summary=tgt_servers[name].get("command", tgt_servers[name].get("url", "")),
            ))
    return items


def _apply_mcp(
    source: Path, target: Path, refs: list[dict], conflict_mode: str
) -> list[TransferItemResult]:
    src_servers = get_global_mcp_servers_for(source)
    tgt_data = read_claude_json_for(target)
    tgt_servers = tgt_data.get("mcpServers", {})
    changed = False
    results = []

    for ref in refs:
        name = ref["name"]
        if name not in src_servers:
            results.append(TransferItemResult(
                name=name, action="failed", error=f"Source not found: {name}",
            ))
            continue

        src_config = src_servers[name]

        if name not in tgt_servers:
            tgt_servers[name] = src_config
            changed = True
            results.append(TransferItemResult(name=name, action="copied"))
        elif src_config == tgt_servers[name]:
            results.append(TransferItemResult(name=name, action="skipped"))
        elif conflict_mode == "overwrite":
            tgt_servers[name] = src_config
            changed = True
            results.append(TransferItemResult(name=name, action="overwritten"))
        else:
            results.append(TransferItemResult(name=name, action="skipped"))

    if changed:
        tgt_data["mcpServers"] = tgt_servers
        tgt_json_path = claude_json_path_for(target)
        safe_write_json_at(tgt_json_path, tgt_data, backup_dir_for(target))

    return results


# ---------------------------------------------------------------------------
# Plugin helpers
# ---------------------------------------------------------------------------

def _claude_env_for(instance_path: Path) -> dict[str, str]:
    """Build an env dict that directs the Claude CLI at a specific instance."""
    env = os.environ.copy()
    env["CLAUDE_CONFIG_DIR"] = str(instance_path)
    return env


def _get_installed_plugins_for(instance_path: Path) -> set[str]:
    """Read plugin ids from the instance's plugins directory."""
    plugins_dir = instance_path / "plugins"
    if not plugins_dir.is_dir():
        return set()
    ids = set()
    for child in plugins_dir.iterdir():
        if child.is_dir() and child.name != "cache":
            ids.add(child.name)
    return ids


def _preview_plugins(source: Path, target: Path, refs: list[dict]) -> list[TransferItemPreview]:
    src_plugins = _get_installed_plugins_for(source)
    tgt_plugins = _get_installed_plugins_for(target)
    items = []

    for ref in refs:
        pid = ref["plugin_id"]
        if pid not in src_plugins:
            items.append(TransferItemPreview(
                name=pid, status="failed",
                warnings=[f"Source plugin not found: {pid}"],
            ))
            continue

        if pid not in tgt_plugins:
            items.append(TransferItemPreview(name=pid, status="new"))
        else:
            # Plugin already installed in target — treat as noop
            items.append(TransferItemPreview(name=pid, status="noop"))
    return items


def _apply_plugins(
    source: Path, target: Path, refs: list[dict], conflict_mode: str
) -> list[TransferItemResult]:
    tgt_plugins = _get_installed_plugins_for(target)
    results = []

    for ref in refs:
        pid = ref["plugin_id"]

        if pid in tgt_plugins:
            results.append(TransferItemResult(name=pid, action="skipped"))
            continue

        try:
            proc = subprocess.run(
                ["claude", "plugin", "install", pid, "--scope", "user"],
                capture_output=True,
                text=True,
                timeout=120,
                env=_claude_env_for(target),
            )
            if proc.returncode == 0:
                results.append(TransferItemResult(name=pid, action="copied"))
            else:
                results.append(TransferItemResult(
                    name=pid, action="failed",
                    error=proc.stderr.strip() or proc.stdout.strip(),
                ))
        except Exception as e:
            results.append(TransferItemResult(
                name=pid, action="failed", error=str(e),
            ))

    return results


# ---------------------------------------------------------------------------
# Summary builder
# ---------------------------------------------------------------------------

def _build_category_summary(items: list[TransferItemPreview]) -> TransferCategorySummary:
    return TransferCategorySummary(
        selected=len(items),
        new=sum(1 for i in items if i.status == "new"),
        noop=sum(1 for i in items if i.status == "noop"),
        conflict=sum(1 for i in items if i.status == "conflict"),
    )


def _build_apply_summary(
    cmd_results: list[TransferItemResult],
    plugin_results: list[TransferItemResult],
    mcp_results: list[TransferItemResult],
    agent_results: list[TransferItemResult],
) -> TransferApplySummary:
    all_results = cmd_results + plugin_results + mcp_results + agent_results
    return TransferApplySummary(
        copied=sum(1 for r in all_results if r.action == "copied"),
        skipped=sum(1 for r in all_results if r.action == "skipped"),
        overwritten=sum(1 for r in all_results if r.action == "overwritten"),
        failed=sum(1 for r in all_results if r.action == "failed"),
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def preview_transfer(
    source_path: str,
    target_path: str,
    commands: list[dict] | None = None,
    plugins: list[dict] | None = None,
    mcp_servers: list[dict] | None = None,
    agents: list[dict] | None = None,
) -> TransferPreviewResponse:
    """Preview what a transfer would do without making changes."""
    source, target = _validate_paths(source_path, target_path)

    cmd_items = _preview_commands(source, target, commands or [])
    plugin_items = _preview_plugins(source, target, plugins or [])
    mcp_items = _preview_mcp(source, target, mcp_servers or [])
    agent_items = _preview_agents(source, target, agents or [])

    return TransferPreviewResponse(
        summary=TransferPreviewSummary(
            commands=_build_category_summary(cmd_items),
            plugins=_build_category_summary(plugin_items),
            mcp_servers=_build_category_summary(mcp_items),
            agents=_build_category_summary(agent_items),
        ),
        commands=cmd_items,
        plugins=plugin_items,
        mcp_servers=mcp_items,
        agents=agent_items,
    )


def apply_transfer(
    source_path: str,
    target_path: str,
    commands: list[dict] | None = None,
    plugins: list[dict] | None = None,
    mcp_servers: list[dict] | None = None,
    agents: list[dict] | None = None,
    conflict_mode: str = "skip",
) -> TransferApplyResponse:
    """Apply a transfer, copying items from source to target."""
    if conflict_mode not in ("skip", "overwrite"):
        raise ValueError(f"Invalid conflict_mode: {conflict_mode}")

    source, target = _validate_paths(source_path, target_path)

    cmd_results = _apply_commands(source, target, commands or [], conflict_mode)
    plugin_results = _apply_plugins(source, target, plugins or [], conflict_mode)
    mcp_results = _apply_mcp(source, target, mcp_servers or [], conflict_mode)
    agent_results = _apply_agents(source, target, agents or [], conflict_mode)

    return TransferApplyResponse(
        summary=_build_apply_summary(cmd_results, plugin_results, mcp_results, agent_results),
        commands=cmd_results,
        plugins=plugin_results,
        mcp_servers=mcp_results,
        agents=agent_results,
    )
