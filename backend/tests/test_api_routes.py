"""Integration tests for API routes using FastAPI TestClient."""

import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from ccm.main import create_app


@pytest.fixture()
def client(mock_settings):
    with patch("ccm.services.instance_service.load_persisted_instance", return_value=None):
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
