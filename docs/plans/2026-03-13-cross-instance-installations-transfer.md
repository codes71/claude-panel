# Cross-Instance Installations Transfer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Configuration > Installations workflow that lets the user select slash commands, installed plugins, and global MCP servers from the active Claude instance, preview conflicts against a chosen target instance, and copy only the selected items without switching the app’s active instance.

**Architecture:** Keep the current active-instance singleton untouched. Add a new path-aware backend transfer service that reads and writes arbitrary Claude instances by absolute path, exposes preview/apply endpoints under the existing instances router, and handles commands, plugin installs, and global MCP entries as separate slices. Add a new Installations tab under Configuration in the frontend that uses React Query for backend reads/writes and local page state for selection, preview, and conflict mode.

**Tech Stack:** FastAPI, Pydantic v2, Python filesystem helpers, subprocess-backed Claude CLI plugin installs, React 19, TypeScript, MUI, TanStack Query, pytest, Vitest.

**Required process skills during execution:** `@superpowers:executing-plans`, `@superpowers:test-driven-development`, `@superpowers:systematic-debugging`, `@superpowers:verification-before-completion`.

---

### Task 1: Define Transfer Models and Contract Tests

**Files:**
- Create: `backend/claude_panel/models/transfers.py`
- Modify: `backend/claude_panel/models/__init__.py`
- Create: `backend/tests/test_instance_transfer_service.py`
- Modify: `backend/tests/test_api_routes.py`

**Step 1: Write the failing tests for the preview/apply contract**

```python
from claude_panel.services import instance_transfer_service


def test_preview_rejects_same_source_and_target(mock_settings):
    with pytest.raises(ValueError, match="Source and target instances must be different"):
        instance_transfer_service.preview_transfer(
            source_path=str(mock_settings.claude_home),
            target_path=str(mock_settings.claude_home),
            commands=[],
            plugins=[],
            mcp_servers=[],
        )


def test_preview_returns_category_summaries(tmp_path):
    source = tmp_path / ".claude-source"
    target = tmp_path / ".claude-target"
    source.mkdir()
    target.mkdir()

    result = instance_transfer_service.preview_transfer(
        source_path=str(source),
        target_path=str(target),
        commands=[],
        plugins=[],
        mcp_servers=[],
    )

    assert result.summary.commands.selected == 0
    assert result.summary.plugins.selected == 0
    assert result.summary.mcp_servers.selected == 0
```

**Step 2: Run the targeted backend tests to verify they fail**

Run: `uv run pytest backend/tests/test_instance_transfer_service.py backend/tests/test_api_routes.py -q`

Expected: FAIL with `ImportError`, missing models, and missing preview/apply service or route symbols.

**Step 3: Add the transfer request/response models and empty service stubs**

```python
from pydantic import BaseModel, Field


class TransferCommandRef(BaseModel):
    namespace: str
    name: str


class TransferPluginRef(BaseModel):
    plugin_id: str


class TransferMcpRef(BaseModel):
    name: str


class TransferPreviewRequest(BaseModel):
    source_path: str
    target_path: str
    commands: list[TransferCommandRef] = Field(default_factory=list)
    plugins: list[TransferPluginRef] = Field(default_factory=list)
    mcp_servers: list[TransferMcpRef] = Field(default_factory=list)
```

Add a minimal `preview_transfer()` / `apply_transfer()` stub in `instance_transfer_service.py` that validates source/target are different and returns zeroed summaries.

**Step 4: Re-run the targeted backend tests**

Run: `uv run pytest backend/tests/test_instance_transfer_service.py backend/tests/test_api_routes.py -q`

Expected: PASS for the new contract tests, with route tests still incomplete or skipped until later tasks.

**Step 5: Commit the contract baseline**

```bash
git add backend/claude_panel/models/transfers.py backend/claude_panel/models/__init__.py backend/tests/test_instance_transfer_service.py backend/tests/test_api_routes.py backend/claude_panel/services/instance_transfer_service.py
git commit -m "test: define transfer contract for cross-instance copy"
```

### Task 2: Add Path-Aware Instance Helpers and Backup Primitives

**Files:**
- Create: `backend/claude_panel/services/instance_paths.py`
- Modify: `backend/claude_panel/services/backup.py`
- Modify: `backend/claude_panel/services/__init__.py`
- Modify: `backend/tests/test_instance_service.py`
- Modify: `backend/tests/test_instance_transfer_service.py`

