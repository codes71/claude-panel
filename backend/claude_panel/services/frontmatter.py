"""Shared YAML frontmatter parsing and name validation utilities."""

import re

import yaml

VALID_NAME_RE = re.compile(r"^[a-zA-Z0-9_-]+$")


def parse_frontmatter(text: str) -> dict:
    """Extract YAML frontmatter from markdown text.

    Looks for content between opening and closing ``---`` markers
    at the start of the file. Returns a dict with parsed keys
    or an empty dict if no valid frontmatter is found.
    """
    text = text.strip()
    if not text.startswith("---"):
        return {}

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


def validate_name(name: str) -> None:
    """Validate a name segment (command, namespace, or agent).

    Raises ``ValueError`` if the name contains characters other than
    letters, numbers, hyphens, and underscores.
    """
    if not VALID_NAME_RE.match(name):
        raise ValueError(
            f"Invalid name '{name}': only letters, numbers, hyphens, and underscores are allowed"
        )
