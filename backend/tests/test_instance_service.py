"""Tests for instance_service."""

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from ccm.services import instance_service


@pytest.fixture()
def claude_instances(tmp_path):
    """Create multiple Claude instances for testing."""
    primary = tmp_path / ".claude"
    primary.mkdir()
    (primary / ".credentials.json").write_text("{}")
    (primary / "plugins").mkdir()
    (primary / "settings.json").write_text(json.dumps({"env": {}}))

    secondary = tmp_path / ".claude-work"
    secondary.mkdir()
    (secondary / ".credentials.json").write_text("{}")
    (secondary / "projects").mkdir()
    (secondary / "settings.json").write_text(json.dumps({"mcpServers": {"s1": {}}}))

    plugin_data = tmp_path / ".claude-mem"
    plugin_data.mkdir()
    (plugin_data / "settings.json").write_text("{}")

    return tmp_path, primary, secondary, plugin_data


class TestIsValidConfigDir:
    def test_valid_with_credentials(self, tmp_path):
        d = tmp_path / "test"
        d.mkdir()
        (d / ".credentials.json").write_text("{}")
        assert instance_service._is_valid_config_dir(d) is True

    def test_valid_with_plugins(self, tmp_path):
        d = tmp_path / "test"
        d.mkdir()
        (d / "plugins").mkdir()
        assert instance_service._is_valid_config_dir(d) is True

    def test_valid_with_projects(self, tmp_path):
        d = tmp_path / "test"
        d.mkdir()
        (d / "projects").mkdir()
        assert instance_service._is_valid_config_dir(d) is True

    def test_invalid_only_weak_markers(self, tmp_path):
        d = tmp_path / "test"
        d.mkdir()
        (d / "settings.json").write_text("{}")
        assert instance_service._is_valid_config_dir(d) is False

    def test_invalid_nonexistent(self, tmp_path):
        assert instance_service._is_valid_config_dir(tmp_path / "nope") is False


class TestBuildInstanceMetadata:
    def test_basic_metadata(self, mock_settings):
        meta = instance_service._build_instance_metadata(mock_settings.claude_home)
        assert meta["has_credentials"] is True
        assert meta["has_settings"] is True
        assert meta["has_plugins"] is True
        assert meta["settings_count"] > 0

    def test_metadata_missing_settings(self, mock_settings):
        (mock_settings.claude_home / "settings.json").unlink()
        meta = instance_service._build_instance_metadata(mock_settings.claude_home)
        assert meta["settings_count"] == 0
        assert meta["mcp_server_count"] == 1

    def test_metadata_counts_mcp_servers_from_claude_json(self, mock_settings):
        mock_settings.claude_json_path.write_text(json.dumps({
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

        meta = instance_service._build_instance_metadata(mock_settings.claude_home)

        assert meta["mcp_server_count"] == 2


class TestSwitchInstance:
    def test_switch_to_valid_dir(self, mock_settings, tmp_path):
        target = tmp_path / "new-instance"
        target.mkdir()
        (target / ".credentials.json").write_text("{}")

        result = instance_service.switch_instance(str(target))
        assert result["path"] == str(target.resolve())
        assert mock_settings.claude_home == target.resolve()

    def test_switch_to_nonexistent_dir(self, mock_settings, tmp_path):
        with pytest.raises(FileNotFoundError):
            instance_service.switch_instance(str(tmp_path / "nope"))


class TestAddRemoveInstance:
    def test_add_instance(self, mock_settings, tmp_path):
        target = tmp_path / "extra"
        target.mkdir()

        result = instance_service.add_instance(str(target))
        assert result["path"] == str(target.resolve())

    def test_add_nonexistent_raises(self, mock_settings, tmp_path):
        with pytest.raises(FileNotFoundError):
            instance_service.add_instance(str(tmp_path / "nope"))

    def test_remove_instance(self, mock_settings, tmp_path):
        target = tmp_path / "extra"
        target.mkdir()
        instance_service.add_instance(str(target))

        result = instance_service.remove_instance(str(target))
        assert result["removed"] == str(target.resolve())

    def test_cannot_remove_default(self, mock_settings):
        with pytest.raises(ValueError, match="Cannot remove"):
            instance_service.remove_instance(str(instance_service._DEFAULT_INSTANCE))