**Step 1: Write the failing tests for per-instance paths and backup placement**

```python
from claude_panel.services.instance_paths import claude_json_path_for, backup_dir_for


def test_claude_json_path_for_default_instance(tmp_path, monkeypatch):
    default = tmp_path / ".claude"
    default.mkdir()
    monkeypatch.setattr("claude_panel.services.instance_paths._DEFAULT_INSTANCE", default)
    monkeypatch.setattr("claude_panel.services.instance_paths.Path.home", lambda: tmp_path)

    assert claude_json_path_for(default) == tmp_path / ".claude.json"


def test_safe_write_text_at_uses_target_backup_dir(tmp_path):
    target_file = tmp_path / "commands" / "hello.md"
    target_file.parent.mkdir(parents=True)
    target_file.write_text("old", encoding="utf-8")
    backup_dir = tmp_path / "backups" / "claude-panel"

    backup.safe_write_text_at(target_file, "new", backup_dir)

    assert any(backup_dir.glob("hello.md.*.bak"))
```

**Step 2: Run the failing tests**

Run: `uv run pytest backend/tests/test_instance_service.py backend/tests/test_instance_transfer_service.py -q`

Expected: FAIL because `instance_paths.py` and `safe_write_text_at` / `safe_write_json_at` do not exist yet.

**Step 3: Implement the path helpers and explicit backup-dir write helpers**

```python
def claude_json_path_for(instance_path: Path) -> Path:
    if instance_path.resolve() == _DEFAULT_INSTANCE.resolve():
        return Path.home() / ".claude.json"
    return instance_path / ".claude.json"


def backup_dir_for(instance_path: Path) -> Path:
    return instance_path / "backups" / "claude-panel"
```

Add `safe_write_text_at(file_path, content, backup_dir)` and `safe_write_json_at(file_path, data, backup_dir)` to `backup.py` instead of relying on `settings.backup_dir`.

**Step 4: Re-run the path-helper tests**

Run: `uv run pytest backend/tests/test_instance_service.py backend/tests/test_instance_transfer_service.py -q`

Expected: PASS for the new path and backup tests.

**Step 5: Commit the new primitives**

```bash
git add backend/claude_panel/services/instance_paths.py backend/claude_panel/services/backup.py backend/claude_panel/services/__init__.py backend/tests/test_instance_service.py backend/tests/test_instance_transfer_service.py
git commit -m "feat: add path-aware instance transfer helpers"
```

### Task 3: Implement Slash Command Preview and Apply

**Files:**
- Modify: `backend/claude_panel/services/instance_transfer_service.py`
- Modify: `backend/tests/test_instance_transfer_service.py`
- Modify: `backend/tests/test_command_service.py`

**Step 1: Write the failing tests for command conflict detection and copy**

```python
def test_preview_command_marks_conflict_when_target_differs(tmp_path):
    source = tmp_path / ".claude-source"
    target = tmp_path / ".claude-target"
    (source / "commands" / "sc").mkdir(parents=True)
    (target / "commands" / "sc").mkdir(parents=True)
    (source / "commands" / "sc" / "load.md").write_text("source body", encoding="utf-8")
    (target / "commands" / "sc" / "load.md").write_text("target body", encoding="utf-8")

    result = instance_transfer_service.preview_transfer(
        source_path=str(source),
        target_path=str(target),
        commands=[{"namespace": "sc", "name": "load"}],
        plugins=[],
        mcp_servers=[],
    )

    assert result.commands[0].status == "conflict"


def test_apply_command_overwrite_replaces_target_content(tmp_path):
    ...
    result = instance_transfer_service.apply_transfer(..., conflict_mode="overwrite")
    assert target_file.read_text(encoding="utf-8") == "source body"
```

**Step 2: Run the command tests**

Run: `uv run pytest backend/tests/test_instance_transfer_service.py backend/tests/test_command_service.py -q`

Expected: FAIL because the service does not yet inspect arbitrary `commands/` trees or copy files.

**Step 3: Implement command inventory, preview, and copy**

```python
def _qualified_name(namespace: str, name: str) -> str:
    return f"{namespace}:{name}" if namespace else name


def _command_path_for(instance_path: Path, namespace: str, name: str) -> Path:
    base = commands_dir_for(instance_path)
    return base / namespace / f"{name}.md" if namespace else base / f"{name}.md"
```

