"""Skill provider management — add, remove, update repos; discover and install skills/commands."""

import json
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from ccm.config import settings
from ccm.services.backup import backup_file, safe_write_json
from ccm.services.token_estimator import estimate_file_tokens


# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------

def _ccm_dir() -> Path:
    """Get skill-providers base directory, creating if needed."""
    d = settings.ccm_skill_providers_dir
    d.mkdir(parents=True, exist_ok=True)
    return d


def _repos_dir() -> Path:
    """Get repos subdirectory, creating if needed."""
    d = _ccm_dir() / "repos"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _registry_path() -> Path:
    """Get path to the registry JSON file."""
    return _ccm_dir() / "registry.json"


def _slug_from_source(source: str) -> str:
    """Normalize 'owner/repo' or GitHub URL to 'owner--repo-name' slug."""
    # Strip trailing .git
    source = source.rstrip("/")
    if source.endswith(".git"):
        source = source[:-4]

    # Handle file:// URLs (local repos) — use last path component as slug
    if source.startswith("file://"):
        path = source[7:]  # strip file://
        name = Path(path).name
        if name:
            return f"local--{name}"

    # Handle bare local paths
    if source.startswith("/"):
        name = Path(source).name
        if name:
            return f"local--{name}"

    # Extract owner/repo from full URL
    if "github.com" in source:
        # Handle https://github.com/owner/repo or git@github.com:owner/repo
        match = re.search(r"github\.com[/:]([^/]+)/([^/]+)", source)
        if match:
            owner, repo = match.group(1), match.group(2)
            return f"{owner}--{repo}"

    # Handle simple "owner/repo" form
    if "/" in source:
        parts = source.split("/")
        if len(parts) == 2:
            owner, repo = parts[0].strip(), parts[1].strip()
            return f"{owner}--{repo}"

    raise ValueError(
        f"Cannot derive slug from source: {source!r}. "
        "Expected 'owner/repo', a GitHub URL, or a local path."
    )


def _validate_slug(slug: str) -> None:
    """Validate that a slug matches the allowed pattern."""
    if not re.match(r"^[a-zA-Z0-9][a-zA-Z0-9._-]*$", slug):
        raise ValueError(
            f"Invalid slug: {slug!r}. "
            "Must start with alphanumeric and contain only alphanumeric, '.', '_', '-'."
        )


def _repo_url_from_source(source: str) -> str:
    """Convert 'owner/repo' to full GitHub clone URL, or return URL if already full."""
    source = source.strip()

    # Local paths — file:// URLs or bare absolute paths
    if source.startswith("file://"):
        return source
    if source.startswith("/"):
        return source

    if source.startswith("https://") or source.startswith("git@"):
        if not source.endswith(".git"):
            return source + ".git"
        return source

    # Assume "owner/repo" form
    if "/" in source and not source.startswith("http"):
        return f"https://github.com/{source}.git"

    raise ValueError(
        f"Cannot derive repo URL from source: {source!r}. "
        "Expected 'owner/repo', a full Git URL, or a local path."
    )


def _validate_item_id(item_id: str) -> tuple[str, str]:
    """Validate and split an item_id into (slug, path).

    Raises ValueError if the format is invalid.
    """
    if "::" not in item_id:
        raise ValueError(
            f"Invalid item_id: {item_id!r}. Expected format 'slug::path'."
        )
    parts = item_id.split("::", 1)
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise ValueError(
            f"Invalid item_id: {item_id!r}. Both slug and path must be non-empty."
        )
    return parts[0], parts[1]


# ---------------------------------------------------------------------------
# Registry I/O
# ---------------------------------------------------------------------------

def _read_registry() -> dict:
    """Load the registry file, returning a default structure if missing."""
    path = _registry_path()
    if not path.exists():
        return {"version": 1, "providers": {}, "installations": {}}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {"version": 1, "providers": {}, "installations": {}}
        # Ensure required keys
        data.setdefault("version", 1)
        data.setdefault("providers", {})
        data.setdefault("installations", {})
        return data
    except (json.JSONDecodeError, OSError):
        return {"version": 1, "providers": {}, "installations": {}}


def _write_registry(data: dict) -> None:
    """Persist the registry dict to disk using safe atomic write."""
    path = _registry_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    safe_write_json(path, data)


# ---------------------------------------------------------------------------
# Git operations
# ---------------------------------------------------------------------------

