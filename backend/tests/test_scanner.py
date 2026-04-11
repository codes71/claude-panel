"""Tests for scanner."""

import json

import pytest

from claude_panel.services.scanner import scan_config_tree, _discover_plugins, _discover_mcp_servers, _discover_commands, _discover_claude_md_files


class TestScanConfigTree:
    def test_full_scan_minimal(self, mock_settings):
        tree = scan_config_tree()
        assert tree.settings_json is not None
        assert tree.claude_json is not None
        assert isinstance(tree.plugins, list)
        assert isinstance(tree.mcp_servers, list)
        assert isinstance(tree.commands, list)

    def test_scan_with_mcp_servers(self, mock_settings):
        tree = scan_config_tree()
        assert len(tree.mcp_servers) == 1
        assert tree.mcp_servers[0].name == "test-server"

    def test_scan_missing_settings(self, mock_settings):
        (mock_settings.claude_home / "settings.json").unlink()
        tree = scan_config_tree()
        assert tree.settings_json is None

    def test_scan_corrupt_settings(self, mock_settings):
        (mock_settings.claude_home / "settings.json").write_text("not json")
        tree = scan_config_tree()
        assert tree.settings_json is None


class TestDiscoverPlugins:
    def test_no_installed_file(self, mock_settings):
        plugins = _discover_plugins(mock_settings.claude_home, {})
        assert plugins == []

    def test_with_installed_plugins(self, mock_settings):
        installed = mock_settings.claude_home / "plugins" / "installed_plugins.json"
        installed.write_text(json.dumps([
            {"id": "test-plugin@mp", "name": "Test Plugin", "marketplace": "mp"}
        ]))
        settings_data = {"enabledPlugins": {"test-plugin@mp": True}}
        plugins = _discover_plugins(mock_settings.claude_home, settings_data)
        assert len(plugins) == 1
        assert plugins[0].enabled is True


class TestDiscoverCommands:
    def test_no_commands_dir(self, tmp_path):
        result = _discover_commands(tmp_path / "nonexistent")
        assert result == []

    def test_with_command_files(self, mock_settings):
        cmds = mock_settings.claude_home / "commands"
        (cmds / "test.md").write_text("Test command")
        result = _discover_commands(mock_settings.claude_home)
        assert len(result) == 1
        assert result[0].name == "test"


class TestDiscoverMcpServers:
    def test_with_servers(self):
        claude_json = {
            "mcpServers": {
                "server1": {"command": "node", "args": ["s.js"]},
                "server2": {"url": "http://localhost:3000"},
            }
        }
        servers = _discover_mcp_servers(claude_json)
        assert len(servers) == 2
        stdio = next(s for s in servers if s.name == "server1")
        sse = next(s for s in servers if s.name == "server2")
        assert stdio.server_type == "stdio"
        assert sse.server_type == "http"

    def test_no_data(self):
        assert _discover_mcp_servers(None) == []

    def test_empty_servers(self):
        assert _discover_mcp_servers({"mcpServers": {}}) == []

    def test_with_project_scoped_servers(self):
        claude_json = {
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
        }

        servers = _discover_mcp_servers(claude_json)

        assert len(servers) == 2
        assert any(s.name == "global-server" and s.scope == "global" for s in servers)
        assert any(s.name == "project-server" and s.scope == "project" for s in servers)