Use the same name validation rules as `command_service.py`, compare source and target file contents for `noop` vs `conflict`, and copy with `safe_write_text_at(..., backup_dir_for(target_instance))`.

**Step 4: Re-run the command tests**

Run: `uv run pytest backend/tests/test_instance_transfer_service.py backend/tests/test_command_service.py -q`

Expected: PASS, including root namespace and namespaced command cases.

**Step 5: Commit the command slice**

```bash
git add backend/claude_panel/services/instance_transfer_service.py backend/tests/test_instance_transfer_service.py backend/tests/test_command_service.py
git commit -m "feat: add cross-instance slash command transfer"
```

### Task 4: Implement Global MCP Preview and Apply

**Files:**
- Modify: `backend/claude_panel/services/instance_transfer_service.py`
- Modify: `backend/claude_panel/services/claude_json_service.py`
- Modify: `backend/tests/test_instance_transfer_service.py`
- Modify: `backend/tests/test_claude_json_service.py`
- Modify: `backend/tests/test_mcp_service.py`

**Step 1: Write the failing tests for global-only MCP filtering and conflict detection**

```python
def test_preview_mcp_ignores_project_scoped_entries(tmp_path):
    source_json = tmp_path / ".claude.json"
    source_json.write_text(json.dumps({
        "mcpServers": {"global-server": {"command": "node", "args": ["a.js"]}},
        "projects": {"/tmp/project": {"mcpServers": {"project-server": {"url": "https://x"}}}},
    }), encoding="utf-8")

    result = instance_transfer_service.preview_transfer(...)

    assert [item.name for item in result.mcp_servers] == ["global-server"]


def test_apply_mcp_overwrite_updates_root_mcp_servers_only(tmp_path):
    ...
    assert updated_payload["projects"] == original_projects
```

**Step 2: Run the MCP tests**

Run: `uv run pytest backend/tests/test_instance_transfer_service.py backend/tests/test_claude_json_service.py backend/tests/test_mcp_service.py -q`

Expected: FAIL because the service currently does not expose path-aware `.claude.json` helpers or global-only copy behavior.

**Step 3: Implement path-aware `.claude.json` access and MCP merge logic**

```python
def read_claude_json_for(instance_path: Path) -> dict:
    path = claude_json_path_for(instance_path)
    ...


def get_global_mcp_servers_for(instance_path: Path) -> dict[str, dict]:
    return read_claude_json_for(instance_path).get("mcpServers", {})
```

Filter to root `mcpServers`, treat identical configs as `noop`, different configs as `conflict`, and preserve unrelated keys like `projects` on write.

**Step 4: Re-run the MCP tests**

Run: `uv run pytest backend/tests/test_instance_transfer_service.py backend/tests/test_claude_json_service.py backend/tests/test_mcp_service.py -q`

Expected: PASS, with project-scoped and plugin-derived MCPs excluded from transfer scope.

**Step 5: Commit the MCP slice**

```bash
git add backend/claude_panel/services/instance_transfer_service.py backend/claude_panel/services/claude_json_service.py backend/tests/test_instance_transfer_service.py backend/tests/test_claude_json_service.py backend/tests/test_mcp_service.py
git commit -m "feat: add global mcp transfer between instances"
```

### Task 5: Implement Plugin Preview and Apply with Targeted CLI Env

**Files:**
- Modify: `backend/claude_panel/services/instance_transfer_service.py`
- Modify: `backend/claude_panel/services/marketplace_service.py`
- Modify: `backend/claude_panel/services/settings_service.py`
- Modify: `backend/tests/test_instance_transfer_service.py`
- Modify: `backend/tests/test_plugin_service.py`
- Modify: `backend/tests/test_api_routes.py`

**Step 1: Write the failing tests for plugin preview, enabled-state sync, and subprocess behavior**

```python
def test_preview_plugin_warns_when_target_missing_marketplace_source(tmp_path):
    ...
    result = instance_transfer_service.preview_transfer(...)
    assert "target_missing_marketplace_source" in result.plugins[0].warnings


def test_apply_plugin_installs_with_target_claude_config_dir(monkeypatch, tmp_path):
    calls = []

    def fake_run(cmd, **kwargs):
        calls.append(kwargs["env"]["CLAUDE_CONFIG_DIR"])
        return SimpleNamespace(returncode=0, stdout="ok", stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)
    result = instance_transfer_service.apply_transfer(..., conflict_mode="skip")

    assert calls == [str(target_instance)]
```

