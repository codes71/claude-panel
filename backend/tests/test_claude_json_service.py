"""Tests for claude_json_service."""

import json

import pytest

from claude_panel.services import claude_json_service


class TestReadClaudeJson:
    def test_read_existing(self, mock_settings):
        result = claude_json_service.read_claude_json()
        assert "mcpServers" in result

    def test_read_missing(self, mock_settings, tmp_claude_json):
        tmp_claude_json.unlink()
        result = claude_json_service.read_claude_json()
        assert result == {}

    def test_read_invalid_json(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text("broken{{{")
        result = claude_json_service.read_claude_json()
        assert result == {}


class TestMcpServers:
    def test_get_servers(self, mock_settings):
        servers = claude_json_service.get_mcp_servers()
        assert "test-server" in servers

    def test_add_server(self, mock_settings):
        result = claude_json_service.add_mcp_server(
            "new-server", {"command": "python", "args": ["s.py"]}
        )
        assert "new-server" in result

    def test_add_duplicate_raises(self, mock_settings):
        with pytest.raises(ValueError, match="already exists"):
            claude_json_service.add_mcp_server("test-server", {"command": "node"})

    def test_remove_server(self, mock_settings):
        result = claude_json_service.remove_mcp_server("test-server")
        assert "test-server" not in result

    def test_remove_missing_raises(self, mock_settings):
        with pytest.raises(KeyError, match="not found"):
            claude_json_service.remove_mcp_server("nonexistent")

    def test_update_server(self, mock_settings):
        result = claude_json_service.update_mcp_server(
            "test-server", {"command": "bun", "args": ["run.ts"]}
        )
        assert result["test-server"]["command"] == "bun"

    def test_update_missing_raises(self, mock_settings):
        with pytest.raises(KeyError, match="not found"):
            claude_json_service.update_mcp_server("nonexistent", {"command": "x"})
