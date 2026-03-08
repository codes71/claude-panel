"""Tests for provider provenance lock behavior."""

from claude_panel.services import provider_provenance_service, skill_provider_service


def test_add_provider_records_commit_lock(mock_settings, monkeypatch):
    def fake_clone(repo_url, target_dir, branch):
        target_dir.mkdir(parents=True, exist_ok=True)
        skill_dir = target_dir / "skills" / "example-skill"
        skill_dir.mkdir(parents=True, exist_ok=True)
        (skill_dir / "SKILL.md").write_text(
            "---\nname: example-skill\ndescription: test\n---\n",
            encoding="utf-8",
        )

    monkeypatch.setattr(skill_provider_service, "_git_clone", fake_clone)
    monkeypatch.setattr(skill_provider_service, "_git_head_sha", lambda repo_dir: "abc123def")
    monkeypatch.setattr(
        skill_provider_service.skill_index_service,
        "build_provider_index",
        lambda *args, **kwargs: {"items": []},
    )

    result = skill_provider_service.add_skill_provider("acme/private-skills", "main")
    assert result["success"] is True

    lock = provider_provenance_service.read_lock()
    assert any(
        p["slug"] == result["slug"] and p["commit"] == "abc123def"
        for p in lock["providers"]
    )
