"""Tests for ccr_service."""

import json
from unittest.mock import patch

import pytest

from claude_panel.services import ccr_service


@pytest.fixture()
def ccr_config(tmp_path, monkeypatch):
    config_dir = tmp_path / ".claude-code-router"
    config_dir.mkdir()
    config_path = config_dir / "config.json"
    monkeypatch.setattr(ccr_service, "CONFIG_PATH", config_path)
    return config_path


class TestMasking:
    def test_mask_value(self):
        assert ccr_service._mask_value("short") == "***"
        assert ccr_service._mask_value("a-long-secret-key") == "a-l***key"

    def test_should_mask_api_key(self):
        assert ccr_service._should_mask("api_key", "some-value") is True
        assert ccr_service._should_mask("name", "some-value") is False

    def test_mask_config(self):
        config = {"name": "test", "api_key": "super-secret-value-here"}
        masked = ccr_service._mask_config(config)
        assert masked["name"] == "test"
        assert masked["api_key"] != "super-secret-value-here"


class TestReadConfig:
    def test_missing_config(self, ccr_config):
        assert ccr_service._read_config() is None

    def test_valid_config(self, ccr_config):
        ccr_config.write_text(json.dumps({"Router": {"default": "gpt-4"}}))
        result = ccr_service._read_config()
        assert result["Router"]["default"] == "gpt-4"

    def test_invalid_json(self, ccr_config):
        ccr_config.write_text("not json")
        assert ccr_service._read_config() is None


class TestGetStatus:
    @patch.object(ccr_service, "_check_running", return_value=False)
    def test_not_installed(self, mock_running, ccr_config):
        status = ccr_service.get_status()
        assert status.installed is False

    @patch.object(ccr_service, "_check_running", return_value=False)
    def test_installed_not_running(self, mock_running, ccr_config):
        ccr_config.write_text(json.dumps({"Router": {}}))
        status = ccr_service.get_status()
        assert status.installed is True
        assert status.running is False


class TestGetDashboard:
    @patch.object(ccr_service, "_check_running", return_value=False)
    def test_no_config(self, mock_running, ccr_config):
        result = ccr_service.get_dashboard()
        assert result.status.installed is False
        assert result.providers == []

    @patch.object(ccr_service, "_check_running", return_value=False)
    def test_with_config(self, mock_running, ccr_config):
        config = {
            "Providers": [
                {
                    "name": "openai",
                    "api_base_url": "https://api.openai.com",
                    "models": ["gpt-4"],
                    "api_key": "sk-test",
                }
            ],
            "Router": {"default": "gpt-4", "longContextThreshold": 80000},
        }
        ccr_config.write_text(json.dumps(config))
        result = ccr_service.get_dashboard()
        assert result.status.installed is True
        assert len(result.providers) == 1
        assert result.router.default_model == "gpt-4"
        assert result.router.long_context_threshold == 80000


class TestParseProviders:
    def test_basic(self):
        raw = [
            {
                "name": "anthropic",
                "api_base_url": "https://api.anthropic.com",
                "models": ["claude-3"],
                "transformers": [{"use": ["cache"]}],
            }
        ]
        result = ccr_service._parse_providers(raw)
        assert len(result) == 1
        assert result[0].name == "anthropic"
        assert "cache" in result[0].transformer_names

    def test_empty(self):
        assert ccr_service._parse_providers([]) == []
