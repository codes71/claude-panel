# ClaudeBoard Reliability Control Plane Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Differentiate ClaudeBoard by shipping reliability-first capabilities: CLAUDE.md ops, MCP doctor/health, private-provider provenance, and config-as-code workflows.

**Architecture:** Add focused backend services and API routes for diagnostics, drift, and reproducibility; persist lightweight state in `~/.claude/ccm/`; expose workflows in a new frontend Reliability surface and existing Configuration/Extensions pages.

**Tech Stack:** FastAPI, Pydantic v2, pytest, React 19, MUI 7, TanStack Query, Vitest

---

### Task 1: CLAUDE.md Scope + Lint Foundation

**Files:**
- Create: `backend/ccm/services/claude_md_lint_service.py`
- Modify: `backend/ccm/config.py`
- Modify: `backend/ccm/services/claude_md_service.py`
- Modify: `backend/ccm/routers/claude_md.py`
- Modify: `backend/ccm/models/claude_md.py`
- Test: `backend/tests/test_claude_md_service.py`
- Test: `backend/tests/test_api_routes.py`

**Step 1: Write the failing tests**

```python
# backend/tests/test_claude_md_service.py

def test_list_claude_md_includes_lint_issues(mock_settings):
    data = claude_md_service.list_claude_md_files()
    assert "issues" in data
    assert isinstance(data["issues"], list)


def test_list_claude_md_respects_scan_roots(monkeypatch, mock_settings):
    monkeypatch.setenv("CCM_SCAN_ROOTS", "/tmp/project-a,/tmp/project-b")
    data = claude_md_service.list_claude_md_files()
    assert "scan_roots" in data
```

**Step 2: Run tests to verify failure**

Run: `cd backend && uv run pytest tests/test_claude_md_service.py tests/test_api_routes.py -q`
Expected: FAIL with missing `issues`/`scan_roots` keys and route schema mismatch.

**Step 3: Write minimal implementation**

```python
# backend/ccm/services/claude_md_lint_service.py

def lint_claude_md(content: str) -> list[dict]:
    issues = []
    if len(content.strip()) == 0:
        issues.append({"code": "EMPTY", "severity": "warning", "message": "File is empty"})
    if len(content) > 20000:
        issues.append({"code": "LARGE", "severity": "warning", "message": "High token risk"})
    return issues
```

Add scan-root parsing in `config.py` and include `issues` + `scan_roots` in `list_claude_md_files()` response.

**Step 4: Run tests to verify pass**

Run: `cd backend && uv run pytest tests/test_claude_md_service.py tests/test_api_routes.py -q`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/ccm/config.py backend/ccm/services/claude_md_lint_service.py backend/ccm/services/claude_md_service.py backend/ccm/routers/claude_md.py backend/ccm/models/claude_md.py backend/tests/test_claude_md_service.py backend/tests/test_api_routes.py
git commit -m "feat: add claude.md linting and scoped scanning metadata"
```

### Task 2: CLAUDE.md Drift Detection Feed

**Files:**
- Create: `backend/ccm/services/claude_md_drift_service.py`
- Modify: `backend/ccm/routers/claude_md.py`
- Modify: `backend/ccm/models/claude_md.py`
- Test: `backend/tests/test_claude_md_service.py`
- Test: `backend/tests/test_api_routes.py`

**Step 1: Write the failing tests**

```python
# backend/tests/test_api_routes.py

def test_get_claude_md_drift(client):
    response = client.get("/api/claude-md/drift")
    assert response.status_code == 200
    data = response.json()
    assert "events" in data
```

**Step 2: Run tests to verify failure**

Run: `cd backend && uv run pytest tests/test_api_routes.py::test_get_claude_md_drift -q`
Expected: FAIL with 404 endpoint not found.

**Step 3: Write minimal implementation**

```python
# backend/ccm/services/claude_md_drift_service.py

def list_drift_events() -> dict:
    return {"events": [], "cursor": "", "generated_at": 0}
```

Register `GET /api/claude-md/drift` and return typed response.

**Step 4: Run tests to verify pass**

Run: `cd backend && uv run pytest tests/test_api_routes.py::test_get_claude_md_drift -q`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/ccm/services/claude_md_drift_service.py backend/ccm/routers/claude_md.py backend/ccm/models/claude_md.py backend/tests/test_api_routes.py backend/tests/test_claude_md_service.py
git commit -m "feat: add claude.md drift events endpoint"
```

### Task 3: MCP Doctor Diagnostics

**Files:**
- Create: `backend/ccm/services/mcp_diagnostics_service.py`
- Modify: `backend/ccm/routers/mcp.py`
- Modify: `backend/ccm/models/mcp.py`
- Test: `backend/tests/test_mcp_service.py`
- Test: `backend/tests/test_api_routes.py`

**Step 1: Write the failing tests**

```python
# backend/tests/test_mcp_service.py

def test_diagnose_server_returns_checks(mock_settings):
    result = mcp_service.diagnose_server("test-server")
    assert "checks" in result
    assert isinstance(result["checks"], list)
```

**Step 2: Run tests to verify failure**