**Step 2: Run the plugin tests**

Run: `uv run pytest backend/tests/test_instance_transfer_service.py backend/tests/test_plugin_service.py backend/tests/test_api_routes.py -q`

Expected: FAIL because plugin preview/apply for arbitrary target instances does not exist.

**Step 3: Implement path-aware plugin helpers**

```python
def claude_env_for(instance_path: Path) -> dict[str, str]:
    env = os.environ.copy()
    env["CLAUDE_CONFIG_DIR"] = str(instance_path)
    return env


def install_plugin_for_instance(plugin_id: str, instance_path: Path, scope: str = "user") -> dict:
    return subprocess.run(
        ["claude", "plugin", "install", plugin_id, "--scope", scope],
        capture_output=True,
        text=True,
        timeout=120,
        env=claude_env_for(instance_path),
    )
```

Preview should read installed plugin ids plus `enabledPlugins`, mark missing target marketplace sources as warnings, and treat `already installed with same enabled state` as `noop`.

**Step 4: Re-run the plugin tests**

Run: `uv run pytest backend/tests/test_instance_transfer_service.py backend/tests/test_plugin_service.py backend/tests/test_api_routes.py -q`

Expected: PASS, including CLI env targeting and enabled-state synchronization behavior.

**Step 5: Commit the plugin slice**

```bash
git add backend/claude_panel/services/instance_transfer_service.py backend/claude_panel/services/marketplace_service.py backend/claude_panel/services/settings_service.py backend/tests/test_instance_transfer_service.py backend/tests/test_plugin_service.py backend/tests/test_api_routes.py
git commit -m "feat: add plugin transfer across claude instances"
```

### Task 6: Expose Preview and Apply Routes Under Instances

**Files:**
- Modify: `backend/claude_panel/routers/instances.py`
- Modify: `backend/claude_panel/main.py`
- Modify: `backend/tests/test_api_routes.py`

**Step 1: Write the failing API tests**

```python
def test_preview_transfer_endpoint(client, tmp_path):
    response = client.post("/api/instances/transfers/preview", json={
        "source_path": str(tmp_path / ".claude-a"),
        "target_path": str(tmp_path / ".claude-b"),
        "commands": [],
        "plugins": [],
        "mcp_servers": [],
    })
    assert response.status_code == 200
    assert "summary" in response.json()


def test_apply_transfer_endpoint_rejects_same_instance(client, mock_settings):
    response = client.post("/api/instances/transfers/apply", json={
        "source_path": str(mock_settings.claude_home),
        "target_path": str(mock_settings.claude_home),
        "commands": [],
        "plugins": [],
        "mcp_servers": [],
        "conflict_mode": "skip",
    })
    assert response.status_code == 400
```

**Step 2: Run the API route tests**

Run: `uv run pytest backend/tests/test_api_routes.py -q`

Expected: FAIL with missing routes or missing body models.

**Step 3: Implement the router endpoints and error mapping**

```python
@router.post("/instances/transfers/preview")
async def preview_transfer(body: TransferPreviewRequest):
    try:
        return instance_transfer_service.preview_transfer(...)
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/instances/transfers/apply")
async def apply_transfer(body: TransferApplyRequest):
    ...
```

Use 400 for invalid path / invalid conflict mode / same instance, and 404 only when a selected item does not exist in the source instance.

**Step 4: Re-run the backend API tests**

Run: `uv run pytest backend/tests/test_api_routes.py -q`

Expected: PASS, including preview/apply happy paths and route-level validation.

**Step 5: Commit the API layer**

```bash
git add backend/claude_panel/routers/instances.py backend/claude_panel/main.py backend/tests/test_api_routes.py
git commit -m "feat: add instance transfer preview and apply routes"
```

### Task 7: Add Frontend Types and Transfer API Hooks

**Files:**
- Modify: `frontend/src/types.ts`
- Create: `frontend/src/api/transfers.ts`
- Create: `frontend/src/api/__tests__/transfers.test.tsx`

**Step 1: Write the failing API-hook tests**

```tsx
it("invalidates commands, plugins, mcp-servers, dashboard, and instances after apply", async () => {
  const qc = new QueryClient();
  const invalidateQueries = vi.spyOn(qc, "invalidateQueries");
  ...
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["commands"] });
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["plugins"] });
  expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["mcp-servers"] });
});
```

