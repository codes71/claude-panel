"""Tests for settings_service."""

import json

from claude_panel.models.settings import SettingsUpdateRequest
from claude_panel.services import settings_service


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


class TestApplySettingsPatch:
    """PATCH /settings must merge env as key/value ops, not replace env with a JSON array."""

    # ── env branch ──────────────────────────────────────────────────

    def test_env_add_new_key_preserves_existing(self, mock_settings):
        result = settings_service.apply_settings_patch(
            SettingsUpdateRequest(env=[{"key": "NEW_KEY", "value": "x"}]),
        )
        assert result["env"]["MY_VAR"] == "hello"
        assert result["env"]["NEW_KEY"] == "x"

    def test_env_update_existing_key(self, mock_settings):
        result = settings_service.apply_settings_patch(
            SettingsUpdateRequest(env=[{"key": "MY_VAR", "value": "updated"}]),
        )
        assert result["env"]["MY_VAR"] == "updated"

    def test_env_delete_via_null(self, mock_settings):
        result = settings_service.apply_settings_patch(
            SettingsUpdateRequest(env=[{"key": "MY_VAR", "value": None}]),
        )
        assert "MY_VAR" not in result["env"]

    def test_env_delete_nonexistent_key_is_noop(self, mock_settings):
        result = settings_service.apply_settings_patch(
            SettingsUpdateRequest(env=[{"key": "GHOST", "value": None}]),
        )
        assert result["env"] == {"MY_VAR": "hello"}

    def test_env_multiple_ops_in_single_patch(self, mock_settings):
        result = settings_service.apply_settings_patch(
            SettingsUpdateRequest(env=[
                {"key": "MY_VAR", "value": "changed"},
                {"key": "ADDED", "value": "new"},
                {"key": "TO_DELETE", "value": None},
            ]),
        )
        assert result["env"]["MY_VAR"] == "changed"
        assert result["env"]["ADDED"] == "new"
        assert "TO_DELETE" not in result["env"]

    def test_env_remains_dict_on_disk(self, mock_settings):
        """Regression: the original bug wrote env as a JSON array."""
        settings_service.apply_settings_patch(
            SettingsUpdateRequest(env=[{"key": "X", "value": "1"}]),
        )
        raw = json.loads(
            (mock_settings.claude_home / "settings.json").read_text()
        )
        assert isinstance(raw["env"], dict), "env must be a dict on disk, not a list"
        assert raw["env"]["X"] == "1"
        assert raw["env"]["MY_VAR"] == "hello"

    # ── statusLine branch ───────────────────────────────────────────

    def test_statusline_set(self, mock_settings):
        result = settings_service.apply_settings_patch(
            SettingsUpdateRequest(
                statusLine={"type": "command", "command": "echo hi"},
            ),
        )
        assert result["statusLine"]["type"] == "command"
        assert result["statusLine"]["command"] == "echo hi"

    def test_statusline_clear_to_none(self, mock_settings):
        settings_service.apply_settings_patch(
            SettingsUpdateRequest(
                statusLine={"type": "command", "command": "echo hi"},
            ),
        )
        result = settings_service.apply_settings_patch(
            SettingsUpdateRequest(statusLine=None),
        )
        assert result["statusLine"] is None

    def test_statusline_does_not_clobber_env(self, mock_settings):
        result = settings_service.apply_settings_patch(
            SettingsUpdateRequest(
                statusLine={"type": "command", "command": "echo hi"},
            ),
        )
        assert result["env"]["MY_VAR"] == "hello"

    # ── enabledPlugins branch ───────────────────────────────────────

    def test_plugins_merge_adds_new(self, mock_settings):
        result = settings_service.apply_settings_patch(
            SettingsUpdateRequest(enabledPlugins={"new-plugin@mp": True}),
        )
        assert result["enabledPlugins"]["new-plugin@mp"] is True

    def test_plugins_merge_preserves_existing(self, mock_settings):
        settings_service.apply_settings_patch(
            SettingsUpdateRequest(enabledPlugins={"existing@mp": True}),
        )
        result = settings_service.apply_settings_patch(
            SettingsUpdateRequest(enabledPlugins={"another@mp": False}),
        )
        assert result["enabledPlugins"]["existing@mp"] is True
        assert result["enabledPlugins"]["another@mp"] is False

    def test_plugins_toggle_off(self, mock_settings):
        settings_service.apply_settings_patch(
            SettingsUpdateRequest(enabledPlugins={"p@mp": True}),
        )
        result = settings_service.apply_settings_patch(
            SettingsUpdateRequest(enabledPlugins={"p@mp": False}),
        )
        assert result["enabledPlugins"]["p@mp"] is False

    # ── skipDangerousModePermissionPrompt branch ────────────────────

    def test_skip_dangerous_sets_true(self, mock_settings):
        result = settings_service.apply_settings_patch(
            SettingsUpdateRequest(skipDangerousModePermissionPrompt=True),
        )
        assert result["skipDangerousModePermissionPrompt"] is True

    def test_skip_dangerous_does_not_clobber_env(self, mock_settings):
        result = settings_service.apply_settings_patch(
            SettingsUpdateRequest(skipDangerousModePermissionPrompt=True),
        )
        assert result["env"]["MY_VAR"] == "hello"

    # ── empty / combined patches ────────────────────────────────────

    def test_empty_patch_is_noop(self, mock_settings):
        before = settings_service.read_settings()
        result = settings_service.apply_settings_patch(SettingsUpdateRequest())
        assert result["env"] == before["env"]

    def test_combined_patch_all_fields(self, mock_settings):
        result = settings_service.apply_settings_patch(
            SettingsUpdateRequest(
                env=[{"key": "A", "value": "1"}],
                statusLine={"type": "command", "command": "date"},
                enabledPlugins={"combo@mp": True},
                skipDangerousModePermissionPrompt=True,
            ),
        )
        assert result["env"]["A"] == "1"
        assert result["env"]["MY_VAR"] == "hello"
        assert result["statusLine"]["command"] == "date"
        assert result["enabledPlugins"]["combo@mp"] is True
        assert result["skipDangerousModePermissionPrompt"] is True


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
