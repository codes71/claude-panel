"""Tests for settings_service."""

import json

import pytest

from ccm.services import settings_service


class TestReadSettings:
    def test_read_existing_settings(self, mock_settings):
        result = settings_service.read_settings()
        assert "env" in result
        assert result["env"]["MY_VAR"] == "hello"

    def test_read_missing_file(self, mock_settings):
        (mock_settings.claude_home / "settings.json").unlink()
        result = settings_service.read_settings()
        assert result == {}

    def test_read_invalid_json(self, mock_settings):
        (mock_settings.claude_home / "settings.json").write_text("not json{{{")
        result = settings_service.read_settings()
        assert result == {}


class TestUpdateSettings:
    def test_merge_updates(self, mock_settings):
        result = settings_service.update_settings({"newKey": "newValue"})
        assert result["newKey"] == "newValue"
        assert result["env"]["MY_VAR"] == "hello"

    def test_overwrite_existing_key(self, mock_settings):
        result = settings_service.update_settings({"env": {"NEW": "val"}})
        assert result["env"] == {"NEW": "val"}


class TestEnvVars:
    def test_get_env_vars(self, mock_settings):
        result = settings_service.get_env_vars()
        assert result == {"MY_VAR": "hello"}

    def test_get_env_vars_missing_env(self, mock_settings):
        (mock_settings.claude_home / "settings.json").write_text("{}")
        result = settings_service.get_env_vars()
        assert result == {}

    def test_update_env_vars_add(self, mock_settings):
        result = settings_service.update_env_vars({"NEW_KEY": "new_value"})
        assert result["MY_VAR"] == "hello"
        assert result["NEW_KEY"] == "new_value"

    def test_update_env_vars_delete(self, mock_settings):
        result = settings_service.update_env_vars({"MY_VAR": None})
        assert "MY_VAR" not in result


class TestPlugins:
    def test_get_enabled_plugins_empty(self, mock_settings):
        result = settings_service.get_enabled_plugins()
        assert result == {}

    def test_set_plugin_enabled(self, mock_settings):
        result = settings_service.set_plugin_enabled("test@mp", True)
        assert result["test@mp"] is True

    def test_toggle_plugin_off(self, mock_settings):
        settings_service.set_plugin_enabled("test@mp", True)
        result = settings_service.set_plugin_enabled("test@mp", False)
        assert result["test@mp"] is False
