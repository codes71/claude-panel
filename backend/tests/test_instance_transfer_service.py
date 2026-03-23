"""Tests for cross-instance transfer service."""

import json

import pytest

from claude_panel.services import instance_transfer_service
from claude_panel.services.instance_paths import (
    backup_dir_for,
    claude_json_path_for,
    commands_dir_for,
    agents_dir_for,
)
from claude_panel.services import backup


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def transfer_pair(tmp_path):
    """Create source and target instance directories."""
    source = tmp_path / ".claude-source"
    target = tmp_path / ".claude-target"
    for inst in (source, target):
        inst.mkdir()
        (inst / "commands").mkdir()
        (inst / "agents").mkdir()
        (inst / "plugins").mkdir()
        (inst / "plugins" / "cache").mkdir()
    return source, target


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

class TestValidation:
    def test_preview_rejects_same_source_and_target(self, transfer_pair):
        source, _ = transfer_pair
        with pytest.raises(ValueError, match="Source and target instances must be different"):
            instance_transfer_service.preview_transfer(
                source_path=str(source),
                target_path=str(source),
            )

    def test_apply_rejects_same_source_and_target(self, transfer_pair):
        source, _ = transfer_pair
        with pytest.raises(ValueError, match="Source and target instances must be different"):
            instance_transfer_service.apply_transfer(
                source_path=str(source),
                target_path=str(source),
            )

    def test_preview_rejects_nonexistent_source(self, tmp_path, transfer_pair):
        _, target = transfer_pair
        with pytest.raises(FileNotFoundError, match="Source instance not found"):
            instance_transfer_service.preview_transfer(
                source_path=str(tmp_path / "nonexistent"),
                target_path=str(target),
            )

    def test_apply_rejects_invalid_conflict_mode(self, transfer_pair):
        source, target = transfer_pair
        with pytest.raises(ValueError, match="Invalid conflict_mode"):
            instance_transfer_service.apply_transfer(
                source_path=str(source),
                target_path=str(target),
                conflict_mode="invalid",
            )

    def test_preview_returns_zeroed_summaries(self, transfer_pair):
        source, target = transfer_pair
        result = instance_transfer_service.preview_transfer(
            source_path=str(source),
            target_path=str(target),
        )
        assert result.summary.commands.selected == 0
        assert result.summary.plugins.selected == 0
        assert result.summary.mcp_servers.selected == 0
        assert result.summary.agents.selected == 0


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

