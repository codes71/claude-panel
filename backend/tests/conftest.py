"""Shared fixtures for backend tests."""

import json
import os
from pathlib import Path

import pytest

from ccm.config import Settings


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
    (claude_home / "projects").mkdir()
    (claude_home / "backups" / "ccm").mkdir(parents=True)

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
    from ccm.config import settings
    from ccm.services import instance_service

    monkeypatch.setattr(settings, "claude_home", tmp_claude_home)
    monkeypatch.setattr(settings, "claude_json_path", tmp_claude_json)
    monkeypatch.setattr(settings, "backup_dir", tmp_claude_home / "backups" / "ccm")
    monkeypatch.setattr(settings, "ccm_skill_providers_dir", tmp_claude_home / "ccm" / "skill-providers")
    monkeypatch.setattr(
        instance_service,
        "_PERSISTENCE_PATH",
        tmp_claude_home.parent / ".config" / "ccm" / "instances.json",
    )

    return settings