Run: `cd backend && uv run pytest tests/test_mcp_service.py::test_diagnose_server_returns_checks -q`
Expected: FAIL with missing `diagnose_server`.

**Step 3: Write minimal implementation**

```python
# backend/ccm/services/mcp_diagnostics_service.py

def diagnose_server(server: dict) -> dict:
    checks = []
    if server.get("server_type") == "stdio" and not server.get("command"):
        checks.append({"code": "MISSING_COMMAND", "status": "fail", "message": "Command is required"})
    return {"status": "ok" if not checks else "fail", "checks": checks}
```

Wire `GET /api/mcp/{name}/diagnose` and `GET /api/mcp/diagnostics`.

**Step 4: Run tests to verify pass**

Run: `cd backend && uv run pytest tests/test_mcp_service.py tests/test_api_routes.py -q`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/ccm/services/mcp_diagnostics_service.py backend/ccm/routers/mcp.py backend/ccm/models/mcp.py backend/tests/test_mcp_service.py backend/tests/test_api_routes.py
git commit -m "feat: add mcp doctor diagnostics endpoints"
```

### Task 4: MCP Health History and Error Taxonomy

**Files:**
- Create: `backend/ccm/services/mcp_health_service.py`
- Modify: `backend/ccm/services/mcp_service.py`
- Modify: `backend/ccm/routers/mcp.py`
- Modify: `backend/ccm/models/mcp.py`
- Test: `backend/tests/test_mcp_service.py`
- Test: `backend/tests/test_api_routes.py`

**Step 1: Write the failing tests**

```python
# backend/tests/test_api_routes.py

def test_get_mcp_health_history(client):
    response = client.get("/api/mcp/health")
    assert response.status_code == 200
    assert "servers" in response.json()
```

**Step 2: Run tests to verify failure**

Run: `cd backend && uv run pytest tests/test_api_routes.py::test_get_mcp_health_history -q`
Expected: FAIL with 404 endpoint not found.

**Step 3: Write minimal implementation**

```python
# backend/ccm/services/mcp_health_service.py

def list_health() -> dict:
    return {"servers": [], "updated_at": 0}
```

Persist snapshots to `~/.claude/ccm/state/mcp_health.json` and expose the endpoint.

**Step 4: Run tests to verify pass**

Run: `cd backend && uv run pytest tests/test_mcp_service.py tests/test_api_routes.py -q`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/ccm/services/mcp_health_service.py backend/ccm/services/mcp_service.py backend/ccm/routers/mcp.py backend/ccm/models/mcp.py backend/tests/test_mcp_service.py backend/tests/test_api_routes.py
git commit -m "feat: add mcp health history and status taxonomy"
```

### Task 5: Private GitHub Provider Import + Provenance Lock

**Files:**
- Create: `backend/ccm/services/provider_provenance_service.py`
- Modify: `backend/ccm/services/skill_provider_service.py`
- Modify: `backend/ccm/models/skill_providers.py`
- Modify: `backend/ccm/routers/skill_providers.py`
- Test: `backend/tests/test_plugin_service.py`
- Create: `backend/tests/test_skill_provider_provenance.py`

**Step 1: Write the failing tests**

```python
# backend/tests/test_skill_provider_provenance.py

def test_add_private_provider_records_commit_lock(mock_settings):
    result = skill_provider_service.add_skill_provider("git@github.com:org/private-skills.git", "main")
    assert result["success"] is True
    lock = provider_provenance_service.read_lock()
    assert any(item["repo"].endswith("private-skills") for item in lock["providers"])
```

**Step 2: Run tests to verify failure**

Run: `cd backend && uv run pytest tests/test_skill_provider_provenance.py -q`
Expected: FAIL with missing provenance service / lock file.

**Step 3: Write minimal implementation**

```python
# backend/ccm/services/provider_provenance_service.py

def record_provider(slug: str, repo: str, branch: str, commit: str) -> None:
    # upsert into ~/.claude/ccm/state/provider_lock.json
    ...
```

Capture checked-out commit SHA after clone/pull and persist lock metadata.

**Step 4: Run tests to verify pass**

Run: `cd backend && uv run pytest tests/test_skill_provider_provenance.py tests/test_api_routes.py -q`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/ccm/services/provider_provenance_service.py backend/ccm/services/skill_provider_service.py backend/ccm/models/skill_providers.py backend/ccm/routers/skill_providers.py backend/tests/test_skill_provider_provenance.py backend/tests/test_plugin_service.py
git commit -m "feat: add private provider provenance lock tracking"
```

### Task 6: Config-as-Code Export / Validate / Apply

**Files:**
- Create: `backend/ccm/services/config_bundle_service.py`
- Create: `backend/ccm/routers/config_bundle.py`
- Modify: `backend/ccm/main.py`
- Modify: `backend/ccm/models/common.py`
- Test: `backend/tests/test_api_routes.py`
- Create: `backend/tests/test_config_bundle_service.py`

**Step 1: Write the failing tests**

```python
# backend/tests/test_api_routes.py

