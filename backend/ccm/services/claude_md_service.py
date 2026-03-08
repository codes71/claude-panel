"""CLAUDE.md file management — list, read, write."""

import os
from pathlib import Path

from ccm.config import settings
from ccm.services.backup import safe_write_text
from ccm.services.claude_md_lint_service import lint_claude_md
from ccm.services.token_estimator import estimate_file_tokens

SKIP_DIRS = {
    ".git", ".cache", "node_modules", "__pycache__", ".venv", "venv",
    ".local", ".npm", ".nvm", ".cargo", ".rustup", "target", "dist",
    "build", ".tox", ".mypy_cache", ".ruff_cache", ".pytest_cache",
    "site-packages",
}


def _scan_roots() -> list[Path]:
    roots = settings.scan_roots if settings.scan_roots else [Path.home()]
    # Resolve and de-duplicate while preserving order.
    seen: set[str] = set()
    unique_roots: list[Path] = []
    for root in roots:
        root_path = Path(root).expanduser()
        key = str(root_path.resolve()) if root_path.exists() else str(root_path)
        if key in seen:
            continue
        seen.add(key)
        unique_roots.append(root_path)
    return unique_roots


def _find_claude_md_files() -> list[dict]:
    """Recursively find all CLAUDE.md files under configured scan roots."""
    files: list[dict] = []
    seen_paths: set[str] = set()
    claude_home = settings.claude_home

    # Global CLAUDE.md (in ~/.claude/)
    global_md = claude_home / "CLAUDE.md"
    if global_md.exists():
        abs_path = str(global_md.resolve())
        seen_paths.add(abs_path)
        try:
            stat = global_md.stat()
            files.append({
                "path": abs_path,
                "scope": "global",
                "size_bytes": stat.st_size,
                "token_estimate": estimate_file_tokens(stat.st_size),
                "last_modified": stat.st_mtime,
            })
        except OSError:
            pass

    # Recursive scan of configured roots
    for root in _scan_roots():
        if not root.exists() or not root.is_dir():
            continue
        for dirpath, dirnames, filenames in os.walk(str(root)):
            # Filter out hidden and junk directories IN-PLACE to prevent os.walk from descending
            dirnames[:] = [
                d for d in dirnames
                if d not in SKIP_DIRS and not d.startswith(".")
            ]

            if "CLAUDE.md" in filenames:
                md_path = Path(dirpath) / "CLAUDE.md"
                abs_path = str(md_path.resolve())
                if abs_path in seen_paths:
                    continue
                seen_paths.add(abs_path)
                try:
                    stat = md_path.stat()
                    files.append({
                        "path": abs_path,
                        "scope": "project",
                        "size_bytes": stat.st_size,
                        "token_estimate": estimate_file_tokens(stat.st_size),
                        "last_modified": stat.st_mtime,
                    })
                except OSError:
                    continue

    return files


def _collect_lint_issues(files: list[dict]) -> list[dict]:
    issues: list[dict] = []
    for file_meta in files:
        file_path = file_meta["path"]
        try:
            content = Path(file_path).read_text(encoding="utf-8")
        except OSError:
            issues.append({
                "path": file_path,
                "code": "READ_ERROR",
                "severity": "warning",
                "message": "Could not read CLAUDE.md for linting.",
            })
            continue

        issues.extend(
            lint_claude_md(
                content=content,
                path=file_path,
                token_estimate=file_meta.get("token_estimate", 0),
            )
        )

    return issues


def list_claude_md_files() -> dict:
    """List all CLAUDE.md files with metadata and tree structure."""
    files = _find_claude_md_files()
    total_tokens = sum(f["token_estimate"] for f in files)
    tree = _build_tree(files)
    return {
        "files": files,
        "total_tokens": total_tokens,
        "tree": tree,
        "issues": _collect_lint_issues(files),
        "scan_roots": [str(p) for p in _scan_roots()],
    }


def _build_tree(files: list[dict]) -> list[dict]:
    """Build a nested tree structure from flat file list."""
    home = Path.home()
    tree: dict = {}

    for f in files:
        file_path = Path(f["path"])
        try:
            rel = file_path.relative_to(home)
        except ValueError:
            rel = file_path

        parts = list(rel.parent.parts)  # directory segments (exclude CLAUDE.md itself)

        # Navigate/create nested dict structure
        current = tree
        for part in parts:
            if part not in current:
                current[part] = {"_children": {}}
            current = current[part]["_children"]

        # Add the file as a leaf
        current["CLAUDE.md"] = {
            "_file": f,
        }

    def dict_to_nodes(d: dict) -> list[dict]:
        nodes = []
        for name, value in sorted(d.items()):
            if "_file" in value:
                # Leaf node (actual CLAUDE.md file)
                f = value["_file"]
                nodes.append({
                    "name": name,
                    "path": f["path"],
                    "scope": f["scope"],
                    "token_estimate": f["token_estimate"],
                    "size_bytes": f["size_bytes"],
                    "children": [],
                })
            else:
                # Directory node
                children = dict_to_nodes(value.get("_children", {}))
                nodes.append({
                    "name": name,
                    "path": None,
                    "scope": None,
                    "token_estimate": sum(c["token_estimate"] for c in children),
                    "size_bytes": sum(c["size_bytes"] for c in children),
                    "children": children,
                })
        return nodes

    return dict_to_nodes(tree)


def read_claude_md(file_path: str) -> dict:
    """Read a specific CLAUDE.md file."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    content = path.read_text(encoding="utf-8")
    stat = path.stat()
    return {
        "path": str(path),
        "content": content,
        "size_bytes": stat.st_size,
        "token_estimate": estimate_file_tokens(stat.st_size),
        "last_modified": stat.st_mtime,
    }


def write_claude_md(file_path: str, content: str) -> dict:
    """Write content to a CLAUDE.md file (with backup)."""
    path = Path(file_path)

    # Security: only allow writing CLAUDE.md files
    if path.name != "CLAUDE.md":
        raise ValueError("Can only write to files named CLAUDE.md")

    safe_write_text(path, content)
    stat = path.stat()
    return {
        "path": str(path),
        "size_bytes": stat.st_size,
        "token_estimate": estimate_file_tokens(stat.st_size),
        "last_modified": stat.st_mtime,
    }


def create_claude_md(file_path: str, content: str = "") -> dict:
    """Create a new CLAUDE.md file."""
    path = Path(file_path).expanduser().resolve()

    if path.name != "CLAUDE.md":
        raise ValueError("File must be named CLAUDE.md")
    if path.exists():
        raise FileExistsError(f"File already exists: {file_path}")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    stat = path.stat()
    return {
        "path": str(path),
        "size_bytes": stat.st_size,
        "token_estimate": estimate_file_tokens(stat.st_size),
        "last_modified": stat.st_mtime,
    }


def delete_claude_md(file_path: str) -> dict:
    """Delete a CLAUDE.md file (with backup)."""
    path = Path(file_path)

    if path.name != "CLAUDE.md":
        raise ValueError("Can only delete files named CLAUDE.md")
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    # Back up before deleting
    from ccm.services.backup import backup_file
    backup_file(path)

    path.unlink()
    return {"deleted": str(path)}
