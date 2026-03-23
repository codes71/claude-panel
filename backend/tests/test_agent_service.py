"""Tests for agent_service."""

import pytest

from claude_panel.services import agent_service

SAMPLE_AGENT = """\
---
name: Code Reviewer
description: Expert code reviewer
color: purple
emoji: eye
vibe: Reviews code like a mentor
model: sonnet
---

# Code Reviewer Agent

You are an expert code reviewer.
"""


class TestListAgents:
    def test_empty_agents(self, mock_settings):
        result = agent_service.list_agents()
        assert result["total_count"] == 0
        assert result["agents"] == []

    def test_with_agents(self, mock_settings):
        agents_dir = mock_settings.claude_home / "agents"
        (agents_dir / "reviewer.md").write_text(SAMPLE_AGENT)
        result = agent_service.list_agents()
        assert result["total_count"] == 1
        assert result["agents"][0]["name"] == "reviewer"
        assert result["agents"][0]["display_name"] == "Code Reviewer"
        assert result["agents"][0]["description"] == "Expert code reviewer"
        assert result["agents"][0]["color"] == "purple"
        assert result["agents"][0]["emoji"] == "eye"
        assert result["agents"][0]["model"] == "sonnet"

    def test_skips_readme(self, mock_settings):
        agents_dir = mock_settings.claude_home / "agents"
        (agents_dir / "README.md").write_text("# Agents")
        (agents_dir / "reviewer.md").write_text(SAMPLE_AGENT)
        result = agent_service.list_agents()
        assert result["total_count"] == 1

    def test_total_tokens(self, mock_settings):
        agents_dir = mock_settings.claude_home / "agents"
        (agents_dir / "reviewer.md").write_text(SAMPLE_AGENT)
        result = agent_service.list_agents()
        assert result["total_tokens"] > 0


class TestCrudAgents:
    def test_create_agent(self, mock_settings):
        result = agent_service.create_agent("reviewer", SAMPLE_AGENT)
        assert result["name"] == "reviewer"
        assert result["display_name"] == "Code Reviewer"
        assert result["description"] == "Expert code reviewer"
        assert result["content"] == SAMPLE_AGENT

    def test_create_duplicate_raises(self, mock_settings):
        agent_service.create_agent("reviewer", SAMPLE_AGENT)
        with pytest.raises(FileExistsError):
            agent_service.create_agent("reviewer", SAMPLE_AGENT)

    def test_read_agent(self, mock_settings):
        agent_service.create_agent("reviewer", SAMPLE_AGENT)
        result = agent_service.read_agent("reviewer")
        assert result["content"] == SAMPLE_AGENT
        assert result["display_name"] == "Code Reviewer"

    def test_read_missing_raises(self, mock_settings):
        with pytest.raises(FileNotFoundError):
            agent_service.read_agent("nope")

    def test_update_agent(self, mock_settings):
        agent_service.create_agent("reviewer", SAMPLE_AGENT)
        new_content = "---\nname: Updated\n---\nNew body"
        result = agent_service.update_agent("reviewer", new_content)
        assert result["content"] == new_content
        assert result["display_name"] == "Updated"

    def test_update_missing_raises(self, mock_settings):
        with pytest.raises(FileNotFoundError):
            agent_service.update_agent("nope", "content")

    def test_delete_agent(self, mock_settings):
        agent_service.create_agent("reviewer", SAMPLE_AGENT)
        result = agent_service.delete_agent("reviewer")
        assert result["deleted"] is True
        assert result["name"] == "reviewer"

    def test_delete_missing_raises(self, mock_settings):
        with pytest.raises(FileNotFoundError):
            agent_service.delete_agent("nope")

    def test_rename_agent(self, mock_settings):
        agent_service.create_agent("reviewer", SAMPLE_AGENT)
        result = agent_service.rename_agent("reviewer", "code-reviewer")
        assert result["name"] == "code-reviewer"
        assert result["content"] == SAMPLE_AGENT
        # Old file should be gone
        with pytest.raises(FileNotFoundError):
            agent_service.read_agent("reviewer")

    def test_rename_to_existing_raises(self, mock_settings):
        agent_service.create_agent("reviewer", SAMPLE_AGENT)
        agent_service.create_agent("other", "---\nname: Other\n---\nBody")
        with pytest.raises(FileExistsError):
            agent_service.rename_agent("reviewer", "other")

    def test_rename_missing_raises(self, mock_settings):
        with pytest.raises(FileNotFoundError):
            agent_service.rename_agent("nope", "new-name")

    def test_invalid_name_raises(self, mock_settings):
        with pytest.raises(ValueError, match="Invalid name"):
            agent_service.create_agent("bad name!", "content")

    def test_path_traversal_raises(self, mock_settings):
        with pytest.raises(ValueError):
            agent_service.read_agent("../etc/passwd")