def _git_clone(repo_url: str, target_dir: Path, branch: str = "main") -> None:
    """Shallow-clone a git repo into *target_dir*."""
    subprocess.run(
        ["git", "clone", "--depth", "1", "--branch", branch, repo_url, str(target_dir)],
        capture_output=True,
        text=True,
        timeout=120,
        check=True,
    )


def _git_pull(repo_dir: Path) -> None:
    """Fast-forward pull the repo at *repo_dir*."""
    subprocess.run(
        ["git", "-C", str(repo_dir), "pull", "--ff-only"],
        capture_output=True,
        text=True,
        timeout=60,
        check=True,
    )


# ---------------------------------------------------------------------------
# Discovery helpers
# ---------------------------------------------------------------------------

def _parse_skill_md(skill_md_path: Path) -> dict:
    """Read a SKILL.md file and extract YAML-like frontmatter.

    Parses simple ``key: value`` pairs between ``---`` delimiters.
    Does not require PyYAML.
    """
    try:
        text = skill_md_path.read_text(encoding="utf-8").strip()
    except OSError:
        return {}

    if not text.startswith("---"):
        return {}

    end_idx = text.find("---", 3)
    if end_idx == -1:
        return {}

    frontmatter = text[3:end_idx].strip()
    result: dict[str, str] = {}
    for line in frontmatter.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        match = re.match(r"^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)", line)
        if match:
            key = match.group(1).strip()
            value = match.group(2).strip().strip("\"'")
            result[key] = value

    return result


def _discover_skills_in_repo(
    repo_dir: Path, slug: str, installations: dict
) -> list[dict]:
    """Walk *repo_dir* for SKILL.md files and return DiscoveredSkill-compatible dicts."""
    skills: list[dict] = []

    for skill_md in sorted(repo_dir.rglob("SKILL.md")):
        # Build the path relative to repo root
        rel_path = skill_md.relative_to(repo_dir)
        # The skill directory is the parent of SKILL.md
        skill_dir = skill_md.parent
        skill_name = skill_dir.name
        path_in_repo = str(rel_path.parent)
        item_id = f"{slug}::{path_in_repo}"

        meta = _parse_skill_md(skill_md)
        display_name = meta.get("name", skill_name)

        try:
            size = skill_md.stat().st_size
        except OSError:
            size = 0

        # Check installation status
        installed = False
        installed_scope = ""
        installed_path = ""
        if item_id in installations:
            installed = True
            installed_scope = installations[item_id].get("scope", "")
            installed_path = installations[item_id].get("installed_path", "")

        skills.append({
            "id": item_id,
            "provider_slug": slug,
            "name": display_name,
            "path_in_repo": path_in_repo,
            "description": meta.get("description", ""),
            "token_estimate": estimate_file_tokens(size),
            "installed": installed,
            "installed_scope": installed_scope,
            "installed_path": installed_path,
        })

    return skills


def _discover_commands_in_repo(
    repo_dir: Path, slug: str, installations: dict
) -> list[dict]:
    """Find .md files in commands/ directories and return DiscoveredCommand-compatible dicts."""
    commands: list[dict] = []
    commands_dir = repo_dir / "commands"

    if not commands_dir.is_dir():
        return commands

    for md_file in sorted(commands_dir.rglob("*.md")):
        # Skip README files
        if md_file.name.lower() == "readme.md":
            continue

        rel_path = md_file.relative_to(repo_dir)
        path_in_repo = str(rel_path)
        cmd_name = md_file.stem
        item_id = f"{slug}::{path_in_repo}"

        # Parse first line for description
        description = ""
        try:
            text = md_file.read_text(encoding="utf-8").strip()
            if text:
                first_line = text.splitlines()[0].strip()
                # Strip leading # heading markers
                if first_line.startswith("#"):
                    first_line = first_line.lstrip("#").strip()
                description = first_line
        except OSError:
            pass

        try:
            size = md_file.stat().st_size
        except OSError:
            size = 0

        # Check installation status
        installed = False
        installed_scope = ""
        installed_path = ""
        if item_id in installations:
            installed = True
            installed_scope = installations[item_id].get("scope", "")
            installed_path = installations[item_id].get("installed_path", "")

        commands.append({
            "id": item_id,
            "provider_slug": slug,
            "name": cmd_name,
            "path_in_repo": path_in_repo,
            "description": description,
            "token_estimate": estimate_file_tokens(size),
            "installed": installed,
            "installed_scope": installed_scope,
            "installed_path": installed_path,
        })

    return commands


# ---------------------------------------------------------------------------
# Provider CRUD
# ---------------------------------------------------------------------------

