"""Tests for claude_md_service."""

from pathlib import Path

import pytest

from claude_panel.services import claude_md_service


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


class TestClaudeMdCache:
    """Tests for the server-side scan cache."""

    def _invalidate(self):
        """Reset module-level cache between tests."""
        claude_md_service._cache_invalidate()

    def test_cache_returns_same_result_on_second_call(self, mock_settings, monkeypatch, tmp_path):
        """Second call should return cached result without re-scanning."""
        self._invalidate()
        project = tmp_path / "proj"
        project.mkdir()
        (project / "CLAUDE.md").write_text("# cached", encoding="utf-8")
        monkeypatch.setattr(mock_settings, "scan_roots", [tmp_path])

        first = claude_md_service.list_claude_md_files()
        second = claude_md_service.list_claude_md_files()
        assert first is second  # same object = cache hit

    def test_write_invalidates_cache(self, mock_settings, monkeypatch, tmp_path):
        """Writing a CLAUDE.md file should clear the cache."""
        self._invalidate()
        md = mock_settings.claude_home / "CLAUDE.md"
        md.write_text("old", encoding="utf-8")
        monkeypatch.setattr(mock_settings, "scan_roots", [mock_settings.claude_home])

        first = claude_md_service.list_claude_md_files()
        claude_md_service.write_claude_md(str(md), "new content")
        after_write = claude_md_service.list_claude_md_files()
        assert first is not after_write  # different object = cache was cleared

    def test_create_invalidates_cache(self, mock_settings, monkeypatch, tmp_path):
        """Creating a CLAUDE.md file should clear the cache."""
        self._invalidate()
        monkeypatch.setattr(mock_settings, "scan_roots", [tmp_path])

        claude_md_service.list_claude_md_files()
        new_path = tmp_path / "new-proj" / "CLAUDE.md"
        claude_md_service.create_claude_md(str(new_path), "# new")
        after_create = claude_md_service.list_claude_md_files()
        assert any(str(new_path.resolve()) in f["path"] for f in after_create["files"])

    def test_delete_invalidates_cache(self, mock_settings, monkeypatch, tmp_path):
        """Deleting a CLAUDE.md file should clear the cache."""
        self._invalidate()
        project = tmp_path / "doomed"
        project.mkdir()
        md = project / "CLAUDE.md"
        md.write_text("goodbye", encoding="utf-8")
        monkeypatch.setattr(mock_settings, "scan_roots", [tmp_path])

        first = claude_md_service.list_claude_md_files()
        assert any("doomed" in f["path"] for f in first["files"])

        claude_md_service.delete_claude_md(str(md))
        after_delete = claude_md_service.list_claude_md_files()
        assert not any("doomed" in f["path"] for f in after_delete["files"])

    def test_instance_switch_invalidates_cache(self, mock_settings, monkeypatch, tmp_path):
        """Switching instances must clear the cache so the new instance's files are returned."""
        from claude_panel.services import instance_service

        self._invalidate()

        # Instance A has a CLAUDE.md
        instance_a = mock_settings.claude_home
        (instance_a / "CLAUDE.md").write_text("# instance A", encoding="utf-8")
        monkeypatch.setattr(mock_settings, "scan_roots", [])  # default: scan claude_home parent

        result_a = claude_md_service.list_claude_md_files()
        paths_a = [f["path"] for f in result_a["files"]]
        assert any("# instance A" in Path(p).read_text() for p in paths_a if Path(p).exists())

        # Instance B — different directory, different CLAUDE.md
        instance_b = tmp_path / ".claude-b"
        instance_b.mkdir()
        (instance_b / ".credentials.json").write_text("{}")
        (instance_b / "backups" / "claude-panel").mkdir(parents=True)
        (instance_b / "CLAUDE.md").write_text("# instance B", encoding="utf-8")

        instance_service.switch_instance(str(instance_b))
        monkeypatch.setattr(mock_settings, "scan_roots", [])

        result_b = claude_md_service.list_claude_md_files()
        paths_b = [f["path"] for f in result_b["files"]]
        # Must see instance B's file, not instance A's cached result
        assert any("# instance B" in Path(p).read_text() for p in paths_b if Path(p).exists())
        assert result_a is not result_b


class TestClaudeMdDrift:
    def test_list_drift_events_shape(self, mock_settings):
        from claude_panel.services import claude_md_drift_service

        data = claude_md_drift_service.list_drift_events()
        assert "events" in data
        assert isinstance(data["events"], list)
        assert "cursor" in data
        assert "generated_at" in data
