"""Config-as-code bundle export, validation, and apply helpers."""

from pathlib import Path

from ccm.services import claude_md_service, mcp_service, skill_provider_service
from ccm.services.claude_json_service import set_mcp_servers


def export_bundle() -> dict:
    """Export a reproducible snapshot of key ClaudeBoard-managed config."""
    mcp_servers = mcp_service.list_all_servers()

    md_files = claude_md_service.list_claude_md_files().get("files", [])
    md_entries: list[dict] = []
    for f in md_files:
        path = f.get("path")
        if not path:
            continue
        try:
            content = claude_md_service.read_claude_md(path).get("content", "")
        except FileNotFoundError:
            content = ""
        md_entries.append({
            "path": path,
            "scope": f.get("scope", "project"),
            "content": content,
        })

    provider_entries = []
    for p in skill_provider_service.list_skill_providers().get("providers", []):
        provider_entries.append({
            "slug": p.get("slug", ""),
            "repo_url": p.get("repo_url", ""),
            "branch": p.get("branch", "main"),
            "locked_commit": p.get("locked_commit", ""),
        })

    return {
        "bundle": {
            "version": 1,
            "mcp": {"servers": mcp_servers},
            "claude_md": {"files": md_entries},
            "providers": {"items": provider_entries},
        }
    }


def validate_bundle(bundle: dict) -> dict:
    """Validate bundle shape and return errors/warnings."""
    errors: list[str] = []
    warnings: list[str] = []

    if not isinstance(bundle, dict):
        errors.append("Bundle must be an object.")
        return {"valid": False, "errors": errors, "warnings": warnings}

    if bundle.get("version") != 1:
        errors.append("Bundle version must be 1.")

    for key in ("mcp", "claude_md", "providers"):
        if key not in bundle:
            warnings.append(f"Missing section: {key}")

    return {"valid": len(errors) == 0, "errors": errors, "warnings": warnings}


def apply_bundle(bundle: dict, dry_run: bool = True) -> dict:
    """Apply a config bundle. In dry-run mode, only return planned changes."""
    validation = validate_bundle(bundle)
    changes: list[str] = []

    if not validation["valid"]:
        return {
            "applied": False,
            "changes": changes,
            "errors": validation["errors"],
            "warnings": validation["warnings"],
        }

    mcp_servers = bundle.get("mcp", {}).get("servers", [])
    if mcp_servers:
        changes.append(f"Sync {len(mcp_servers)} MCP server entries")
        if not dry_run:
            active: dict[str, dict] = {}
            for server in mcp_servers:
                if not server.get("enabled", True):
                    continue
                name = server.get("name", "")
                if not name:
                    continue
                if server.get("server_type") == "sse":
                    active[name] = {"url": server.get("command", "")}
                else:
                    cfg = {
                        "command": server.get("command", ""),
                        "args": server.get("args", []),
                    }
                    if server.get("env"):
                        cfg["env"] = server.get("env", {})
                    active[name] = cfg
            set_mcp_servers(active)

    md_files = bundle.get("claude_md", {}).get("files", [])
    if md_files:
        changes.append(f"Sync {len(md_files)} CLAUDE.md file(s)")
        if not dry_run:
            for file_entry in md_files:
                path = file_entry.get("path", "")
                content = file_entry.get("content", "")
                if not path:
                    continue
                md_path = Path(path)
                if md_path.exists():
                    claude_md_service.write_claude_md(path, content)
                else:
                    claude_md_service.create_claude_md(path, content)

    provider_items = bundle.get("providers", {}).get("items", [])
    if provider_items:
        changes.append(f"Bundle includes {len(provider_items)} provider lock entries")

    return {
        "applied": not dry_run,
        "changes": changes,
        "errors": validation["errors"],
        "warnings": validation["warnings"],
    }