def test_export_config_bundle(client):
    response = client.get("/api/config-bundle/export")
    assert response.status_code == 200
    data = response.json()
    assert "bundle" in data


def test_validate_config_bundle(client):
    response = client.post("/api/config-bundle/validate", json={"bundle": {}})
    assert response.status_code == 200
    assert "errors" in response.json()
```

**Step 2: Run tests to verify failure**

Run: `cd backend && uv run pytest tests/test_api_routes.py::test_export_config_bundle tests/test_api_routes.py::test_validate_config_bundle -q`
Expected: FAIL with 404 endpoint not found.

**Step 3: Write minimal implementation**

```python
# backend/ccm/services/config_bundle_service.py

def export_bundle() -> dict:
    return {"bundle": {"version": 1, "mcp": {}, "claude_md": {}, "providers": {}}}


def validate_bundle(bundle: dict) -> dict:
    return {"valid": True, "errors": [], "warnings": []}


def apply_bundle(bundle: dict, dry_run: bool = True) -> dict:
    return {"applied": not dry_run, "changes": []}
```

Register `/api/config-bundle/export`, `/api/config-bundle/validate`, `/api/config-bundle/apply`.

**Step 4: Run tests to verify pass**

Run: `cd backend && uv run pytest tests/test_config_bundle_service.py tests/test_api_routes.py -q`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/ccm/services/config_bundle_service.py backend/ccm/routers/config_bundle.py backend/ccm/main.py backend/ccm/models/common.py backend/tests/test_config_bundle_service.py backend/tests/test_api_routes.py
git commit -m "feat: add config-as-code export validate apply endpoints"
```

### Task 7: Frontend Reliability Surface + Config Bundle UI

**Files:**
- Create: `frontend/src/api/reliability.ts`
- Create: `frontend/src/api/configBundle.ts`
- Create: `frontend/src/pages/ReliabilityPage.tsx`
- Create: `frontend/src/pages/__tests__/ReliabilityPage.test.tsx`
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/ConfigurationPage.tsx`
- Modify: `frontend/src/pages/SkillProvidersPage.tsx`

**Step 1: Write the failing tests**

```tsx
// frontend/src/pages/__tests__/ReliabilityPage.test.tsx
it("renders mcp doctor and claude.md drift sections", () => {
  render(<ReliabilityPage />);
  expect(screen.getByText(/MCP Doctor/i)).toBeInTheDocument();
  expect(screen.getByText(/CLAUDE\.md Drift/i)).toBeInTheDocument();
});
```

**Step 2: Run tests to verify failure**

Run: `cd frontend && npm test -- --run frontend/src/pages/__tests__/ReliabilityPage.test.tsx`
Expected: FAIL with module/page not found.

**Step 3: Write minimal implementation**

```tsx
// frontend/src/pages/ReliabilityPage.tsx
export default function ReliabilityPage() {
  return (
    <Box>
      <Typography variant="h1">Reliability</Typography>
      <Typography>MCP Doctor</Typography>
      <Typography>CLAUDE.md Drift</Typography>
    </Box>
  );
}
```

Add route `/reliability` and API hooks for diagnostics/drift/config bundle actions.

**Step 4: Run tests to verify pass**

Run: `cd frontend && npm test -- --run`
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/api/reliability.ts frontend/src/api/configBundle.ts frontend/src/pages/ReliabilityPage.tsx frontend/src/pages/__tests__/ReliabilityPage.test.tsx frontend/src/types.ts frontend/src/App.tsx frontend/src/pages/ConfigurationPage.tsx frontend/src/pages/SkillProvidersPage.tsx
git commit -m "feat: add reliability and config bundle frontend workflows"
```

### Task 8: Docs, Verification, and Release Readiness

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Create: `docs/reliability-control-plane.md`

**Step 1: Write failing verification checklist**

Create a checklist in `docs/reliability-control-plane.md` with empty evidence fields for:
- backend test suite
- frontend test suite
- manual smoke flow for drift + doctor + provider lock + bundle apply

**Step 2: Run verification commands**

Run: `cd backend && uv run pytest -q`
Expected: PASS

Run: `cd frontend && npm test -- --run`
Expected: PASS

Run: `npm run build:frontend`
Expected: successful frontend build artifacts

**Step 3: Finalize docs and changelog**

Document:
- new endpoints
- new UI flows
- migration notes
- known limitations

**Step 4: Commit**

```bash
git add README.md CHANGELOG.md docs/reliability-control-plane.md
git commit -m "docs: document reliability control plane workflows"
```

**Step 5: Tag release candidate**

```bash
git tag -a v1.6.0-rc1 -m "Reliability control plane release candidate"
```

Run: `git show v1.6.0-rc1 --stat`
Expected: tag exists and points to docs-complete commit.

---

## Execution Notes
- Required process skills during execution: `@superpowers:test-driven-development`, `@superpowers:systematic-debugging`, `@superpowers:verification-before-completion`.
- Keep every endpoint backward-compatible where possible.
- Prefer additive API changes and feature flags over breaking migrations.
- If any task exceeds 30 minutes, split it into a subtask before coding.