**Step 2: Run the frontend API-hook tests**

Run: `npm test -- src/api/__tests__/transfers.test.tsx`
Working directory: `frontend`

Expected: FAIL because the transfer hook module and types do not exist yet.

**Step 3: Implement the request/response types and hooks**

```ts
export interface TransferPreviewRequest {
  source_path: string;
  target_path: string;
  commands: { namespace: string; name: string }[];
  plugins: { plugin_id: string }[];
  mcp_servers: { name: string }[];
}

export function useApplyTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TransferApplyRequest) =>
      post<TransferApplyResponse>("/instances/transfers/apply", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commands"] });
      qc.invalidateQueries({ queryKey: ["plugins"] });
      qc.invalidateQueries({ queryKey: ["mcp-servers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["instances"] });
    },
  });
}
```

**Step 4: Re-run the frontend API-hook tests**

Run: `npm test -- src/api/__tests__/transfers.test.tsx`
Working directory: `frontend`

Expected: PASS with correct invalidation coverage.

**Step 5: Commit the frontend API layer**

```bash
git add frontend/src/types.ts frontend/src/api/transfers.ts frontend/src/api/__tests__/transfers.test.tsx
git commit -m "feat: add frontend transfer api hooks"
```

### Task 8: Add the Configuration Tab and Installations Page Shell

**Files:**
- Modify: `frontend/src/pages/ConfigurationPage.tsx`
- Create: `frontend/src/pages/InstallationsPage.tsx`
- Create: `frontend/src/pages/__tests__/ConfigurationPage.test.tsx`

**Step 1: Write the failing tab-render test**

```tsx
it("renders an Installations tab and shows the Installations page", async () => {
  render(<ConfigurationPage />, { wrapper });
  expect(screen.getByRole("tab", { name: "Installations" })).toBeInTheDocument();
});
```

**Step 2: Run the Configuration page tests**

Run: `npm test -- src/pages/__tests__/ConfigurationPage.test.tsx`
Working directory: `frontend`

Expected: FAIL because the tab and page do not exist yet.

**Step 3: Implement the new tab and page shell**

```tsx
const TABS = ["Settings", "MCP Servers", "Commands", "Installations"] as const;
...
{tab === 3 && <InstallationsPage />}
```

The page shell should show the active source instance, target selector placeholder, loading state, and three empty category cards.

**Step 4: Re-run the tab-render tests**

Run: `npm test -- src/pages/__tests__/ConfigurationPage.test.tsx`
Working directory: `frontend`

Expected: PASS.

**Step 5: Commit the new page shell**

```bash
git add frontend/src/pages/ConfigurationPage.tsx frontend/src/pages/InstallationsPage.tsx frontend/src/pages/__tests__/ConfigurationPage.test.tsx
git commit -m "feat: add installations tab to configuration"
```

### Task 9: Build Selectable Transfer Sections and Preview Dialog

**Files:**
- Modify: `frontend/src/pages/InstallationsPage.tsx`
- Create: `frontend/src/components/transfer/TargetInstanceSelect.tsx`
- Create: `frontend/src/components/transfer/TransferSectionCard.tsx`
- Create: `frontend/src/components/transfer/TransferPreviewDialog.tsx`
- Create: `frontend/src/pages/__tests__/InstallationsPage.test.tsx`

**Step 1: Write the failing stateful UI test**

```tsx
it("lets the user choose a target, select items, preview, and apply with skip mode", async () => {
  render(<InstallationsPage />, { wrapper });

  await user.selectOptions(screen.getByLabelText("Target Instance"), "/tmp/.claude-target");
  await user.click(screen.getByLabelText("Select command greet"));
  await user.click(screen.getByRole("button", { name: /preview copy/i }));

  expect(screen.getByText("Conflict handling")).toBeInTheDocument();
  await user.click(screen.getByLabelText("Skip existing"));
  await user.click(screen.getByRole("button", { name: /apply copy/i }));
});
```

**Step 2: Run the new Installations page test**

Run: `npm test -- src/pages/__tests__/InstallationsPage.test.tsx`
Working directory: `frontend`

Expected: FAIL because the selection UI and preview dialog do not exist yet.

**Step 3: Implement the transfer UI**

