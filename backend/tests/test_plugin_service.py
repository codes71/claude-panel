"""Tests for plugin_service."""

import json

import pytest

from claude_panel.services import plugin_service


class TestReadInstalled:
    def test_missing_file(self, mock_settings):
        result = plugin_service._read_installed()
        assert result == {}

    def test_v2_format(self, mock_settings):
        plugins_dir = mock_settings.claude_home / "plugins"
        (plugins_dir / "installed_plugins.json").write_text(json.dumps({
            "version": 2,
            "plugins": {
                "test@cursor-public": [{"version": "1.0.0"}]
            }
        }))
        result = plugin_service._read_installed()
        assert "test@cursor-public" in result

    def test_v1_list_format(self, mock_settings):
        plugins_dir = mock_settings.claude_home / "plugins"
        (plugins_dir / "installed_plugins.json").write_text(json.dumps([
            {"id": "test@mp", "name": "test"}
        ]))
        result = plugin_service._read_installed()
        assert "test@mp" in result

    def test_invalid_json(self, mock_settings):
        plugins_dir = mock_settings.claude_home / "plugins"
        (plugins_dir / "installed_plugins.json").write_text("broken{{{")
        result = plugin_service._read_installed()
        assert result == {}


class TestListPlugins:
    def test_empty_plugins(self, mock_settings):
        result = plugin_service.list_plugins()
        assert result == []

    def test_with_installed_plugins(self, mock_settings):
        plugins_dir = mock_settings.claude_home / "plugins"
        (plugins_dir / "installed_plugins.json").write_text(json.dumps({
            "version": 2,
            "plugins": {
                "my-plugin@cursor-public": [{"version": "2.0.0"}]
            }
        }))
        result = plugin_service.list_plugins()
        assert len(result) == 1
        assert result[0]["name"] == "my-plugin"
        assert result[0]["version"] == "2.0.0"


class TestTogglePlugin:
    def test_toggle_on(self, mock_settings):
        result = plugin_service.toggle_plugin("test@mp", True)
        assert result["enabled"] is True

    def test_toggle_off(self, mock_settings):
        result = plugin_service.toggle_plugin("test@mp", False)
        assert result["enabled"] is False