def list_skill_providers() -> dict:
    """List all registered providers with their discovered skills and commands.

    Returns a SkillProviderListResponse-compatible dict.
    """
    registry = _read_registry()
    providers_data = registry.get("providers", {})
    installations = registry.get("installations", {})

    providers: list[dict] = []
    all_skills: list[dict] = []
    all_commands: list[dict] = []

    for slug, info in sorted(providers_data.items()):
        repo_dir = _repos_dir() / slug

        skills = []
        commands = []
        if repo_dir.is_dir():
            skills = _discover_skills_in_repo(repo_dir, slug, installations)
            commands = _discover_commands_in_repo(repo_dir, slug, installations)

        providers.append({
            "slug": slug,
            "display_name": info.get("display_name", slug),
            "owner": info.get("owner", ""),
            "repo_url": info.get("repo_url", ""),
            "branch": info.get("branch", "main"),
            "added_at": info.get("added_at", ""),
            "last_updated": info.get("last_updated", ""),
            "skill_count": len(skills),
            "command_count": len(commands),
        })

        all_skills.extend(skills)
        all_commands.extend(commands)

    return {
        "providers": providers,
        "skills": all_skills,
        "commands": all_commands,
        "total_providers": len(providers),
        "total_skills": len(all_skills),
        "total_commands": len(all_commands),
    }


def add_skill_provider(source: str, branch: str = "main") -> dict:
    """Clone a provider repo and register it.

    Returns a SkillProviderActionResponse-compatible dict.
    Raises FileExistsError if already registered.
    Raises ValueError for invalid source format.
    Raises subprocess.CalledProcessError if git clone fails.
    """
    slug = _slug_from_source(source)
    _validate_slug(slug)
    repo_url = _repo_url_from_source(source)

    registry = _read_registry()
    if slug in registry["providers"]:
        raise FileExistsError(f"Provider already registered: {slug}")

    target_dir = _repos_dir() / slug
    if target_dir.exists():
        raise FileExistsError(f"Repo directory already exists: {target_dir}")

    # Clone
    _git_clone(repo_url, target_dir, branch)

    # Derive owner from slug
    owner = slug.split("--")[0] if "--" in slug else slug
    display_name = slug.split("--")[1] if "--" in slug else slug
    now = datetime.now(timezone.utc).isoformat()

    registry["providers"][slug] = {
        "display_name": display_name,
        "owner": owner,
        "repo_url": repo_url,
        "branch": branch,
        "added_at": now,
        "last_updated": now,
    }
    _write_registry(registry)

    return {
        "slug": slug,
        "action": "add",
        "success": True,
        "message": f"Provider {slug} added successfully.",
    }


def remove_skill_provider(slug: str) -> dict:
    """Remove a provider and its cloned repo.

    Returns a SkillProviderActionResponse-compatible dict.
    Raises FileNotFoundError if the provider is not registered.
    """
    _validate_slug(slug)

    registry = _read_registry()
    if slug not in registry["providers"]:
        raise FileNotFoundError(f"Provider not found: {slug}")

    # Remove repo directory
    repo_dir = _repos_dir() / slug
    if repo_dir.is_dir():
        shutil.rmtree(repo_dir)

    # Remove from providers (keep installations for reference)
    del registry["providers"][slug]
    _write_registry(registry)

    return {
        "slug": slug,
        "action": "remove",
        "success": True,
        "message": f"Provider {slug} removed successfully.",
    }


def update_skill_provider(slug: str | None = None) -> list[dict]:
    """Pull latest changes for one or all providers.

    If *slug* is given, update only that provider.
    If *slug* is None, update all registered providers.

    Returns a list of SkillProviderActionResponse-compatible dicts.
    Raises FileNotFoundError if a specific slug is not found.
    Raises ValueError if the slug is invalid.
    """
    registry = _read_registry()

    if slug is not None:
        _validate_slug(slug)
        if slug not in registry["providers"]:
            raise FileNotFoundError(f"Provider not found: {slug}")
        slugs_to_update = [slug]
    else:
        slugs_to_update = list(registry["providers"].keys())

    results: list[dict] = []
    now = datetime.now(timezone.utc).isoformat()

    for s in slugs_to_update:
        repo_dir = _repos_dir() / s
        if not repo_dir.is_dir():
            results.append({
                "slug": s,
                "action": "update",
                "success": False,
                "message": f"Repo directory missing for {s}.",
            })
            continue

        try:
            _git_pull(repo_dir)
            registry["providers"][s]["last_updated"] = now
            results.append({
                "slug": s,
                "action": "update",
                "success": True,
                "message": f"Provider {s} updated successfully.",
            })
        except subprocess.CalledProcessError as e:
            results.append({
                "slug": s,
                "action": "update",
                "success": False,
                "message": f"Git pull failed for {s}: {e.stderr or str(e)}",
            })

    _write_registry(registry)
    return results