class TestCommandTransfer:
    def test_preview_command_new(self, transfer_pair):
        source, target = transfer_pair
        (source / "commands" / "hello.md").write_text("# Hello", encoding="utf-8")

        result = instance_transfer_service.preview_transfer(
            source_path=str(source),
            target_path=str(target),
            commands=[{"namespace": "", "name": "hello"}],
        )
        assert result.commands[0].status == "new"
        assert result.summary.commands.new == 1

    def test_preview_command_noop(self, transfer_pair):
        source, target = transfer_pair
        content = "# Hello"
        (source / "commands" / "hello.md").write_text(content, encoding="utf-8")
        (target / "commands" / "hello.md").write_text(content, encoding="utf-8")

        result = instance_transfer_service.preview_transfer(
            source_path=str(source),
            target_path=str(target),
            commands=[{"namespace": "", "name": "hello"}],
        )
        assert result.commands[0].status == "noop"

    def test_preview_command_conflict(self, transfer_pair):
        source, target = transfer_pair
        (source / "commands" / "hello.md").write_text("source body", encoding="utf-8")
        (target / "commands" / "hello.md").write_text("target body", encoding="utf-8")

        result = instance_transfer_service.preview_transfer(
            source_path=str(source),
            target_path=str(target),
            commands=[{"namespace": "", "name": "hello"}],
        )
        assert result.commands[0].status == "conflict"
        assert result.summary.commands.conflict == 1

    def test_preview_namespaced_command_conflict(self, transfer_pair):
        source, target = transfer_pair
        (source / "commands" / "sc").mkdir()
        (target / "commands" / "sc").mkdir()
        (source / "commands" / "sc" / "load.md").write_text("source body", encoding="utf-8")
        (target / "commands" / "sc" / "load.md").write_text("target body", encoding="utf-8")

        result = instance_transfer_service.preview_transfer(
            source_path=str(source),
            target_path=str(target),
            commands=[{"namespace": "sc", "name": "load"}],
        )
        assert result.commands[0].status == "conflict"
        assert result.commands[0].name == "sc:load"

    def test_apply_command_copies_new(self, transfer_pair):
        source, target = transfer_pair
        (source / "commands" / "hello.md").write_text("# Hello", encoding="utf-8")

        result = instance_transfer_service.apply_transfer(
            source_path=str(source),
            target_path=str(target),
            commands=[{"namespace": "", "name": "hello"}],
        )
        assert result.commands[0].action == "copied"
        assert (target / "commands" / "hello.md").read_text(encoding="utf-8") == "# Hello"

    def test_apply_command_skips_conflict_by_default(self, transfer_pair):
        source, target = transfer_pair
        (source / "commands" / "hello.md").write_text("source", encoding="utf-8")
        (target / "commands" / "hello.md").write_text("target", encoding="utf-8")

        result = instance_transfer_service.apply_transfer(
            source_path=str(source),
            target_path=str(target),
            commands=[{"namespace": "", "name": "hello"}],
            conflict_mode="skip",
        )
        assert result.commands[0].action == "skipped"
        assert (target / "commands" / "hello.md").read_text(encoding="utf-8") == "target"

    def test_apply_command_overwrites_conflict(self, transfer_pair):
        source, target = transfer_pair
        (source / "commands" / "hello.md").write_text("source body", encoding="utf-8")
        (target / "commands" / "hello.md").write_text("target body", encoding="utf-8")

        result = instance_transfer_service.apply_transfer(
            source_path=str(source),
            target_path=str(target),
            commands=[{"namespace": "", "name": "hello"}],
            conflict_mode="overwrite",
        )
        assert result.commands[0].action == "overwritten"
        assert (target / "commands" / "hello.md").read_text(encoding="utf-8") == "source body"

    def test_apply_command_creates_namespace_dir(self, transfer_pair):
        source, target = transfer_pair
        (source / "commands" / "sc").mkdir()
        (source / "commands" / "sc" / "load.md").write_text("content", encoding="utf-8")

        result = instance_transfer_service.apply_transfer(
            source_path=str(source),
            target_path=str(target),
            commands=[{"namespace": "sc", "name": "load"}],
        )
        assert result.commands[0].action == "copied"
        assert (target / "commands" / "sc" / "load.md").exists()


# ---------------------------------------------------------------------------
# Agents
# ---------------------------------------------------------------------------

