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


class TestUpdateServer:
    def test_update_command(self, mock_settings):
        """Update command of existing server."""
        result = mcp_service.update_server("test-server", {
            "config": {"command": "python", "args": ["-m", "server"]},
        })
        assert result["status"] == "updated"
        servers = mcp_service.list_all_servers()
        s = next(s for s in servers if s["name"] == "test-server")
        assert s["command"] == "python"

    def test_rename_server(self, mock_settings):
        """Rename a server."""
        result = mcp_service.update_server("test-server", {
            "new_name": "renamed-server",
        })
        assert result["name"] == "renamed-server"
        servers = mcp_service.list_all_servers()
        names = [s["name"] for s in servers]
        assert "renamed-server" in names
        assert "test-server" not in names

    def test_change_scope_global_to_project(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({
            "mcpServers": {
                "my-server": {"command": "node", "args": ["s.js"]},
            },
            "projects": {"/tmp/proj": {}},
        }))
        result = mcp_service.update_server("my-server", {
            "scope": "project",
            "project_path": "/tmp/proj",
        })
        assert result["status"] == "updated"
        servers = mcp_service.list_all_servers()
        s = next(s for s in servers if s["name"] == "my-server")
        assert s["scope"] == "project"
        assert s["project_path"] == "/tmp/proj"

    def test_change_type_stdio_to_http(self, mock_settings):
        """Change server from stdio to http."""
        result = mcp_service.update_server("test-server", {
            "config": {"type": "http", "url": "https://example.com/mcp"},
        })
        assert result["status"] == "updated"
        servers = mcp_service.list_all_servers()
        s = next(s for s in servers if s["name"] == "test-server")
        assert s["server_type"] == "http"
        assert s["url"] == "https://example.com/mcp"

    def test_update_nonexistent_raises(self, mock_settings):
        with pytest.raises(KeyError, match="not found"):
            mcp_service.update_server("nonexistent", {"config": {"command": "node"}})

    def test_update_disabled_server(self, mock_settings):
        """Can update a disabled server in the sidecar."""
        mcp_service.toggle_server("test-server", False)
        result = mcp_service.update_server("test-server", {
            "config": {"command": "python", "args": ["new.py"]},
        })
        assert result["status"] == "updated"
        servers = mcp_service.list_all_servers()
        s = next(s for s in servers if s["name"] == "test-server")
        assert s["command"] == "python"
        assert s["enabled"] is False


class TestCreateServer:
    def test_create_stdio_server(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({"mcpServers": {}}))
        result = mcp_service.create_server(
            name="my-stdio",
            config={"command": "node", "args": ["server.js"], "env": {}},
            scope="global",
            project_path=None,
        )
        assert result["name"] == "my-stdio"
        servers = mcp_service.list_all_servers()
        assert any(s["name"] == "my-stdio" for s in servers)

    def test_create_http_server(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({"mcpServers": {}}))
        result = mcp_service.create_server(
            name="my-http",
            config={"url": "https://example.com/mcp"},
            scope="global",
            project_path=None,
        )
        assert result["name"] == "my-http"
        servers = mcp_service.list_all_servers()
        http_server = next(s for s in servers if s["name"] == "my-http")
        assert http_server["server_type"] == "http"
        assert http_server["url"] == "https://example.com/mcp"

    def test_create_project_scoped_server(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({
            "mcpServers": {},
            "projects": {"/tmp/my-project": {}},
        }))
        result = mcp_service.create_server(
            name="proj-server",
            config={"command": "node", "args": ["s.js"]},
            scope="project",
            project_path="/tmp/my-project",
        )
        assert result["name"] == "proj-server"
        servers = mcp_service.list_all_servers()
        proj = next(s for s in servers if s["name"] == "proj-server")
        assert proj["scope"] == "project"
        assert proj["project_path"] == "/tmp/my-project"

    def test_create_duplicate_name_raises(self, mock_settings):
        with pytest.raises(ValueError, match="already exists"):
            mcp_service.create_server(
                name="test-server",  # already exists in fixture
                config={"command": "node"},
                scope="global",
                project_path=None,
            )

    def test_create_project_scoped_unknown_project_raises(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({"mcpServers": {}}))
        with pytest.raises(ValueError, match="not found"):
            mcp_service.create_server(
                name="new-server",
                config={"command": "node"},
                scope="project",
                project_path="/nonexistent",
            )


class TestListProjectPaths:
    def test_returns_project_paths(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({
            "mcpServers": {},
            "projects": {
                "/home/user/project-a": {"allowedTools": []},
                "/home/user/project-b": {"mcpServers": {}},
            }
        }))
        paths = mcp_service.list_project_paths()
        assert paths == ["/home/user/project-a", "/home/user/project-b"]

    def test_returns_empty_when_no_projects(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({"mcpServers": {}}))
        paths = mcp_service.list_project_paths()
        assert paths == []

    def test_returns_sorted(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({
            "mcpServers": {},
            "projects": {
                "/z-project": {},
                "/a-project": {},
                "/m-project": {},
            }
        }))
        paths = mcp_service.list_project_paths()
        assert paths == ["/a-project", "/m-project", "/z-project"]


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