```tsx
const [targetPath, setTargetPath] = useState("");
const [selectedCommands, setSelectedCommands] = useState<Set<string>>(new Set());
const [selectedPlugins, setSelectedPlugins] = useState<Set<string>>(new Set());
const [selectedMcpServers, setSelectedMcpServers] = useState<Set<string>>(new Set());
const [conflictMode, setConflictMode] = useState<"skip" | "overwrite">("skip");
```

Requirements for the implementation:
- never call `useSwitchInstance()` from this page
- keep commands, plugins, and MCPs in separate cards
- use checkboxes, not toggle switches, for selection
- exclude the active instance from target choices
- keep source/target context visible at all times

**Step 4: Re-run the Installations page test**

Run: `npm test -- src/pages/__tests__/InstallationsPage.test.tsx`
Working directory: `frontend`

Expected: PASS, with preview and apply interactions covered.

**Step 5: Commit the UI workflow**

```bash
git add frontend/src/pages/InstallationsPage.tsx frontend/src/components/transfer/TargetInstanceSelect.tsx frontend/src/components/transfer/TransferSectionCard.tsx frontend/src/components/transfer/TransferPreviewDialog.tsx frontend/src/pages/__tests__/InstallationsPage.test.tsx
git commit -m "feat: add transfer workflow for installations tab"
```

### Task 10: Run Full Verification and Fix Any Regressions

**Files:**
- Modify: only files touched by failing tests

**Step 1: Run the full backend test suite**

Run: `uv run pytest backend/tests -q`

Expected: PASS.

**Step 2: Run the focused frontend test suite for changed surfaces**

Run: `npm test -- src/api/__tests__/transfers.test.tsx src/pages/__tests__/ConfigurationPage.test.tsx src/pages/__tests__/InstallationsPage.test.tsx src/pages/__tests__/CommandsPage.test.tsx src/pages/__tests__/MarketplacePage.test.tsx src/pages/__tests__/PluginsPage.test.tsx`
Working directory: `frontend`

Expected: PASS.

**Step 3: Run the frontend build**

Run: `npm run build`
Working directory: `frontend`

Expected: PASS with no TypeScript errors.

**Step 4: Fix any failures before claiming completion**

If a backend test fails, use `@superpowers:systematic-debugging` and re-run only the failing test first, then re-run the full relevant suite.

If a frontend test fails, fix the specific component or hook, re-run the single failing test, then re-run the focused suite.

**Step 5: Commit the verified feature**

```bash
git add backend/claude_panel/models/transfers.py backend/claude_panel/services/instance_paths.py backend/claude_panel/services/instance_transfer_service.py backend/claude_panel/services/backup.py backend/claude_panel/services/claude_json_service.py backend/claude_panel/services/marketplace_service.py backend/claude_panel/services/settings_service.py backend/claude_panel/routers/instances.py backend/claude_panel/models/__init__.py backend/tests/test_instance_transfer_service.py backend/tests/test_api_routes.py backend/tests/test_claude_json_service.py backend/tests/test_command_service.py backend/tests/test_mcp_service.py backend/tests/test_plugin_service.py frontend/src/types.ts frontend/src/api/transfers.ts frontend/src/api/__tests__/transfers.test.tsx frontend/src/pages/ConfigurationPage.tsx frontend/src/pages/InstallationsPage.tsx frontend/src/components/transfer/TargetInstanceSelect.tsx frontend/src/components/transfer/TransferSectionCard.tsx frontend/src/components/transfer/TransferPreviewDialog.tsx frontend/src/pages/__tests__/ConfigurationPage.test.tsx frontend/src/pages/__tests__/InstallationsPage.test.tsx
git commit -m "feat: add cross-instance installations transfer workflow"
```

---

**Implementation notes for the fresh session:**
- Do not install or copy the external `agency-agents` repo as part of this feature. It is reference material, not product scope.
- Do not switch the active instance to perform transfer work. Every backend operation should accept `source_path` and `target_path`.
- Do not copy plugin caches directly. Always install plugins into the target instance through the Claude CLI with `CLAUDE_CONFIG_DIR` set for the target.
- Do not include project-scoped or plugin-derived MCP entries in v1.
- Do not reuse enable/disable switches as selection controls in the UI.
- Keep commits small and in order. If a task reveals a missing seam, add a new micro-task instead of widening the current one.

**Suggested execution order in a fresh Codex session:**
1. Read this file once.
2. Execute Task 1 through Task 10 in order.
3. Keep TDD strict: fail first, then implement minimally.
4. Stop and debug before moving forward if any verification step fails.