class TestAgentTransfer:
    def test_preview_agent_new(self, transfer_pair):
        source, target = transfer_pair
        (source / "agents" / "researcher.md").write_text("---\nname: Researcher\n---\nbody", encoding="utf-8")

        result = instance_transfer_service.preview_transfer(
            source_path=str(source),
            target_path=str(target),
            agents=[{"name": "researcher"}],
        )
        assert result.agents[0].status == "new"
        assert result.summary.agents.new == 1

    def test_preview_agent_noop(self, transfer_pair):
        source, target = transfer_pair
        content = "---\nname: Researcher\n---\nbody"
        (source / "agents" / "researcher.md").write_text(content, encoding="utf-8")
        (target / "agents" / "researcher.md").write_text(content, encoding="utf-8")

        result = instance_transfer_service.preview_transfer(
            source_path=str(source),
            target_path=str(target),
            agents=[{"name": "researcher"}],
        )
        assert result.agents[0].status == "noop"

    def test_preview_agent_conflict(self, transfer_pair):
        source, target = transfer_pair
        (source / "agents" / "researcher.md").write_text("source version", encoding="utf-8")
        (target / "agents" / "researcher.md").write_text("target version", encoding="utf-8")

        result = instance_transfer_service.preview_transfer(
            source_path=str(source),
            target_path=str(target),
            agents=[{"name": "researcher"}],
        )
        assert result.agents[0].status == "conflict"
        assert result.summary.agents.conflict == 1

    def test_apply_agent_copies_new(self, transfer_pair):
        source, target = transfer_pair
        content = "---\nname: Researcher\n---\nbody"
        (source / "agents" / "researcher.md").write_text(content, encoding="utf-8")

        result = instance_transfer_service.apply_transfer(
            source_path=str(source),
            target_path=str(target),
            agents=[{"name": "researcher"}],
        )
        assert result.agents[0].action == "copied"
        assert (target / "agents" / "researcher.md").read_text(encoding="utf-8") == content

    def test_apply_agent_skips_conflict_by_default(self, transfer_pair):
        source, target = transfer_pair
        (source / "agents" / "researcher.md").write_text("source", encoding="utf-8")
        (target / "agents" / "researcher.md").write_text("target", encoding="utf-8")

        result = instance_transfer_service.apply_transfer(
            source_path=str(source),
            target_path=str(target),
            agents=[{"name": "researcher"}],
            conflict_mode="skip",
        )
        assert result.agents[0].action == "skipped"
        assert (target / "agents" / "researcher.md").read_text(encoding="utf-8") == "target"

    def test_apply_agent_overwrites_conflict(self, transfer_pair):
        source, target = transfer_pair
        (source / "agents" / "researcher.md").write_text("source", encoding="utf-8")
        (target / "agents" / "researcher.md").write_text("target", encoding="utf-8")

        result = instance_transfer_service.apply_transfer(
            source_path=str(source),
            target_path=str(target),
            agents=[{"name": "researcher"}],
            conflict_mode="overwrite",
        )
        assert result.agents[0].action == "overwritten"
        assert (target / "agents" / "researcher.md").read_text(encoding="utf-8") == "source"

    def test_apply_agent_creates_backup(self, transfer_pair):
        source, target = transfer_pair
        (source / "agents" / "researcher.md").write_text("new", encoding="utf-8")
        (target / "agents" / "researcher.md").write_text("old", encoding="utf-8")

        instance_transfer_service.apply_transfer(
            source_path=str(source),
            target_path=str(target),
            agents=[{"name": "researcher"}],
            conflict_mode="overwrite",
        )
        bdir = backup_dir_for(target)
        assert any(bdir.glob("researcher.md.*.bak"))


# ---------------------------------------------------------------------------
# MCP Servers
# ---------------------------------------------------------------------------

