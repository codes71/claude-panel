"""Tests for enhanced MCP diagnostics checks."""

import pytest

from claude_panel.services.mcp_diagnostics_service import (
    _check_duplicate_name,
    _check_empty_env_values,
    _check_http_url_reachability,
    diagnose_server,
)


class TestCheckDuplicateName:
    def test_no_duplicates(self):
        all_servers = [
            {"name": "server-a", "scope": "global"},
            {"name": "server-b", "scope": "project"},
        ]
        result = _check_duplicate_name("server-a", all_servers)
        assert result["status"] == "ok"

    def test_duplicate_across_scopes(self):
        all_servers = [
            {"name": "my-server", "scope": "global"},
            {"name": "my-server", "scope": "project"},
        ]
        result = _check_duplicate_name("my-server", all_servers)
        assert result["status"] == "warn"
        assert "global" in result["message"]
        assert "project" in result["message"]

    def test_no_match(self):
        all_servers = [
            {"name": "other", "scope": "global"},
        ]
        result = _check_duplicate_name("missing", all_servers)
        assert result["status"] == "ok"


class TestCheckEmptyEnvValues:
    def test_no_env(self):
        result = _check_empty_env_values({"env": {}})
        assert result["status"] == "ok"

    def test_valid_env(self):
        result = _check_empty_env_values({"env": {"KEY": "value"}})
        assert result["status"] == "ok"

    def test_empty_value(self):
        result = _check_empty_env_values({"env": {"API_KEY": "", "OTHER": "fine"}})
        assert result["status"] == "warn"
        assert "API_KEY" in result["message"]
        assert "OTHER" not in result["message"]

    def test_multiple_empty(self):
        result = _check_empty_env_values({"env": {"A": "", "B": "", "C": "ok"}})
        assert result["status"] == "warn"
        assert "A" in result["message"]
        assert "B" in result["message"]


class TestCheckHttpUrlReachability:
    def test_skips_stdio(self):
        result = _check_http_url_reachability({"server_type": "stdio"})
        assert result["status"] == "ok"
        assert result["code"] == "URL_REACHABILITY_SKIPPED"

    def test_no_url(self):
        result = _check_http_url_reachability({"server_type": "http", "url": None})
        assert result["status"] == "warn"
        assert result["code"] == "URL_REACHABILITY_NO_URL"

    def test_unreachable_url(self):
        result = _check_http_url_reachability({
            "server_type": "http",
            "url": "http://192.0.2.1:1/mcp",  # RFC 5737 TEST-NET, guaranteed unreachable
        })
        assert result["status"] == "warn"
        assert result["code"] == "URL_REACHABILITY_FAILED"


class TestDiagnoseServerWithNewChecks:
    def test_includes_empty_env_check(self):
        server = {
            "server_type": "stdio",
            "command": "node",
            "args": [],
            "env": {"KEY": ""},
        }
        report = diagnose_server(server)
        codes = [c["code"] for c in report["checks"]]
        assert "ENV_EMPTY_VALUES" in codes
