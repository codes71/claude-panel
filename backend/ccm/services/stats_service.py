"""Reads real Claude Code usage stats from stats-cache.json."""

import json
import logging
from pathlib import Path

from ccm.config import settings

logger = logging.getLogger(__name__)


def _read_stats_cache() -> dict | None:
    """Read and parse ~/.claude/stats-cache.json."""
    path = Path(settings.claude_home) / "stats-cache.json"
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, PermissionError, OSError) as e:
        logger.debug("Cannot read stats-cache.json: %s", e)
        return None


def get_usage_stats() -> dict:
    """Return parsed usage statistics or empty defaults."""
    raw = _read_stats_cache()
    if not raw:
        return {
            "available": False,
            "messages_today": 0,
            "messages_week": 0,
            "sessions_today": 0,
            "tool_calls_today": 0,
            "daily_breakdown": [],
        }

    messages = raw.get("messages", {})
    sessions = raw.get("sessions", {})
    tool_calls = raw.get("toolCalls", {})

    from datetime import date, timedelta

    today = date.today().isoformat()
    week_ago = (date.today() - timedelta(days=7)).isoformat()

    messages_today = messages.get(today, 0)
    sessions_today = sessions.get(today, 0)
    tool_calls_today = tool_calls.get(today, 0)

    messages_week = sum(
        v for k, v in messages.items() if k >= week_ago
    )

    daily_breakdown = []
    for i in range(7):
        d = (date.today() - timedelta(days=6 - i)).isoformat()
        daily_breakdown.append({
            "date": d,
            "messages": messages.get(d, 0),
            "sessions": sessions.get(d, 0),
            "tool_calls": tool_calls.get(d, 0),
        })

    return {
        "available": True,
        "messages_today": messages_today,
        "messages_week": messages_week,
        "sessions_today": sessions_today,
        "tool_calls_today": tool_calls_today,
        "daily_breakdown": daily_breakdown,
    }
