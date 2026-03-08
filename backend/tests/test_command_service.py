"""Tests for command_service."""

import pytest

from claude_panel.services import command_service


class TestListCommands:
    def test_empty_commands(self, mock_settings):
        result = command_service.list_commands()
        assert result["total_count"] == 0
        assert result["commands"] == []

    def test_with_commands(self, mock_settings):
        cmds_dir = mock_settings.claude_home / "commands"
        (cmds_dir / "hello.md").write_text("---\ndescription: Say hello\n---\nHello!")
        result = command_service.list_commands()
        assert result["total_count"] == 1
        assert result["commands"][0]["name"] == "hello"
        assert result["commands"][0]["description"] == "Say hello"

    def test_namespaced_commands(self, mock_settings):
        cmds_dir = mock_settings.claude_home / "commands"
        ns_dir = cmds_dir / "sc"
        ns_dir.mkdir()
        (ns_dir / "load.md").write_text("---\ndescription: Load skill\n---\nLoad it.")
        result = command_service.list_commands()
        assert result["total_count"] == 1
        assert result["commands"][0]["namespace"] == "sc"
        assert result["commands"][0]["qualified_name"] == "sc:load"


class TestCrudCommands:
    def test_create_command(self, mock_settings):
        result = command_service.create_command("", "greet", "---\ndescription: Greet\n---\nHi")
        assert result["name"] == "greet"
        assert result["description"] == "Greet"

    def test_create_duplicate_raises(self, mock_settings):
        command_service.create_command("", "greet", "Hi")
        with pytest.raises(FileExistsError):
            command_service.create_command("", "greet", "Hi again")

    def test_read_command(self, mock_settings):
        command_service.create_command("", "greet", "Hello content")
        result = command_service.read_command("", "greet")
        assert result["content"] == "Hello content"

    def test_read_missing_raises(self, mock_settings):
        with pytest.raises(FileNotFoundError):
            command_service.read_command("", "nope")

    def test_update_command(self, mock_settings):
        command_service.create_command("", "greet", "old content")
        result = command_service.update_command("", "greet", "new content")
        assert result["content"] == "new content"

    def test_delete_command(self, mock_settings):
        command_service.create_command("", "greet", "Hi")
        result = command_service.delete_command("", "greet")
        assert result["deleted"] is True

    def test_delete_missing_raises(self, mock_settings):
        with pytest.raises(FileNotFoundError):
            command_service.delete_command("", "nope")

    def test_invalid_name_raises(self, mock_settings):
        with pytest.raises(ValueError, match="Invalid name"):
            command_service.create_command("", "bad name!", "content")


class TestParseFrontmatter:
    def test_valid_frontmatter(self):
        result = command_service._parse_frontmatter("---\ndescription: test\ncategory: util\n---\nBody")
        assert result["description"] == "test"
        assert result["category"] == "util"

    def test_no_frontmatter(self):
        result = command_service._parse_frontmatter("Just some text")
        assert result == {}

    def test_empty_frontmatter(self):
        result = command_service._parse_frontmatter("---\n---\nBody")
        assert result == {}