class TestMcpTransfer:
    def _write_claude_json(self, instance, data, tmp_path):
        """Write .claude.json for an instance."""
        path = claude_json_path_for(instance)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data), encoding="utf-8")

    def test_preview_mcp_new(self, transfer_pair, tmp_path):
        source, target = transfer_pair
        self._write_claude_json(source, {
            "mcpServers": {"my-server": {"command": "node", "args": ["s.js"]}},
        }, tmp_path)
        self._write_claude_json(target, {}, tmp_path)

        result = instance_transfer_service.preview_transfer(
            source_path=str(source),
            target_path=str(target),
            mcp_servers=[{"name": "my-server"}],
        )
        assert result.mcp_servers[0].status == "new"

    def test_preview_mcp_noop(self, transfer_pair, tmp_path):
        source, target = transfer_pair
        config = {"command": "node", "args": ["s.js"]}
        self._write_claude_json(source, {"mcpServers": {"my-server": config}}, tmp_path)
        self._write_claude_json(target, {"mcpServers": {"my-server": config}}, tmp_path)

        result = instance_transfer_service.preview_transfer(
            source_path=str(source),
            target_path=str(target),
            mcp_servers=[{"name": "my-server"}],
        )
        assert result.mcp_servers[0].status == "noop"

    def test_preview_mcp_conflict(self, transfer_pair, tmp_path):
        source, target = transfer_pair
        self._write_claude_json(source, {
            "mcpServers": {"my-server": {"command": "node", "args": ["src.js"]}},
        }, tmp_path)
        self._write_claude_json(target, {
            "mcpServers": {"my-server": {"command": "node", "args": ["tgt.js"]}},
        }, tmp_path)

        result = instance_transfer_service.preview_transfer(
            source_path=str(source),
            target_path=str(target),
            mcp_servers=[{"name": "my-server"}],
        )
        assert result.mcp_servers[0].status == "conflict"

    def test_preview_mcp_ignores_project_scoped(self, transfer_pair, tmp_path):
        """Only root mcpServers should be in scope, not project-scoped ones."""
        source, target = transfer_pair
        self._write_claude_json(source, {
            "mcpServers": {"global-server": {"command": "node", "args": ["a.js"]}},
            "projects": {"/tmp/p": {"mcpServers": {"project-server": {"url": "https://x"}}}},
        }, tmp_path)

        # Request only global-server — project-server is out of scope
        result = instance_transfer_service.preview_transfer(
            source_path=str(source),
            target_path=str(target),
            mcp_servers=[{"name": "global-server"}],
        )
        assert len(result.mcp_servers) == 1
        assert result.mcp_servers[0].name == "global-server"

    def test_apply_mcp_copies_new(self, transfer_pair, tmp_path):
        source, target = transfer_pair
        src_config = {"command": "node", "args": ["s.js"]}
        self._write_claude_json(source, {"mcpServers": {"my-server": src_config}}, tmp_path)
        self._write_claude_json(target, {}, tmp_path)

        result = instance_transfer_service.apply_transfer(
            source_path=str(source),
            target_path=str(target),
            mcp_servers=[{"name": "my-server"}],
        )
        assert result.mcp_servers[0].action == "copied"

        # Verify the target .claude.json now has the server
        tgt_data = json.loads(claude_json_path_for(target).read_text(encoding="utf-8"))
        assert tgt_data["mcpServers"]["my-server"] == src_config

    def test_apply_mcp_preserves_other_keys(self, transfer_pair, tmp_path):
        source, target = transfer_pair
        self._write_claude_json(source, {
            "mcpServers": {"new-server": {"command": "node"}},
        }, tmp_path)
        self._write_claude_json(target, {
            "mcpServers": {"existing": {"command": "python"}},
            "projects": {"/p": {"mcpServers": {"ps": {"url": "https://x"}}}},
            "someOtherKey": "value",
        }, tmp_path)

        instance_transfer_service.apply_transfer(
            source_path=str(source),
            target_path=str(target),
            mcp_servers=[{"name": "new-server"}],
        )

        tgt_data = json.loads(claude_json_path_for(target).read_text(encoding="utf-8"))
        assert tgt_data["projects"] == {"/p": {"mcpServers": {"ps": {"url": "https://x"}}}}
        assert tgt_data["someOtherKey"] == "value"
        assert "existing" in tgt_data["mcpServers"]
        assert "new-server" in tgt_data["mcpServers"]

    def test_apply_mcp_overwrite_replaces_config(self, transfer_pair, tmp_path):
        source, target = transfer_pair
        self._write_claude_json(source, {
            "mcpServers": {"my-server": {"command": "node", "args": ["new.js"]}},
        }, tmp_path)
        self._write_claude_json(target, {
            "mcpServers": {"my-server": {"command": "node", "args": ["old.js"]}},
        }, tmp_path)

        result = instance_transfer_service.apply_transfer(
            source_path=str(source),
            target_path=str(target),
            mcp_servers=[{"name": "my-server"}],
            conflict_mode="overwrite",
        )
        assert result.mcp_servers[0].action == "overwritten"

        tgt_data = json.loads(claude_json_path_for(target).read_text(encoding="utf-8"))
        assert tgt_data["mcpServers"]["my-server"]["args"] == ["new.js"]


# ---------------------------------------------------------------------------
# Plugins
# ---------------------------------------------------------------------------

class TestPluginTransfer:
    def test_preview_plugin_new(self, transfer_pair):
        source, target = transfer_pair
        (source / "plugins" / "my-plugin").mkdir()

        result = instance_transfer_service.preview_transfer(
            source_path=str(source),
            target_path=str(target),
            plugins=[{"plugin_id": "my-plugin"}],
        )
        assert result.plugins[0].status == "new"

    def test_preview_plugin_noop(self, transfer_pair):
        source, target = transfer_pair
        (source / "plugins" / "my-plugin").mkdir()
        (target / "plugins" / "my-plugin").mkdir()

        result = instance_transfer_service.preview_transfer(
            source_path=str(source),
            target_path=str(target),
            plugins=[{"plugin_id": "my-plugin"}],
        )
        assert result.plugins[0].status == "noop"

    def test_apply_plugin_calls_cli_with_target_env(self, transfer_pair, monkeypatch):
        source, target = transfer_pair
        (source / "plugins" / "my-plugin").mkdir()

        calls = []

        def fake_run(cmd, **kwargs):
            calls.append(kwargs.get("env", {}).get("CLAUDE_CONFIG_DIR"))
            from types import SimpleNamespace
            return SimpleNamespace(returncode=0, stdout="ok", stderr="")

        import subprocess
        monkeypatch.setattr(subprocess, "run", fake_run)

        result = instance_transfer_service.apply_transfer(
            source_path=str(source),
            target_path=str(target),
            plugins=[{"plugin_id": "my-plugin"}],
        )
        assert result.plugins[0].action == "copied"
        assert calls == [str(target)]

    def test_apply_plugin_skips_already_installed(self, transfer_pair):
        source, target = transfer_pair
        (source / "plugins" / "my-plugin").mkdir()
        (target / "plugins" / "my-plugin").mkdir()

        result = instance_transfer_service.apply_transfer(
            source_path=str(source),
            target_path=str(target),
            plugins=[{"plugin_id": "my-plugin"}],
        )
        assert result.plugins[0].action == "skipped"


