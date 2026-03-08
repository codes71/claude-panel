"""Tests for config bundle service."""

from claude_panel.services import config_bundle_service


class TestConfigBundleService:
    def test_export_bundle_contains_expected_sections(self, mock_settings):
        data = config_bundle_service.export_bundle()
        bundle = data["bundle"]
        assert bundle["version"] == 1
        assert "mcp" in bundle
        assert "claude_md" in bundle
        assert "providers" in bundle

    def test_validate_bundle_returns_contract(self, mock_settings):
        data = config_bundle_service.validate_bundle({})
        assert "valid" in data
        assert "errors" in data
        assert "warnings" in data

    def test_apply_bundle_dry_run(self, mock_settings):
        data = config_bundle_service.apply_bundle({"version": 1}, dry_run=True)
        assert data["applied"] is False
        assert "changes" in data
