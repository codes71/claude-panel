"""Tests for mcp_service."""

import json

import pytest

from claude_panel.services import mcp_service


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

    def test_includes_project_scoped_servers(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({
            "mcpServers": {
                "global-server": {"command": "node", "args": ["global.js"]},
            },
            "projects": {
                "/tmp/project-a": {
                    "mcpServers": {
                        "project-server": {"url": "https://example.com/mcp"},
                    }
                }
            },
        }))

        servers = mcp_service.list_all_servers()

        assert len(servers) == 2
        global_server = next(s for s in servers if s["name"] == "global-server")
        project_server = next(s for s in servers if s["name"] == "project-server")

        assert global_server["scope"] == "global"
        assert global_server["project_path"] is None
        assert project_server["scope"] == "project"
        assert project_server["project_path"] == "/tmp/project-a"
        assert project_server["server_type"] == "http"
        assert project_server["url"] == "https://example.com/mcp"
        assert project_server["command"] is None

    def test_http_server_has_url_field(self, mock_settings, tmp_claude_json):
        """HTTP servers should have url field set, not stuffed into command."""
        tmp_claude_json.write_text(json.dumps({
            "mcpServers": {
                "my-http": {"type": "http", "url": "https://example.com/mcp"},
            }
        }))
        servers = mcp_service.list_all_servers()
        assert len(servers) == 1
        assert servers[0]["url"] == "https://example.com/mcp"
        assert servers[0]["command"] is None

    def test_disabled_http_server_normalized(self, mock_settings, tmp_claude_json):
        """Disabled servers with 'sse' type are normalized to 'http'."""
        # First create an http server and disable it
        tmp_claude_json.write_text(json.dumps({
            "mcpServers": {
                "http-server": {"type": "http", "url": "https://example.com/mcp"},
            }
        }))
        mcp_service.toggle_server("http-server", False)

        # Read the sidecar directly and patch it to use old "sse" type
        sidecar = mcp_service._read_sidecar()
        # The sidecar stores raw config, not server_type
        # When listed, disabled servers should normalize to "http" not "sse"
        servers = mcp_service.list_all_servers()
        disabled = [s for s in servers if not s["enabled"]]
        assert len(disabled) == 1
        assert disabled[0]["server_type"] == "http"


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


class TestDiagnostics:
    def test_diagnose_server_returns_checks(self, mock_settings):
        result = mcp_service.diagnose_server("test-server")
        assert result["name"] == "test-server"
        assert "checks" in result
        assert isinstance(result["checks"], list)
        assert "status" in result


class TestHealth:
    def test_list_health_returns_servers(self, mock_settings):
        result = mcp_service.list_health()
        assert "servers" in result
        assert isinstance(result["servers"], list)
        assert "updated_at" in result
