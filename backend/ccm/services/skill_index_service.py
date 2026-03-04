"""Skill index caching service — JSON-based indexes with git SHA invalidation."""

import json
import math
import re
import subprocess
from pathlib import Path

from ccm.config import settings
from ccm.services.backup import safe_write_json
from ccm.services.token_estimator import estimate_file_tokens


# ---------------------------------------------------------------------------
# Path helpers
# ---------------------------------------------------------------------------

def _index_dir() -> Path:
    """Get the index cache directory, creating if needed."""
    d = settings.ccm_skill_providers_dir / "index"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _index_path(slug: str) -> Path:
    """Get the cache file path for a provider slug."""
    return _index_dir() / f"{slug}.json"


def _repos_dir() -> Path:
    """Get repos subdirectory."""
    return settings.ccm_skill_providers_dir / "repos"


def _registry_path() -> Path:
    """Get path to the registry JSON file."""
    return settings.ccm_skill_providers_dir / "registry.json"


# ---------------------------------------------------------------------------
# Git helpers
# ---------------------------------------------------------------------------

def _get_git_sha(repo_dir: Path) -> str:
    """Get current HEAD SHA for a repo, or empty string on failure."""
    try:
        result = subprocess.run(
            ["git", "-C", str(repo_dir), "rev-parse", "HEAD"],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, OSError):
        pass
    return ""


# ---------------------------------------------------------------------------
# Index cache I/O
# ---------------------------------------------------------------------------

def _read_index_cache(slug: str) -> dict | None:
    """Read cached index for a provider. Returns None if missing/corrupt."""
    path = _index_path(slug)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, dict) and "items" in data:
            return data
    except (json.JSONDecodeError, OSError):
        pass
    return None


def _write_index_cache(slug: str, data: dict) -> None:
    """Write index cache to disk."""
    path = _index_path(slug)
    path.parent.mkdir(parents=True, exist_ok=True)
    safe_write_json(path, data)


# ---------------------------------------------------------------------------
# Frontmatter parser (for SKILL.md files)
# ---------------------------------------------------------------------------

def _parse_skill_md_frontmatter(skill_md_path: Path) -> dict:
    """Read a SKILL.md file and extract YAML-like frontmatter key-value pairs."""
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


# ---------------------------------------------------------------------------
# Index builders
# ---------------------------------------------------------------------------