# ---------------------------------------------------------------------------
# Backup helpers (instance_paths + backup_at)
# ---------------------------------------------------------------------------

class TestBackupHelpers:
    def test_safe_write_text_at_creates_backup(self, tmp_path):
        target_file = tmp_path / "commands" / "hello.md"
        target_file.parent.mkdir(parents=True)
        target_file.write_text("old", encoding="utf-8")
        bdir = tmp_path / "backups" / "claude-panel"

        backup.safe_write_text_at(target_file, "new", bdir)

        assert target_file.read_text(encoding="utf-8") == "new"
        assert any(bdir.glob("hello.md.*.bak"))

    def test_safe_write_text_at_creates_file_if_missing(self, tmp_path):
        target_file = tmp_path / "commands" / "hello.md"
        bdir = tmp_path / "backups" / "claude-panel"

        backup.safe_write_text_at(target_file, "new content", bdir)

        assert target_file.read_text(encoding="utf-8") == "new content"

    def test_safe_write_json_at_creates_backup(self, tmp_path):
        target_file = tmp_path / ".claude.json"
        target_file.write_text('{"old": true}', encoding="utf-8")
        bdir = tmp_path / "backups" / "claude-panel"

        backup.safe_write_json_at(target_file, {"new": True}, bdir)

        data = json.loads(target_file.read_text(encoding="utf-8"))
        assert data == {"new": True}
        assert any(bdir.glob(".claude.json.*.bak"))


# ---------------------------------------------------------------------------
# Mixed transfer (all categories)
# ---------------------------------------------------------------------------

class TestMixedTransfer:
    def test_preview_all_categories(self, transfer_pair, tmp_path):
        source, target = transfer_pair
        (source / "commands" / "hello.md").write_text("cmd", encoding="utf-8")
        (source / "agents" / "researcher.md").write_text("agent", encoding="utf-8")
        (source / "plugins" / "my-plugin").mkdir()

        # Write MCP config
        src_json = claude_json_path_for(source)
        src_json.parent.mkdir(parents=True, exist_ok=True)
        src_json.write_text(json.dumps({
            "mcpServers": {"srv": {"command": "node"}},
        }), encoding="utf-8")

        result = instance_transfer_service.preview_transfer(
            source_path=str(source),
            target_path=str(target),
            commands=[{"namespace": "", "name": "hello"}],
            agents=[{"name": "researcher"}],
            plugins=[{"plugin_id": "my-plugin"}],
            mcp_servers=[{"name": "srv"}],
        )

        assert result.summary.commands.new == 1
        assert result.summary.agents.new == 1
        assert result.summary.plugins.new == 1
        assert result.summary.mcp_servers.new == 1

    def test_apply_summary_counts(self, transfer_pair):
        source, target = transfer_pair
        (source / "commands" / "a.md").write_text("a", encoding="utf-8")
        (source / "commands" / "b.md").write_text("b", encoding="utf-8")
        (target / "commands" / "b.md").write_text("b", encoding="utf-8")  # noop

        result = instance_transfer_service.apply_transfer(
            source_path=str(source),
            target_path=str(target),
            commands=[
                {"namespace": "", "name": "a"},
                {"namespace": "", "name": "b"},
            ],
        )
        assert result.summary.copied == 1
        assert result.summary.skipped == 1
