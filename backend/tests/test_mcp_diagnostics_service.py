"""Tests for enhanced MCP diagnostics service."""

import pytest

from claude_panel.services.mcp_diagnostics_service import (
    _check_oauth_config,
    _check_headers_helper,
    _check_output_schema,
    diagnose_server,
)


class TestOAuthConfigCheck:
    def test_no_oauth_configured(self):
        """Test OAuth check when no OAuth is configured."""
        server = {"name": "test-server"}
        result = _check_oauth_config(server)

        assert result["code"] == "OAUTH_NOT_CONFIGURED"
        assert result["status"] == "ok"
        assert "not configured" in result["message"]

    def test_valid_oauth_url(self):
        """Test OAuth check with valid HTTPS URL."""
        server = {
            "name": "test-server",
            "oauth_auth_server_metadata_url": "https://auth.example.com/.well-known/oauth-authorization-server"
        }
        result = _check_oauth_config(server)

        assert result["code"] == "OAUTH_CONFIGURED"
        assert result["status"] == "ok"
        assert "valid" in result["message"]

    def test_valid_oauth_http_url(self):
        """Test OAuth check with valid HTTP URL."""
        server = {
            "name": "test-server",
            "oauth_auth_server_metadata_url": "http://localhost:8080/.well-known/oauth-authorization-server"
        }
        result = _check_oauth_config(server)

        assert result["code"] == "OAUTH_CONFIGURED"
        assert result["status"] == "ok"

    def test_invalid_oauth_url_type(self):
        """Test OAuth check with non-string URL."""
        server = {
            "name": "test-server",
            "oauth_auth_server_metadata_url": 123
        }
        result = _check_oauth_config(server)

        assert result["code"] == "OAUTH_INVALID_TYPE"
        assert result["status"] == "fail"
        assert "must be a string" in result["message"]

    def test_invalid_oauth_url_format(self):
        """Test OAuth check with invalid URL format."""
        server = {
            "name": "test-server",
            "oauth_auth_server_metadata_url": "ftp://invalid.url"
        }
        result = _check_oauth_config(server)

        assert result["code"] == "OAUTH_INVALID_URL"
        assert result["status"] == "fail"
        assert "valid HTTP/HTTPS URL" in result["message"]


class TestHeadersHelperCheck:
    def test_no_headers_helper(self):
        """Test headers helper check when not configured."""
        server = {"name": "test-server"}
        result = _check_headers_helper(server)

        assert result["code"] == "HEADERS_HELPER_NOT_CONFIGURED"
        assert result["status"] == "ok"
        assert "not configured" in result["message"]

    def test_headers_helper_connected(self):
        """Test headers helper check when connected."""
        server = {
            "name": "test-server",
            "has_headers_helper": True,
            "connection_status": "connected"
        }
        result = _check_headers_helper(server)

        assert result["code"] == "HEADERS_HELPER_CONNECTED"
        assert result["status"] == "ok"
        assert "functioning normally" in result["message"]

    def test_headers_helper_reconnecting(self):
        """Test headers helper check when reconnecting."""
        server = {
            "name": "test-server",
            "has_headers_helper": True,
            "connection_status": "reconnecting"
        }
        result = _check_headers_helper(server)

        assert result["code"] == "HEADERS_HELPER_RECONNECTING"
        assert result["status"] == "warn"
        assert "reconnecting" in result["message"]

    def test_headers_helper_disconnected(self):
        """Test headers helper check when disconnected."""
        server = {
            "name": "test-server",
            "has_headers_helper": True,
            "connection_status": "disconnected"
        }
        result = _check_headers_helper(server)

        assert result["code"] == "HEADERS_HELPER_DISCONNECTED"
        assert result["status"] == "fail"
        assert "disconnected" in result["message"]

    def test_headers_helper_unknown_status(self):
        """Test headers helper check with unknown status."""
        server = {
            "name": "test-server",
            "has_headers_helper": True,
            "connection_status": "unknown"
        }
        result = _check_headers_helper(server)

        assert result["code"] == "HEADERS_HELPER_STATUS_UNKNOWN"
        assert result["status"] == "warn"
        assert "unknown" in result["message"]


class TestOutputSchemaCheck:
    def test_no_schema_issues(self):
        """Test output schema check with no issues."""
        server = {"name": "test-server"}
        result = _check_output_schema(server)

        assert result["code"] == "OUTPUT_SCHEMA_VALID"
        assert result["status"] == "ok"
        assert "No output schema validation issues" in result["message"]

    def test_schema_issues_with_warnings(self):
        """Test output schema check with issues and warnings."""
        server = {
            "name": "test-server",
            "has_output_schema_issues": True,
            "validation_warnings": ["Invalid schema format", "Missing required field"]
        }
        result = _check_output_schema(server)

        assert result["code"] == "OUTPUT_SCHEMA_ISSUES"
        assert result["status"] == "warn"
        assert "Invalid schema format; Missing required field" in result["message"]

    def test_schema_issues_without_warnings(self):
        """Test output schema check with issues but no specific warnings."""
        server = {
            "name": "test-server",
            "has_output_schema_issues": True
        }
      
        mcp_service.toggle_server("oauth-test", False)

        # Check that OAuth config is preserved in disabled state
        servers = mcp_service.list_all_servers()
        disabled_server = next(s for s in servers if s["name"] == "oauth-test")

        assert disabled_server["enabled"] is False
        assert disabled_server["oauth_auth_server_metadata_url"] == "https://auth.test.com/.well-known/oauth-authorization-server"

        # Re-enable and check OAuth config is still there
        mcp_service.toggle_server("oauth-test", True)
        servers = mcp_service.list_all_servers()
        enabled_server = next(s for s in servers if s["name"] == "oauth-test")

        assert enabled_server["enabled"] is True
        assert enabled_server["oauth_auth_server_metadata_url"] == "https://auth.test.com/.well-known/oauth-authorization-server"
