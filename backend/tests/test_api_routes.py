"""Integration tests for API routes using FastAPI TestClient."""

import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from claude_panel.main import create_app


@pytest.fixture()
def client(mock_settings):
    with patch("claude_panel.services.instance_service.load_persisted_instance", return_value=None):
        app = create_app()
        with TestClient(app) as c:
            yield c


class TestHealthEndpoint:
    def test_health(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200


class TestSettingsEndpoints:
    def test_get_settings(self, client):
        response = client.get("/api/settings")
        assert response.status_code == 200
        data = response.json()
        assert "env" in data

    def test_patch_settings(self, client):
        response = client.patch("/api/settings", json={"newKey": "newVal"})
        assert response.status_code == 200

    def test_get_env_vars(self, client):
        response = client.get("/api/settings/env")
        assert response.status_code == 200
        data = response.json()
        assert data["MY_VAR"] == "hello"

    def test_update_env_vars(self, client):
        response = client.put(
            "/api/settings/env",
            json=[{"key": "NEW", "value": "val"}],
        )
        assert response.status_code == 200


class TestInstanceEndpoints:
    def test_list_instances(self, client):
        response = client.get("/api/instances")
        assert response.status_code == 200
        data = response.json()
        assert "instances" in data

    def test_get_active_instance(self, client):
        response = client.get("/api/instances/active")
        assert response.status_code == 200

    def test_switch_to_invalid_path(self, client):
        response = client.post("/api/instances/switch", json={"path": "/nonexistent/path"})
        assert response.status_code == 400


class TestCommandEndpoints:
    def test_list_commands(self, client):
        response = client.get("/api/commands")
        assert response.status_code == 200
        data = response.json()
        assert "commands" in data
        assert "total_count" in data


class TestClaudeMdEndpoints:
    def test_list_claude_md_includes_issues_and_scan_roots(
        self, client, mock_settings, monkeypatch, tmp_path
    ):
        project = tmp_path / "project-b"
        project.mkdir(parents=True, exist_ok=True)
        (project / "CLAUDE.md").write_text("", encoding="utf-8")

        monkeypatch.setattr(mock_settings, "scan_roots", [tmp_path])
        response = client.get("/api/claude-md")
        assert response.status_code == 200
        data = response.json()
        assert "issues" in data
        assert isinstance(data["issues"], list)
        assert "scan_roots" in data
        assert str(tmp_path) in data["scan_roots"]

    def test_get_claude_md_drift(self, client):
        response = client.get("/api/claude-md/drift")
        assert response.status_code == 200
        data = response.json()
        assert "events" in data
        assert isinstance(data["events"], list)
        assert "cursor" in data
        assert "generated_at" in data


class TestMcpEndpoints:
    def test_list_mcp_servers_includes_project_scope(self, client, mock_settings):
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

        response = client.get("/api/mcp")
        assert response.status_code == 200
        data = response.json()
        assert len(data["servers"]) == 2
        assert any(
            s["name"] == "project-server"
            and s["scope"] == "project"
            and s["project_path"] == "/tmp/project-a"
            for s in data["servers"]
        )

    def test_get_mcp_diagnostics(self, client):
        response = client.get("/api/mcp/diagnostics")
        assert response.status_code == 200
        data = response.json()
        assert "servers" in data
        assert isinstance(data["servers"], list)

    def test_get_mcp_server_diagnose(self, client):
        response = client.get("/api/mcp/test-server/diagnose")
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "test-server"
        assert "checks" in data

    def test_get_mcp_health_history(self, client):
        response = client.get("/api/mcp/health")
        assert response.status_code == 200
        data = response.json()
        assert "servers" in data


class TestSkillProviderEndpoints:
    def test_get_skill_provider_provenance(self, client):
        response = client.get("/api/skill-providers/provenance")
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data


class TestTransferEndpoints:
    def test_preview_transfer_empty(self, client, mock_settings, tmp_path):
        source = tmp_path / ".claude-a"
        target = tmp_path / ".claude-b"
        source.mkdir()
        target.mkdir()

        response = client.post("/api/instances/transfers/preview", json={
            "source_path": str(source),
            "target_path": str(target),
            "commands": [],
            "plugins": [],
            "mcp_servers": [],
            "agents": [],
        })
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert data["summary"]["commands"]["selected"] == 0

    def test_preview_transfer_with_commands(self, client, mock_settings, tmp_path):
        source = tmp_path / ".claude-a"
        target = tmp_path / ".claude-b"
        source.mkdir()
        target.mkdir()
        (source / "commands").mkdir()
        (source / "commands" / "hello.md").write_text("content", encoding="utf-8")

        response = client.post("/api/instances/transfers/preview", json={
            "source_path": str(source),
            "target_path": str(target),
            "commands": [{"namespace": "", "name": "hello"}],
            "plugins": [],
            "mcp_servers": [],
            "agents": [],
        })
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["commands"]["new"] == 1

    def test_apply_transfer_rejects_same_instance(self, client, mock_settings, tmp_path):
        inst = tmp_path / ".claude-a"
        inst.mkdir()

        response = client.post("/api/instances/transfers/apply", json={
            "source_path": str(inst),
            "target_path": str(inst),
            "commands": [],
            "plugins": [],
            "mcp_servers": [],
            "agents": [],
            "conflict_mode": "skip",
        })
        assert response.status_code == 400

    def test_apply_transfer_copies_command(self, client, mock_settings, tmp_path):
        source = tmp_path / ".claude-a"
        target = tmp_path / ".claude-b"
        source.mkdir()
        target.mkdir()
        (source / "commands").mkdir()
        (target / "commands").mkdir()
        (source / "commands" / "greet.md").write_text("hi", encoding="utf-8")

        response = client.post("/api/instances/transfers/apply", json={
            "source_path": str(source),
            "target_path": str(target),
            "commands": [{"namespace": "", "name": "greet"}],
            "plugins": [],
            "mcp_servers": [],
            "agents": [],
            "conflict_mode": "skip",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["commands"][0]["action"] == "copied"
        assert (target / "commands" / "greet.md").read_text(encoding="utf-8") == "hi"

    def test_apply_transfer_with_agents(self, client, mock_settings, tmp_path):
        source = tmp_path / ".claude-a"
        target = tmp_path / ".claude-b"
        source.mkdir()
        target.mkdir()
        (source / "agents").mkdir()
        (target / "agents").mkdir()
        (source / "agents" / "helper.md").write_text("agent content", encoding="utf-8")

        response = client.post("/api/instances/transfers/apply", json={
            "source_path": str(source),
            "target_path": str(target),
            "commands": [],
            "plugins": [],
            "mcp_servers": [],
            "agents": [{"name": "helper"}],
            "conflict_mode": "skip",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["agents"][0]["action"] == "copied"


class TestConfigBundleEndpoints:
    def test_export_config_bundle(self, client):
        response = client.get("/api/config-bundle/export")
        assert response.status_code == 200
        data = response.json()
        assert "bundle" in data

    def test_validate_config_bundle(self, client):
        response = client.post("/api/config-bundle/validate", json={"bundle": {}})
        assert response.status_code == 200
        data = response.json()
        assert "errors" in data

    def test_apply_config_bundle_dry_run(self, client):
        response = client.post(
            "/api/config-bundle/apply",
            json={"bundle": {"version": 1}, "dry_run": True},
        )
        assert response.status_code == 200
        data = response.json()
        assert "applied" in data
        assert "changes" in data
