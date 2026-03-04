"""Tests for mcp_service."""

import json

import pytest

from ccm.services import mcp_service


class TestListAllServers:
    def test_with_active_servers(self, mock_settings):
        servers = mcp_service.list_all_servers()
        assert len(servers) == 1
        assert servers[0]["name"] == "test-server"
        assert servers[0]["enabled"] is True
        assert servers[0]["server_type"] == "stdio"

    def test_empty_servers(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({"mcpServers": {}}))
        servers = mcp_service.list_all_servers()
        assert servers == []

    def test_missing_claude_json(self, mock_settings, tmp_claude_json):
        tmp_claude_json.unlink()
        servers = mcp_service.list_all_servers()
        assert servers == []


class TestToggleServer:
    def test_disable_server(self, mock_settings):
        result = mcp_service.toggle_server("test-server", False)
        assert result["enabled"] is False
        assert result["status"] == "disabled"
        active = mcp_service.list_all_servers()
        disabled = [s for s in active if not s["enabled"]]
        assert len(disabled) == 1
        assert disabled[0]["name"] == "test-server"

    def test_enable_server(self, mock_settings):
        mcp_service.toggle_server("test-server", False)
        result = mcp_service.toggle_server("test-server", True)
        assert result["enabled"] is True
        assert result["status"] == "enabled"

    def test_disable_nonexistent_raises(self, mock_settings):
        with pytest.raises(KeyError):
            mcp_service.toggle_server("nonexistent", False)

    def test_already_enabled(self, mock_settings):
        result = mcp_service.toggle_server("test-server", True)
        assert result["status"] == "already_enabled"