# ---------------------------------------------------------------------------
# Install / Uninstall
# ---------------------------------------------------------------------------

def _resolve_and_guard(base: Path, subpath: str) -> Path:
    """Resolve a path and verify it stays within the base directory."""
    resolved = (base / subpath).resolve()
    base_resolved = base.resolve()
    if not str(resolved).startswith(str(base_resolved) + "/") and resolved != base_resolved:
        raise ValueError(f"Path escapes base directory: {subpath}")
    return resolved


def install_skill(item_id: str, scope: str = "personal") -> dict:
    """Install a skill or command from a provider repo.

    Returns a SkillInstallActionResponse-compatible dict.
    Raises FileNotFoundError if provider or source path not found.
    Raises ValueError for invalid item_id or scope.
    Raises FileExistsError if the target already exists.
    """
    slug, path_in_repo = _validate_item_id(item_id)
    _validate_slug(slug)

    if scope not in ("personal", "project"):
        raise ValueError(f"Invalid scope: {scope!r}. Must be 'personal' or 'project'.")

    registry = _read_registry()
    if slug not in registry["providers"]:
        raise FileNotFoundError(f"Provider not found: {slug}")

    repo_dir = _repos_dir() / slug
    if not repo_dir.is_dir():
        raise FileNotFoundError(f"Repo directory missing for provider: {slug}")

    source_path = _resolve_and_guard(repo_dir, path_in_repo)
    if not source_path.exists():
        raise FileNotFoundError(f"Source path not found in repo: {path_in_repo}")

    # Determine if this is a skill (directory with SKILL.md) or command (.md file)
    is_skill = source_path.is_dir() and (source_path / "SKILL.md").exists()
    is_command = source_path.is_file() and source_path.suffix == ".md"

    if not is_skill and not is_command:
        # Check if path_in_repo points to a skill directory
        if source_path.is_dir():
            is_skill = True
        else:
            raise ValueError(
                f"Cannot determine item type for path: {path_in_repo}. "
                "Expected a directory (skill) or .md file (command)."
            )

    if is_skill:
        skill_name = source_path.name
        if scope == "personal":
            target_path = Path.home() / ".claude" / "skills" / skill_name
        else:
            target_path = Path.cwd() / ".claude" / "skills" / skill_name

        if target_path.exists():
            raise FileExistsError(f"Skill already installed at: {target_path}")

        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(source_path, target_path)
    else:
        cmd_name = source_path.name
        if scope == "personal":
            target_path = Path.home() / ".claude" / "commands" / cmd_name
        else:
            target_path = Path.cwd() / ".claude" / "commands" / cmd_name

        if target_path.exists():
            raise FileExistsError(f"Command already installed at: {target_path}")

        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, target_path)

    # Update installations in registry
    registry["installations"][item_id] = {
        "scope": scope,
        "installed_path": str(target_path),
        "installed_at": datetime.now(timezone.utc).isoformat(),
    }
    _write_registry(registry)

    return {
        "item_id": item_id,
        "action": "install",
        "success": True,
        "message": f"Installed to {target_path}",
        "installed_path": str(target_path),
    }


def uninstall_skill(item_id: str) -> dict:
    """Uninstall a previously installed skill or command.

    Returns a SkillInstallActionResponse-compatible dict.
    Raises FileNotFoundError if the installation is not found.
    Raises ValueError for invalid item_id.
    """
    slug, path_in_repo = _validate_item_id(item_id)

    registry = _read_registry()
    if item_id not in registry["installations"]:
        raise FileNotFoundError(f"Installation not found: {item_id}")

    installation = registry["installations"][item_id]
    installed_path = Path(installation["installed_path"])

    # Backup and remove
    if installed_path.is_dir():
        # Backup the SKILL.md if it exists
        skill_md = installed_path / "SKILL.md"
        if skill_md.exists():
            backup_file(skill_md)
        shutil.rmtree(installed_path)
    elif installed_path.is_file():
        backup_file(installed_path)
        installed_path.unlink()

    # Remove from installations
    del registry["installations"][item_id]
    _write_registry(registry)

    return {
        "item_id": item_id,
        "action": "uninstall",
        "success": True,
        "message": f"Uninstalled from {installed_path}",
        "installed_path": str(installed_path),
    }
