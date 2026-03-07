"""Tests for claude_md_service."""

import pytest

from ccm.services import claude_md_service


class TestReadClaudeMd:
    def test_read_existing(self, mock_settings):
        md = mock_settings.claude_home / "CLAUDE.md"
        md.write_text("# Test content")
        result = claude_md_service.read_claude_md(str(md))
        assert result["content"] == "# Test content"
        assert result["size_bytes"] > 0

    def test_read_missing(self, mock_settings):
        with pytest.raises(FileNotFoundError):
            claude_md_service.read_claude_md("/nonexistent/CLAUDE.md")


class TestWriteClaudeMd:
    def test_write(self, mock_settings):
        md = mock_settings.claude_home / "CLAUDE.md"
        md.write_text("old")
        result = claude_md_service.write_claude_md(str(md), "new content")
        assert result["size_bytes"] > 0
        assert md.read_text() == "new content"

    def test_write_non_claude_md(self, mock_settings):
        with pytest.raises(ValueError, match="CLAUDE.md"):
            claude_md_service.write_claude_md("/tmp/other.txt", "content")


class TestCreateClaudeMd:
    def test_create(self, mock_settings):
        path = mock_settings.claude_home / "projects" / "new" / "CLAUDE.md"
        result = claude_md_service.create_claude_md(str(path), "hello")
        assert path.exists()
        assert path.read_text() == "hello"

    def test_create_existing(self, mock_settings):
        md = mock_settings.claude_home / "CLAUDE.md"
        md.write_text("exists")
        with pytest.raises(FileExistsError):
            claude_md_service.create_claude_md(str(md), "new")

    def test_create_non_claude_md(self, mock_settings):
        with pytest.raises(ValueError, match="CLAUDE.md"):
            claude_md_service.create_claude_md("/tmp/other.txt", "content")


class TestListClaudeMd:
    def test_list_includes_issues_and_scan_roots(self, mock_settings, monkeypatch, tmp_path):
        project = tmp_path / "project-a"
        project.mkdir(parents=True, exist_ok=True)
        md = project / "CLAUDE.md"
        md.write_text("", encoding="utf-8")

        monkeypatch.setattr(mock_settings, "scan_roots", [tmp_path])
        data = claude_md_service.list_claude_md_files()

        assert "issues" in data
        assert isinstance(data["issues"], list)
        assert "scan_roots" in data
        assert str(tmp_path) in data["scan_roots"]
        assert any(i["code"] == "EMPTY" and i["path"] == str(md.resolve()) for i in data["issues"])


class TestClaudeMdDrift:
    def test_list_drift_events_shape(self, mock_settings):
        from ccm.services import claude_md_drift_service

        data = claude_md_drift_service.list_drift_events()
        assert "events" in data
        assert isinstance(data["events"], list)
        assert "cursor" in data
        assert "generated_at" in data
