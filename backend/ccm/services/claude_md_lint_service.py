"""Lightweight lint checks for CLAUDE.md files."""


TOKEN_WARNING_THRESHOLD = 4000


def lint_claude_md(content: str, path: str, token_estimate: int) -> list[dict]:
    """Return lint findings for one CLAUDE.md file."""
    issues: list[dict] = []

    if not content.strip():
        issues.append({
            "path": path,
            "code": "EMPTY",
            "severity": "warning",
            "message": "CLAUDE.md is empty.",
        })

    if token_estimate >= TOKEN_WARNING_THRESHOLD:
        issues.append({
            "path": path,
            "code": "TOKEN_HEAVY",
            "severity": "warning",
            "message": f"Estimated token usage is high ({token_estimate}).",
        })

    return issues