def _build_from_skills_index_json(repo_dir: Path, slug: str) -> list[dict]:
    """Build catalog items from a skills_index.json file (canonical, fast path)."""
    idx_path = repo_dir / "skills_index.json"
    if not idx_path.is_file():
        return []

    try:
        entries = json.loads(idx_path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []

    if not isinstance(entries, list):
        return []

    items: list[dict] = []
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        path_in_repo = entry.get("path", "")
        if not path_in_repo:
            continue

        item_id = f"{slug}::{path_in_repo}"

        # Estimate tokens from the SKILL.md file if it exists
        skill_md = repo_dir / path_in_repo / "SKILL.md"
        token_est = 0
        if skill_md.is_file():
            try:
                token_est = estimate_file_tokens(skill_md.stat().st_size)
            except OSError:
                pass

        items.append({
            "id": item_id,
            "provider_slug": slug,
            "name": entry.get("name", ""),
            "path_in_repo": path_in_repo,
            "description": entry.get("description", ""),
            "category": entry.get("category", ""),
            "token_estimate": token_est,
            "item_type": "skill",
        })

    return items


def _discover_commands(repo_dir: Path, slug: str) -> list[dict]:
    """Discover command .md files in a repo's commands/ directory."""
    items: list[dict] = []
    commands_dir = repo_dir / "commands"
    if not commands_dir.is_dir():
        return items

    for md_file in sorted(commands_dir.rglob("*.md")):
        if md_file.name.lower() == "readme.md":
            continue
        rel_path = md_file.relative_to(repo_dir)
        path_in_repo = str(rel_path)
        item_id = f"{slug}::{path_in_repo}"

        description = ""
        try:
            text = md_file.read_text(encoding="utf-8").strip()
            if text:
                first_line = text.splitlines()[0].strip().lstrip("#").strip()
                description = first_line
        except OSError:
            pass

        try:
            size = md_file.stat().st_size
        except OSError:
            size = 0

        items.append({
            "id": item_id,
            "provider_slug": slug,
            "name": md_file.stem,
            "path_in_repo": path_in_repo,
            "description": description,
            "category": "",
            "token_estimate": estimate_file_tokens(size),
            "item_type": "command",
        })

    return items


def _build_from_rglob(repo_dir: Path, slug: str) -> list[dict]:
    """Fallback: discover skills via rglob(SKILL.md) and commands via commands/*.md."""
    items: list[dict] = []

    # --- Skills ---
    for skill_md in sorted(repo_dir.rglob("SKILL.md")):
        rel_path = skill_md.relative_to(repo_dir)
        skill_dir = skill_md.parent
        path_in_repo = str(rel_path.parent)
        item_id = f"{slug}::{path_in_repo}"

        meta = _parse_skill_md_frontmatter(skill_md)
        display_name = meta.get("name", skill_dir.name)

        try:
            size = skill_md.stat().st_size
        except OSError:
            size = 0

        items.append({
            "id": item_id,
            "provider_slug": slug,
            "name": display_name,
            "path_in_repo": path_in_repo,
            "description": meta.get("description", ""),
            "category": meta.get("category", ""),
            "token_estimate": estimate_file_tokens(size),
            "item_type": "skill",
        })

    # --- Commands ---
    items.extend(_discover_commands(repo_dir, slug))

    return items


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def build_provider_index(
    slug: str, repo_dir: Path, *, force: bool = False
) -> dict:
    """Build (or return cached) index for a single provider.

    Returns ``{"git_sha": "...", "built_at": "...", "items": [...]}``.
    Uses git SHA to skip rebuilding when the repo hasn't changed.
    """
    current_sha = _get_git_sha(repo_dir)

    if not force:
        cached = _read_index_cache(slug)
        if cached and cached.get("git_sha") == current_sha and current_sha:
            return cached

    # Prefer skills_index.json (fast), fall back to rglob (thorough)
    items = _build_from_skills_index_json(repo_dir, slug)
    if not items:
        items = _build_from_rglob(repo_dir, slug)
    else:
        # Also pick up commands even when skills_index.json exists
        items.extend(_discover_commands(repo_dir, slug))

    from datetime import datetime, timezone
    index_data = {
        "git_sha": current_sha,
        "built_at": datetime.now(timezone.utc).isoformat(),
        "items": items,
    }

    _write_index_cache(slug, index_data)
    return index_data


def invalidate_provider_index(slug: str) -> None:
    """Delete the cached index for a provider."""
    path = _index_path(slug)
    path.unlink(missing_ok=True)


def query_catalog(
    *,
    page: int = 1,
    page_size: int = 48,
    search: str = "",
    provider_slug: str = "",
    item_type: str = "all",
) -> dict:
    """Query the unified catalog across all providers with pagination and filtering.

    Returns a CatalogPageResponse-compatible dict.
    """
    # Load registry for installation status
    registry: dict = {}
    reg_path = _registry_path()
    if reg_path.is_file():
        try:
            registry = json.loads(reg_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    installations = registry.get("installations", {})
    providers_data = registry.get("providers", {})

    # Collect items from all provider indexes
    all_items: list[dict] = []
    repos = _repos_dir()

    for slug in sorted(providers_data.keys()):
        # Filter by provider if requested
        if provider_slug and slug != provider_slug:
            continue

        repo_dir = repos / slug
        if not repo_dir.is_dir():
            continue

        index_data = build_provider_index(slug, repo_dir)
        for item in index_data.get("items", []):
            # Merge installation status (not cached — can change independently)
            item_id = item["id"]
            if item_id in installations:
                item = {
                    **item,
                    "installed": True,
                    "installed_scope": installations[item_id].get("scope", ""),
                    "installed_path": installations[item_id].get("installed_path", ""),
                }
            else:
                item = {
                    **item,
                    "installed": False,
                    "installed_scope": "",
                    "installed_path": "",
                }
            all_items.append(item)

    # --- Filtering ---

    # Filter by item_type
    if item_type and item_type != "all":
        all_items = [i for i in all_items if i.get("item_type") == item_type]

    # Filter by search (case-insensitive, matches name or description)
    if search:
        q = search.lower()
        all_items = [
            i for i in all_items
            if q in i.get("name", "").lower()
            or q in i.get("description", "").lower()
            or q in i.get("category", "").lower()
        ]

    # --- Pagination ---
    total = len(all_items)
    total_pages = max(1, math.ceil(total / page_size))
    page = min(page, total_pages)
    start = (page - 1) * page_size
    end = start + page_size
    page_items = all_items[start:end]

    return {
        "items": page_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
