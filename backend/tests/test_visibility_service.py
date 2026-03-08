"""Tests for visibility_service."""

import json

import pytest

from claude_panel.services import visibility_service


class TestListCommands:
    def test_empty(self, mock_settings):
        result = visibility_service.list_commands()
        assert result == []

    def test_with_commands(self, mock_settings):
        cmds = mock_settings.claude_home / "commands"
        (cmds / "greet.md").write_text("# Say hello\nHello!")
        result = visibility_service.list_commands()
        assert len(result) == 1
        assert result[0]["name"] == "greet"
        assert result[0]["description"] == "Say hello"


class TestListHooks:
    def test_no_hooks(self, mock_settings):
        result = visibility_service.list_hooks()
        assert result == []

    def test_with_hooks(self, mock_settings):
        data = {"hooks": {"PreToolUse": [{"command": "echo hi", "file": "/tmp/hook.sh"}]}}
        (mock_settings.claude_home / "settings.json").write_text(json.dumps(data))
        result = visibility_service.list_hooks()
        assert len(result) == 1
        assert result[0]["event"] == "PreToolUse"


class TestListMemoryFiles:
    def test_no_projects(self, mock_settings):
        result = visibility_service.list_memory_files()
        assert result == []

    def test_with_memory(self, mock_settings):
        mem = mock_settings.claude_home / "projects" / "proj1" / "memory"
        mem.mkdir(parents=True)
        (mem / "notes.md").write_text("memory content")
        result = visibility_service.list_memory_files()
        assert len(result) == 1
        assert result[0]["name"] == "notes.md"


class TestGetVisibility:
    def test_returns_all_keys(self, mock_settings):
        result = visibility_service.get_visibility()
        assert set(result.keys()) == {"commands", "hooks", "agents", "memory_files"}
