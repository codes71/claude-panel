"""Shared fixtures for backend tests."""

import json
import os
from pathlib import Path

import pytest

from claude_panel.config import Settings


@pytest.fixture()
def tmp_claude_home(tmp_path):
    """Create a temporary Claude home directory with basic structure."""
    claude_home = tmp_path / ".claude"
    claude_home.mkdir()

    # Create basic settings.json
    settings_json = claude_home / "settings.json"
    settings_json.write_text(json.dumps({
        "env": {"MY_VAR": "hello"},
        "enabledPlugins": {},
        "skipDangerousModePermissionPrompt": False,
    }))

    # Create basic directory structure
    (claude_home / "plugins").mkdir()
    (claude_home / "plugins" / "cache").mkdir()
    (claude_home / "commands").mkdir()
    (claude_home / "agents").mkdir()
    (claude_home / "projects").mkdir()
    (claude_home / "backups" / "claude-panel").mkdir(parents=True)

    # Create .credentials.json (marks as valid instance)
    (claude_home / ".credentials.json").write_text("{}")

    return claude_home


@pytest.fixture()
def tmp_claude_json(tmp_path):
    """Create a temporary .claude.json file."""
    claude_json = tmp_path / ".claude.json"
    claude_json.write_text(json.dumps({
        "mcpServers": {
            "test-server": {
                "command": "node",
                "args": ["server.js"],
                "env": {"API_KEY": "test123"},
            }
        }
    }))
    return claude_json


@pytest.fixture()
def mock_settings(tmp_claude_home, tmp_claude_json, monkeypatch):
    """Patch the global settings singleton to use temporary directories."""
    from claude_panel.config import settings
    from claude_panel.services import instance_service, skill_provider_service

    # skill_providers_dir mirrors the new global location (~/.config/claude-panel/...)
    global_config = tmp_claude_home.parent / ".config" / "claude-panel"
    monkeypatch.setattr(settings, "claude_home", tmp_claude_home)
    monkeypatch.setattr(settings, "claude_json_path", tmp_claude_json)
    monkeypatch.setattr(settings, "backup_dir", tmp_claude_home / "backups" / "claude-panel")
    monkeypatch.setattr(settings, "skill_providers_dir", global_config / "skill-providers")
    monkeypatch.setattr(
        instance_service,
        "_PERSISTENCE_PATH",
        global_config / "instances.json",
    )
    # Reset the per-process migration flag so each test starts fresh
    monkeypatch.setattr(skill_provider_service, "_migrated", False)

    return settings
