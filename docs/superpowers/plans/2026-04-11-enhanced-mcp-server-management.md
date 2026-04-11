# Enhanced MCP Server Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close 5 gaps in MCP server management: HTTP server creation, server editing, "sse"→"http" naming fix, project-scoped creation, and better diagnostics.

**Architecture:** In-place enhancement of existing MCP page. Shared form for create/edit dialogs. All MCP business logic in `mcp_service.py`. Backend reads/writes `~/.claude.json` directly.

**Tech Stack:** FastAPI + Pydantic (backend), React + MUI + TanStack React Query (frontend), pytest (tests)

**Spec:** `docs/superpowers/specs/2026-04-11-enhanced-mcp-server-management-design.md`

---

## File Structure

### Backend — Modified
| File | Responsibility |
|------|---------------|
| `backend/claude_panel/models/mcp.py` | Add `McpServerUpdateRequest` model, add `project_path` to create request |
| `backend/claude_panel/routers/mcp.py` | Add `PUT /mcp/{name}`, `GET /mcp/projects`, extend `POST /mcp` |
| `backend/claude_panel/services/mcp_service.py` | Add `update_server()`, `create_server()`, `list_project_paths()`, fix "sse"→"http" |
| `backend/claude_panel/services/claude_json_service.py` | Fix `list_mcp_server_entries()` to return "http" not "sse", add `url` field passthrough |
| `backend/claude_panel/services/mcp_diagnostics_service.py` | Fix "sse" refs, add 3 new checks |

### Backend — Modified Tests
| File | Responsibility |
|------|---------------|
| `backend/tests/test_mcp_service.py` | Tests for new service functions + "sse"→"http" normalization |
| `backend/tests/test_mcp_diagnostics_service.py` | Tests for 3 new diagnostic checks (new file) |

### Frontend — Modified
| File | Responsibility |
|------|---------------|
| `frontend/src/types.ts` | Fix `"sse"`→`"http"`, extend create request, add update request |
| `frontend/src/api/mcp.ts` | Add `useUpdateMcpServer()`, `useProjectPaths()` hooks |
| `frontend/src/pages/McpServersPage.tsx` | Server type toggle, URL field, scope picker, edit dialog |
| `frontend/src/components/McpServerCard.tsx` | Add edit button, fix "sse"→"http" label |

---

## Task 1: Fix "sse" → "http" Naming in Backend

**Files:**
- Modify: `backend/claude_panel/services/claude_json_service.py:46-48`
- Modify: `backend/claude_panel/services/mcp_service.py:48`
- Modify: `backend/claude_panel/services/mcp_diagnostics_service.py:9,53-54`
- Test: `backend/tests/test_mcp_service.py`

- [ ] **Step 1: Update test expectation from "sse" to "http"**

In `backend/tests/test_mcp_service.py`, the test `test_includes_project_scoped_servers` asserts `server_type == "sse"` for URL-based servers. Fix this first so it reflects the new correct value.

```python
# In TestListAllServers.test_includes_project_scoped_servers, change:
assert project_server["server_type"] == "sse"
# To:
assert project_server["server_type"] == "http"
```

Also add a new test for sidecar normalization:

```python
def test_disabled_http_server_normalized(self, mock_settings, tmp_claude_json):
    """Disabled servers with 'sse' type are normalized to 'http'."""
    # First create an http server and disable it
    tmp_claude_json.write_text(json.dumps({
        "mcpServers": {
            "http-server": {"type": "http", "url": "https://example.com/mcp"},
        }
    }))
    mcp_service.toggle_server("http-server", False)

    # Read the sidecar directly and patch it to use old "sse" type
    sidecar = mcp_service._read_sidecar()
    # The sidecar stores raw config, not server_type
    # When listed, disabled servers should normalize to "http" not "sse"
    servers = mcp_service.list_all_servers()
    disabled = [s for s in servers if not s["enabled"]]
    assert len(disabled) == 1
    assert disabled[0]["server_type"] == "http"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/code/Projects/CLI_Agent_Manager && python -m pytest backend/tests/test_mcp_service.py -v -k "project_scoped or disabled_http"`
Expected: FAIL — `test_includes_project_scoped_servers` gets "sse" but expects "http"

- [ ] **Step 3: Fix claude_json_service.py — change "sse" to "http"**

In `backend/claude_panel/services/claude_json_service.py`, line 48:

```python
# Change:
"server_type": "sse" if is_network_server else "stdio",
# To:
"server_type": "http" if is_network_server else "stdio",
```

- [ ] **Step 4: Fix mcp_service.py — change "sse" to "http" in disabled server listing**

In `backend/claude_panel/services/mcp_service.py`, line 48:

```python
# Change:
server_type = "sse" if "url" in config else "stdio"
# To:
server_type = "http" if "url" in config else "stdio"
```

- [ ] **Step 5: Fix mcp_diagnostics_service.py — update transport check and URL check**

In `backend/claude_panel/services/mcp_diagnostics_service.py`:

Line 9 — update valid transport set:
```python
# Change:
if transport not in {"stdio", "sse"}:
# To:
if transport not in {"stdio", "http"}:
```

Lines 53-54 — update URL check to match "http" type:
```python
# Change:
def _check_sse_url(server: dict) -> dict:
    if server.get("server_type") != "sse":
# To:
def _check_http_url(server: dict) -> dict:
    if server.get("server_type") != "http":
```

Also update the messages in `_check_http_url`:
```python
# Line 57-58:
"code": "URL_NOT_REQUIRED",
"message": "URL check skipped for non-HTTP server.",

# Line 62: check url field directly, not command
url = str(server.get("url", server.get("command", ""))).strip()

# Lines 64-66:
"code": "URL_INVALID",
"message": "HTTP server URL must start with http:// or https://.",

# Lines 69-71:
"code": "URL_VALID",
"message": "HTTP URL is configured.",
```

Update the `diagnose_server` function to use the renamed function:
```python
# Line 122-127:
checks = [
    _check_transport(server),
    _check_stdio_command(server),
    _check_http_url(server),
    _check_args(server),
    _check_env(server),
]
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd /home/code/Projects/CLI_Agent_Manager && python -m pytest backend/tests/test_mcp_service.py -v`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add backend/claude_panel/services/claude_json_service.py backend/claude_panel/services/mcp_service.py backend/claude_panel/services/mcp_diagnostics_service.py backend/tests/test_mcp_service.py
git commit -m "fix: rename 'sse' to 'http' across MCP backend to match Claude Code config"
```

---

## Task 2: Add `url` Field Passthrough in Backend Models and Services

**Files:**
- Modify: `backend/claude_panel/services/claude_json_service.py:46-55`
- Modify: `backend/claude_panel/services/mcp_service.py:41-45,49-53`
- Test: `backend/tests/test_mcp_service.py`

Currently, HTTP servers store the URL in the `command` field during normalization (`"command": config.get("command", config.get("url", ""))`). This is a hack — `url` should be its own field.

- [ ] **Step 1: Write test for url field on HTTP servers**

Add to `backend/tests/test_mcp_service.py`:

```python
def test_http_server_has_url_field(self, mock_settings, tmp_claude_json):
    """HTTP servers should have url field set, not stuffed into command."""
    tmp_claude_json.write_text(json.dumps({
        "mcpServers": {
            "my-http": {"type": "http", "url": "https://example.com/mcp"},
        }
    }))
    servers = mcp_service.list_all_servers()
    assert len(servers) == 1
    assert servers[0]["url"] == "https://example.com/mcp"
    assert servers[0]["command"] is None
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/code/Projects/CLI_Agent_Manager && python -m pytest backend/tests/test_mcp_service.py::TestListAllServers::test_http_server_has_url_field -v`
Expected: FAIL — `url` key missing or `command` contains the URL

- [ ] **Step 3: Fix claude_json_service.py — pass url as separate field**

In `backend/claude_panel/services/claude_json_service.py`, update the `append_entries` inner function:

```python
def append_entries(servers: dict | None, scope: str, project_path: str | None = None) -> None:
    if not isinstance(servers, dict):
        return
    for name, config in servers.items():
        if not isinstance(config, dict):
            continue
        is_network_server = "url" in config or config.get("type") == "http"
        entries.append({
            "name": name,
            "server_type": "http" if is_network_server else "stdio",
            "command": config.get("command") if not is_network_server else None,
            "url": config.get("url") if is_network_server else None,
            "args": config.get("args", []) if isinstance(config.get("args"), list) else [],
            "env": config.get("env", {}) if isinstance(config.get("env"), dict) else {},
            "enabled": True,
            "scope": scope,
            "project_path": project_path,
        })
```

- [ ] **Step 4: Fix mcp_service.py — pass url for disabled servers too**

In `backend/claude_panel/services/mcp_service.py`, update the disabled server block:

```python
for name, config in disabled.items():
    is_network = "url" in config or config.get("type") == "http"
    server_type = "http" if is_network else "stdio"
    servers.append({
        "name": name,
        "server_type": server_type,
        "command": config.get("command") if not is_network else None,
        "url": config.get("url") if is_network else None,
        "args": config.get("args", []),
        "env": config.get("env", {}),
        "enabled": False,
        "scope": "global",
        "project_path": None,
        "tool_count": 0,
        "estimated_tokens": 0,
    })
```

- [ ] **Step 5: Fix the existing test assertion**

In `backend/tests/test_mcp_service.py`, `test_includes_project_scoped_servers`:

```python
# Change:
assert project_server["command"] == "https://example.com/mcp"
# To:
assert project_server["url"] == "https://example.com/mcp"
assert project_server["command"] is None
```

- [ ] **Step 6: Update _check_http_url in diagnostics to use url field**

In `backend/claude_panel/services/mcp_diagnostics_service.py`, update `_check_http_url`:

```python
def _check_http_url(server: dict) -> dict:
    if server.get("server_type") != "http":
        return {
            "code": "URL_NOT_REQUIRED",
            "status": "ok",
            "message": "URL check skipped for non-HTTP server.",
        }

    url = str(server.get("url") or "").strip()
    if not url.startswith(("http://", "https://")):
        return {
            "code": "URL_INVALID",
            "status": "fail",
            "message": "HTTP server URL must start with http:// or https://.",
        }

    return {
        "code": "URL_VALID",
        "status": "ok",
        "message": "HTTP URL is configured.",
    }
```

- [ ] **Step 7: Run all tests**

Run: `cd /home/code/Projects/CLI_Agent_Manager && python -m pytest backend/tests/test_mcp_service.py -v`
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add backend/claude_panel/services/claude_json_service.py backend/claude_panel/services/mcp_service.py backend/claude_panel/services/mcp_diagnostics_service.py backend/tests/test_mcp_service.py
git commit -m "refactor: separate url field from command for HTTP MCP servers"
```

---

## Task 3: Add `list_project_paths()` and `GET /mcp/projects` Endpoint

**Files:**
- Modify: `backend/claude_panel/services/mcp_service.py`
- Modify: `backend/claude_panel/routers/mcp.py`
- Test: `backend/tests/test_mcp_service.py`

- [ ] **Step 1: Write test for list_project_paths**

Add to `backend/tests/test_mcp_service.py`:

```python
class TestListProjectPaths:
    def test_returns_project_paths(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({
            "mcpServers": {},
            "projects": {
                "/home/user/project-a": {"allowedTools": []},
                "/home/user/project-b": {"mcpServers": {}},
            }
        }))
        paths = mcp_service.list_project_paths()
        assert paths == ["/home/user/project-a", "/home/user/project-b"]

    def test_returns_empty_when_no_projects(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({"mcpServers": {}}))
        paths = mcp_service.list_project_paths()
        assert paths == []

    def test_returns_sorted(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({
            "mcpServers": {},
            "projects": {
                "/z-project": {},
                "/a-project": {},
                "/m-project": {},
            }
        }))
        paths = mcp_service.list_project_paths()
        assert paths == ["/a-project", "/m-project", "/z-project"]
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /home/code/Projects/CLI_Agent_Manager && python -m pytest backend/tests/test_mcp_service.py::TestListProjectPaths -v`
Expected: FAIL — `list_project_paths` not defined

- [ ] **Step 3: Implement list_project_paths in mcp_service.py**

Add to `backend/claude_panel/services/mcp_service.py`:

```python
from claude_panel.services.claude_json_service import (
    get_mcp_servers, list_mcp_server_entries, set_mcp_servers,
    read_claude_json,  # add this import
)

def list_project_paths() -> list[str]:
    """Return sorted list of known project paths from ~/.claude.json."""
    data = read_claude_json()
    projects = data.get("projects", {})
    if not isinstance(projects, dict):
        return []
    return sorted(projects.keys())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /home/code/Projects/CLI_Agent_Manager && python -m pytest backend/tests/test_mcp_service.py::TestListProjectPaths -v`
Expected: ALL PASS

- [ ] **Step 5: Add GET /mcp/projects endpoint**

In `backend/claude_panel/routers/mcp.py`, add before the `create_mcp_server` function:

```python
@router.get("/mcp/projects")
async def list_mcp_projects():
    return {"projects": mcp_service.list_project_paths()}
```

**Important:** This route must be declared BEFORE `@router.get("/mcp/{name}/diagnose")` to avoid FastAPI treating "projects" as a `{name}` path parameter. Move it right after the `/mcp/health` endpoint.

- [ ] **Step 6: Run full test suite**

Run: `cd /home/code/Projects/CLI_Agent_Manager && python -m pytest backend/tests/ -v`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add backend/claude_panel/services/mcp_service.py backend/claude_panel/routers/mcp.py backend/tests/test_mcp_service.py
git commit -m "feat: add list_project_paths() and GET /mcp/projects endpoint"
```

---

## Task 4: Extend `POST /mcp` to Support HTTP Servers and Project Scope

**Files:**
- Modify: `backend/claude_panel/models/mcp.py`
- Modify: `backend/claude_panel/routers/mcp.py`
- Modify: `backend/claude_panel/services/mcp_service.py`
- Modify: `backend/claude_panel/services/claude_json_service.py`
- Test: `backend/tests/test_mcp_service.py`

- [ ] **Step 1: Write tests for creating HTTP and project-scoped servers**

Add to `backend/tests/test_mcp_service.py`:

```python
class TestCreateServer:
    def test_create_stdio_server(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({"mcpServers": {}}))
        result = mcp_service.create_server(
            name="my-stdio",
            config={"command": "node", "args": ["server.js"], "env": {}},
            scope="global",
            project_path=None,
        )
        assert result["name"] == "my-stdio"
        servers = mcp_service.list_all_servers()
        assert any(s["name"] == "my-stdio" for s in servers)

    def test_create_http_server(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({"mcpServers": {}}))
        result = mcp_service.create_server(
            name="my-http",
            config={"url": "https://example.com/mcp"},
            scope="global",
            project_path=None,
        )
        assert result["name"] == "my-http"
        servers = mcp_service.list_all_servers()
        http_server = next(s for s in servers if s["name"] == "my-http")
        assert http_server["server_type"] == "http"
        assert http_server["url"] == "https://example.com/mcp"

    def test_create_project_scoped_server(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({
            "mcpServers": {},
            "projects": {"/tmp/my-project": {}},
        }))
        result = mcp_service.create_server(
            name="proj-server",
            config={"command": "node", "args": ["s.js"]},
            scope="project",
            project_path="/tmp/my-project",
        )
        assert result["name"] == "proj-server"
        servers = mcp_service.list_all_servers()
        proj = next(s for s in servers if s["name"] == "proj-server")
        assert proj["scope"] == "project"
        assert proj["project_path"] == "/tmp/my-project"

    def test_create_duplicate_name_raises(self, mock_settings):
        with pytest.raises(ValueError, match="already exists"):
            mcp_service.create_server(
                name="test-server",  # already exists in fixture
                config={"command": "node"},
                scope="global",
                project_path=None,
            )

    def test_create_project_scoped_unknown_project_raises(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({"mcpServers": {}}))
        with pytest.raises(ValueError, match="not found"):
            mcp_service.create_server(
                name="new-server",
                config={"command": "node"},
                scope="project",
                project_path="/nonexistent",
            )
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/code/Projects/CLI_Agent_Manager && python -m pytest backend/tests/test_mcp_service.py::TestCreateServer -v`
Expected: FAIL — `create_server` not defined

- [ ] **Step 3: Add project-scoped write helpers to claude_json_service.py**

Add to `backend/claude_panel/services/claude_json_service.py`:

```python
def add_project_mcp_server(project_path: str, name: str, config: dict) -> dict:
    """Add an MCP server to a specific project's config in ~/.claude.json."""
    data = read_claude_json()
    projects = data.setdefault("projects", {})
    if project_path not in projects:
        raise ValueError(f"Project '{project_path}' not found in ~/.claude.json")
    project = projects.setdefault(project_path, {})
    mcp_servers = project.setdefault("mcpServers", {})
    if name in mcp_servers:
        raise ValueError(f"MCP server '{name}' already exists in project '{project_path}'")
    mcp_servers[name] = config
    safe_write_json(_claude_json_path(), data)
    return config


def remove_project_mcp_server(project_path: str, name: str) -> None:
    """Remove an MCP server from a specific project's config."""
    data = read_claude_json()
    projects = data.get("projects", {})
    project = projects.get(project_path, {})
    mcp_servers = project.get("mcpServers", {})
    if name not in mcp_servers:
        raise KeyError(f"MCP server '{name}' not found in project '{project_path}'")
    del mcp_servers[name]
    safe_write_json(_claude_json_path(), data)
```

- [ ] **Step 4: Implement create_server in mcp_service.py**

Add to `backend/claude_panel/services/mcp_service.py`:

```python
from claude_panel.services.claude_json_service import (
    add_mcp_server, get_mcp_servers, list_mcp_server_entries,
    read_claude_json, remove_mcp_server, set_mcp_servers,
    add_project_mcp_server,  # add this import
)

def create_server(name: str, config: dict, scope: str, project_path: str | None) -> dict:
    """Create an MCP server in the specified scope.

    For global scope: writes to mcpServers in ~/.claude.json.
    For project scope: writes to projects[project_path].mcpServers.
    """
    if scope == "project":
        if not project_path:
            raise ValueError("project_path is required for project scope")
        # Check project exists
        data = read_claude_json()
        projects = data.get("projects", {})
        if project_path not in projects:
            raise ValueError(f"Project '{project_path}' not found in config")
        add_project_mcp_server(project_path, name, config)
    else:
        add_mcp_server(name, config)

    return {"name": name, "status": "created"}
```

- [ ] **Step 5: Update the router to use create_server**

In `backend/claude_panel/routers/mcp.py`, replace the `McpServerCreateBody` and `create_mcp_server`:

```python
class McpServerCreateBody(BaseModel):
    name: str
    server_type: str = "stdio"
    command: str | None = None
    args: list[str] = []
    env: dict[str, str] = {}
    url: str | None = None
    scope: str = "global"
    project_path: str | None = None


@router.post("/mcp")
async def create_mcp_server(body: McpServerCreateBody):
    # Build the raw config dict for ~/.claude.json
    if body.server_type == "http":
        if not body.url:
            raise HTTPException(status_code=400, detail="URL is required for HTTP servers")
        config = {"type": "http", "url": body.url}
        if body.env:
            config["env"] = body.env
    else:
        if not body.command:
            raise HTTPException(status_code=400, detail="Command is required for stdio servers")
        config = {"command": body.command, "args": body.args}
        if body.env:
            config["env"] = body.env
    try:
        return mcp_service.create_server(body.name, config, body.scope, body.project_path)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
```

Remove the `add_mcp_server` import from the router since `mcp_service.create_server` handles it now.

- [ ] **Step 6: Run tests**

Run: `cd /home/code/Projects/CLI_Agent_Manager && python -m pytest backend/tests/test_mcp_service.py -v`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add backend/claude_panel/models/mcp.py backend/claude_panel/routers/mcp.py backend/claude_panel/services/mcp_service.py backend/claude_panel/services/claude_json_service.py backend/tests/test_mcp_service.py
git commit -m "feat: extend server creation to support HTTP servers and project scope"
```

---

## Task 5: Add `PUT /mcp/{name}` Update Endpoint

**Files:**
- Modify: `backend/claude_panel/services/claude_json_service.py`
- Modify: `backend/claude_panel/services/mcp_service.py`
- Modify: `backend/claude_panel/routers/mcp.py`
- Test: `backend/tests/test_mcp_service.py`

- [ ] **Step 1: Write tests for update_server**

Add to `backend/tests/test_mcp_service.py`:

```python
class TestUpdateServer:
    def test_update_command(self, mock_settings):
        """Update command of existing server."""
        result = mcp_service.update_server("test-server", {
            "config": {"command": "python", "args": ["-m", "server"]},
        })
        assert result["status"] == "updated"
        servers = mcp_service.list_all_servers()
        s = next(s for s in servers if s["name"] == "test-server")
        assert s["command"] == "python"

    def test_rename_server(self, mock_settings):
        """Rename a server."""
        result = mcp_service.update_server("test-server", {
            "new_name": "renamed-server",
        })
        assert result["name"] == "renamed-server"
        servers = mcp_service.list_all_servers()
        names = [s["name"] for s in servers]
        assert "renamed-server" in names
        assert "test-server" not in names

    def test_change_scope_global_to_project(self, mock_settings, tmp_claude_json):
        tmp_claude_json.write_text(json.dumps({
            "mcpServers": {
                "my-server": {"command": "node", "args": ["s.js"]},
            },
            "projects": {"/tmp/proj": {}},
        }))
        result = mcp_service.update_server("my-server", {
            "scope": "project",
            "project_path": "/tmp/proj",
        })
        assert result["status"] == "updated"
        servers = mcp_service.list_all_servers()
        s = next(s for s in servers if s["name"] == "my-server")
        assert s["scope"] == "project"
        assert s["project_path"] == "/tmp/proj"

    def test_change_type_stdio_to_http(self, mock_settings):
        """Change server from stdio to http."""
        result = mcp_service.update_server("test-server", {
            "config": {"type": "http", "url": "https://example.com/mcp"},
        })
        assert result["status"] == "updated"
        servers = mcp_service.list_all_servers()
        s = next(s for s in servers if s["name"] == "test-server")
        assert s["server_type"] == "http"
        assert s["url"] == "https://example.com/mcp"

    def test_update_nonexistent_raises(self, mock_settings):
        with pytest.raises(KeyError, match="not found"):
            mcp_service.update_server("nonexistent", {"config": {"command": "node"}})

    def test_update_disabled_server(self, mock_settings):
        """Can update a disabled server in the sidecar."""
        mcp_service.toggle_server("test-server", False)
        result = mcp_service.update_server("test-server", {
            "config": {"command": "python", "args": ["new.py"]},
        })
        assert result["status"] == "updated"
        servers = mcp_service.list_all_servers()
        s = next(s for s in servers if s["name"] == "test-server")
        assert s["command"] == "python"
        assert s["enabled"] is False
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/code/Projects/CLI_Agent_Manager && python -m pytest backend/tests/test_mcp_service.py::TestUpdateServer -v`
Expected: FAIL — `update_server` not defined

- [ ] **Step 3: Add update helpers to claude_json_service.py**

Add to `backend/claude_panel/services/claude_json_service.py`:

```python
def update_project_mcp_server(project_path: str, name: str, config: dict) -> None:
    """Update an existing MCP server in a project's config."""
    data = read_claude_json()
    projects = data.get("projects", {})
    project = projects.get(project_path, {})
    mcp_servers = project.get("mcpServers", {})
    if name not in mcp_servers:
        raise KeyError(f"MCP server '{name}' not found in project '{project_path}'")
    mcp_servers[name] = config
    safe_write_json(_claude_json_path(), data)
```

- [ ] **Step 4: Implement update_server in mcp_service.py**

Add to `backend/claude_panel/services/mcp_service.py`:

```python
from claude_panel.services.claude_json_service import (
    add_mcp_server, add_project_mcp_server, get_mcp_servers,
    list_mcp_server_entries, read_claude_json, remove_mcp_server,
    remove_project_mcp_server, set_mcp_servers,
    update_mcp_server as update_global_mcp_server,
    update_project_mcp_server,
)


def update_server(old_name: str, updates: dict) -> dict:
    """Update an existing MCP server.

    Supports: config changes, rename, scope change (global<->project).
    Also handles disabled servers in the sidecar.
    """
    new_name = updates.get("new_name", old_name)
    new_scope = updates.get("scope")
    new_project_path = updates.get("project_path")
    new_config = updates.get("config")

    # Find the server
    all_servers = list_all_servers()
    server = next((s for s in all_servers if s["name"] == old_name), None)
    if not server:
        raise KeyError(f"Server '{old_name}' not found")

    old_scope = server["scope"]
    old_project_path = server.get("project_path")
    is_disabled = not server["enabled"]

    # Determine the effective new scope
    if new_scope is None:
        new_scope = old_scope
    if new_scope == "project" and new_project_path is None:
        new_project_path = old_project_path

    # Get current raw config
    if is_disabled:
        disabled = _read_sidecar()
        current_config = disabled.get(old_name, {})
    elif old_scope == "project" and old_project_path:
        data = read_claude_json()
        current_config = data.get("projects", {}).get(old_project_path, {}).get("mcpServers", {}).get(old_name, {})
    else:
        current_config = get_mcp_servers().get(old_name, {})

    # Apply config changes
    final_config = new_config if new_config else current_config

    # Handle disabled servers (sidecar)
    if is_disabled:
        disabled = _read_sidecar()
        if old_name in disabled:
            del disabled[old_name]
        disabled[new_name] = final_config
        _write_sidecar(disabled)
        return {"name": new_name, "status": "updated"}

    # Handle scope change
    scope_changed = new_scope != old_scope
    name_changed = new_name != old_name

    # Remove from old location
    if scope_changed or name_changed:
        if old_scope == "project" and old_project_path:
            remove_project_mcp_server(old_project_path, old_name)
        else:
            remove_mcp_server(old_name)

        # Add to new location
        if new_scope == "project" and new_project_path:
            add_project_mcp_server(new_project_path, new_name, final_config)
        else:
            add_mcp_server(new_name, final_config)
    else:
        # Same scope, same name — just update in place
        if old_scope == "project" and old_project_path:
            update_project_mcp_server(old_project_path, old_name, final_config)
        else:
            update_global_mcp_server(old_name, final_config)

    return {"name": new_name, "status": "updated"}
```

- [ ] **Step 5: Add PUT endpoint to router**

In `backend/claude_panel/routers/mcp.py`, add:

```python
class McpServerUpdateBody(BaseModel):
    new_name: str | None = None
    server_type: str | None = None
    command: str | None = None
    args: list[str] | None = None
    env: dict[str, str] | None = None
    url: str | None = None
    scope: str | None = None
    project_path: str | None = None


@router.put("/mcp/{name}")
async def update_mcp_server(name: str, body: McpServerUpdateBody):
    # Build config dict from body fields
    updates: dict = {}
    if body.new_name:
        updates["new_name"] = body.new_name
    if body.scope:
        updates["scope"] = body.scope
    if body.project_path:
        updates["project_path"] = body.project_path

    # Build config if any config fields are provided
    config_fields = {}
    if body.server_type == "http":
        if body.url:
            config_fields["type"] = "http"
            config_fields["url"] = body.url
        if body.env is not None:
            config_fields["env"] = body.env
    elif body.server_type == "stdio" or body.command is not None:
        if body.command is not None:
            config_fields["command"] = body.command
        if body.args is not None:
            config_fields["args"] = body.args
        if body.env is not None:
            config_fields["env"] = body.env
    if config_fields:
        updates["config"] = config_fields

    try:
        return mcp_service.update_server(name, updates)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

Also remove the `remove_mcp_server` import from the top since the router no longer calls it directly (the delete endpoint should use `mcp_service` too, but that's the existing pattern — leave it for now).

- [ ] **Step 6: Run all tests**

Run: `cd /home/code/Projects/CLI_Agent_Manager && python -m pytest backend/tests/ -v`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add backend/claude_panel/services/claude_json_service.py backend/claude_panel/services/mcp_service.py backend/claude_panel/routers/mcp.py backend/tests/test_mcp_service.py
git commit -m "feat: add PUT /mcp/{name} endpoint for editing MCP servers"
```

---

## Task 6: Add 3 New Diagnostic Checks

**Files:**
- Modify: `backend/claude_panel/services/mcp_diagnostics_service.py`
- Create: `backend/tests/test_mcp_diagnostics_service.py`

- [ ] **Step 1: Write tests for new diagnostic checks**

Create `backend/tests/test_mcp_diagnostics_service.py`:

```python
"""Tests for enhanced MCP diagnostics checks."""

import pytest

from claude_panel.services.mcp_diagnostics_service import (
    _check_duplicate_name,
    _check_empty_env_values,
    _check_http_url_reachability,
    diagnose_server,
)


class TestCheckDuplicateName:
    def test_no_duplicates(self):
        all_servers = [
            {"name": "server-a", "scope": "global"},
            {"name": "server-b", "scope": "project"},
        ]
        result = _check_duplicate_name("server-a", all_servers)
        assert result["status"] == "ok"

    def test_duplicate_across_scopes(self):
        all_servers = [
            {"name": "my-server", "scope": "global"},
            {"name": "my-server", "scope": "project"},
        ]
        result = _check_duplicate_name("my-server", all_servers)
        assert result["status"] == "warn"
        assert "global" in result["message"]
        assert "project" in result["message"]

    def test_no_match(self):
        all_servers = [
            {"name": "other", "scope": "global"},
        ]
        result = _check_duplicate_name("missing", all_servers)
        assert result["status"] == "ok"


class TestCheckEmptyEnvValues:
    def test_no_env(self):
        result = _check_empty_env_values({"env": {}})
        assert result["status"] == "ok"

    def test_valid_env(self):
        result = _check_empty_env_values({"env": {"KEY": "value"}})
        assert result["status"] == "ok"

    def test_empty_value(self):
        result = _check_empty_env_values({"env": {"API_KEY": "", "OTHER": "fine"}})
        assert result["status"] == "warn"
        assert "API_KEY" in result["message"]
        assert "OTHER" not in result["message"]

    def test_multiple_empty(self):
        result = _check_empty_env_values({"env": {"A": "", "B": "", "C": "ok"}})
        assert result["status"] == "warn"
        assert "A" in result["message"]
        assert "B" in result["message"]


class TestCheckHttpUrlReachability:
    def test_skips_stdio(self):
        result = _check_http_url_reachability({"server_type": "stdio"})
        assert result["status"] == "ok"
        assert result["code"] == "URL_REACHABILITY_SKIPPED"

    def test_no_url(self):
        result = _check_http_url_reachability({"server_type": "http", "url": None})
        assert result["status"] == "warn"
        assert result["code"] == "URL_REACHABILITY_NO_URL"

    def test_unreachable_url(self):
        result = _check_http_url_reachability({
            "server_type": "http",
            "url": "http://192.0.2.1:1/mcp",  # RFC 5737 TEST-NET, guaranteed unreachable
        })
        assert result["status"] == "warn"
        assert result["code"] == "URL_REACHABILITY_FAILED"


class TestDiagnoseServerWithNewChecks:
    def test_includes_empty_env_check(self):
        server = {
            "server_type": "stdio",
            "command": "node",
            "args": [],
            "env": {"KEY": ""},
        }
        report = diagnose_server(server)
        codes = [c["code"] for c in report["checks"]]
        assert "ENV_EMPTY_VALUES" in codes
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/code/Projects/CLI_Agent_Manager && python -m pytest backend/tests/test_mcp_diagnostics_service.py -v`
Expected: FAIL — functions not defined

- [ ] **Step 3: Implement the 3 new checks**

Add to `backend/claude_panel/services/mcp_diagnostics_service.py`:

```python
import httpx  # add to imports at top

def _check_duplicate_name(server_name: str, all_servers: list[dict]) -> dict:
    """Warn if the same server name appears in multiple scopes."""
    matches = [s for s in all_servers if s.get("name") == server_name]
    if len(matches) <= 1:
        return {
            "code": "NAME_UNIQUE",
            "status": "ok",
            "message": "Server name is unique across scopes.",
        }
    scopes = [s.get("scope", "unknown") for s in matches]
    return {
        "code": "NAME_DUPLICATE",
        "status": "warn",
        "message": f"Server '{server_name}' exists in multiple scopes: {', '.join(scopes)}.",
    }


def _check_empty_env_values(server: dict) -> dict:
    """Warn when env vars have empty string values."""
    env = server.get("env", {})
    if not isinstance(env, dict):
        return {"code": "ENV_EMPTY_SKIPPED", "status": "ok", "message": "Env is not a dict."}
    empty_keys = [k for k, v in env.items() if isinstance(v, str) and v == ""]
    if not empty_keys:
        return {
            "code": "ENV_VALUES_OK",
            "status": "ok",
            "message": "All env values are non-empty.",
        }
    return {
        "code": "ENV_EMPTY_VALUES",
        "status": "warn",
        "message": f"Empty values for: {', '.join(empty_keys)}.",
    }


def _check_http_url_reachability(server: dict) -> dict:
    """For HTTP servers, check if the URL is reachable (HEAD with 3s timeout)."""
    if server.get("server_type") != "http":
        return {
            "code": "URL_REACHABILITY_SKIPPED",
            "status": "ok",
            "message": "URL reachability check skipped for non-HTTP server.",
        }

    url = server.get("url")
    if not url:
        return {
            "code": "URL_REACHABILITY_NO_URL",
            "status": "warn",
            "message": "No URL configured for HTTP server.",
        }

    try:
        with httpx.Client(timeout=3.0) as client:
            resp = client.head(url)
            if resp.status_code < 400:
                return {
                    "code": "URL_REACHABLE",
                    "status": "ok",
                    "message": f"URL responded with status {resp.status_code}.",
                }
            return {
                "code": "URL_REACHABILITY_ERROR",
                "status": "warn",
                "message": f"URL responded with status {resp.status_code}.",
            }
    except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError) as e:
        return {
            "code": "URL_REACHABILITY_FAILED",
            "status": "warn",
            "message": f"Cannot reach URL: {type(e).__name__}.",
        }
```

- [ ] **Step 4: Wire new checks into diagnose_server**

Update the `diagnose_server` function in `mcp_diagnostics_service.py`:

```python
def diagnose_server(server: dict, all_servers: list[dict] | None = None) -> dict:
    """Return diagnostics for one MCP server config."""
    checks = [
        _check_transport(server),
        _check_stdio_command(server),
        _check_http_url(server),
        _check_args(server),
        _check_env(server),
        _check_empty_env_values(server),
        _check_http_url_reachability(server),
    ]

    # Duplicate name check requires the full server list
    if all_servers is not None:
        checks.append(_check_duplicate_name(server.get("name", ""), all_servers))

    if any(c["status"] == "fail" for c in checks):
        status = "fail"
    elif any(c["status"] == "warn" for c in checks):
        status = "warn"
    else:
        status = "ok"

    return {
        "status": status,
        "checks": checks,
        "checked_at": time.time(),
    }
```

- [ ] **Step 5: Update mcp_service.py to pass all_servers to diagnose**

In `backend/claude_panel/services/mcp_service.py`, update `diagnose_server` and `diagnose_all_servers`:

```python
def diagnose_server(name: str) -> dict:
    """Return diagnostics for one configured MCP server."""
    servers = list_all_servers()
    matching_servers = [s for s in servers if s["name"] == name]
    server = next((s for s in matching_servers if s.get("scope") == "global"), None)
    if server is None and matching_servers:
        server = matching_servers[0]
    if not server:
        raise KeyError(f"Server '{name}' not found")

    report = diagnose_server_config(server, all_servers=servers)
    return {
        "name": name,
        "enabled": server["enabled"],
        "server_type": server["server_type"],
        "scope": server["scope"],
        "project_path": server.get("project_path"),
        **report,
    }


def diagnose_all_servers() -> dict:
    """Return diagnostics for all configured MCP servers."""
    all_servers = list_all_servers()
    reports = []
    for server in all_servers:
        report = diagnose_server_config(server, all_servers=all_servers)
        reports.append({
            "name": server["name"],
            "enabled": server["enabled"],
            "server_type": server["server_type"],
            "scope": server["scope"],
            "project_path": server.get("project_path"),
            **report,
        })
    return {"servers": reports, "total": len(reports)}
```

- [ ] **Step 6: Run tests**

Run: `cd /home/code/Projects/CLI_Agent_Manager && python -m pytest backend/tests/test_mcp_diagnostics_service.py backend/tests/test_mcp_service.py -v`
Expected: ALL PASS

- [ ] **Step 7: Commit**

```bash
git add backend/claude_panel/services/mcp_diagnostics_service.py backend/claude_panel/services/mcp_service.py backend/tests/test_mcp_diagnostics_service.py
git commit -m "feat: add duplicate name, empty env, and URL reachability diagnostic checks"
```

---

## Task 7: Frontend Types and API Hooks

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/api/mcp.ts`

- [ ] **Step 1: Update types.ts**

In `frontend/src/types.ts`, replace the MCP section:

```typescript
// ---- MCP Servers ----
export interface McpServer {
  name: string;
  server_type: "stdio" | "http";
  command: string | null;
  args: string[];
  env: Record<string, string>;
  url: string | null;
  enabled: boolean;
  scope: "global" | "project" | "plugin";
  project_path?: string | null;
  plugin_id?: string | null;
  read_only?: boolean;
  tool_count: number;
  estimated_tokens: number;
}

export interface McpServerCreateRequest {
  name: string;
  server_type: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  scope: "global" | "project";
  project_path?: string | null;
}

export interface McpServerUpdateRequest {
  new_name?: string;
  server_type?: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  scope?: "global" | "project";
  project_path?: string | null;
}

export interface McpServerListResponse {
  servers: McpServer[];
  total_tokens: number;
}

export interface McpProjectsResponse {
  projects: string[];
}
```

- [ ] **Step 2: Update api/mcp.ts — add update hook and project paths hook**

Replace `frontend/src/api/mcp.ts` with:

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "./client";
import type {
  McpServerListResponse,
  McpServerCreateRequest,
  McpServerUpdateRequest,
  McpProjectsResponse,
} from "../types";

export function useMcpServers() {
  return useQuery({
    queryKey: ["mcp-servers"],
    queryFn: () => get<McpServerListResponse>("/mcp"),
  });
}

export function useProjectPaths() {
  return useQuery({
    queryKey: ["mcp-projects"],
    queryFn: () => get<McpProjectsResponse>("/mcp/projects"),
  });
}

export function useToggleMcpServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      put<{ name: string; enabled: boolean; status: string }>(
        `/mcp/${encodeURIComponent(name)}/toggle?enabled=${enabled}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-servers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCreateMcpServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: McpServerCreateRequest) =>
      post<{ name: string; status: string }>("/mcp", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-servers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateMcpServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, data }: { name: string; data: McpServerUpdateRequest }) =>
      put<{ name: string; status: string }>(`/mcp/${encodeURIComponent(name)}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-servers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteMcpServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      del<{ name: string; status: string }>(`/mcp/${encodeURIComponent(name)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-servers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /home/code/Projects/CLI_Agent_Manager/frontend && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types.ts frontend/src/api/mcp.ts
git commit -m "feat: update frontend types and API hooks for MCP enhancements"
```

---

## Task 8: Update McpServerCard — Edit Button and "http" Label

**Files:**
- Modify: `frontend/src/components/McpServerCard.tsx`

- [ ] **Step 1: Add edit button and fix label**

Replace `frontend/src/components/McpServerCard.tsx` with:

```tsx
import {
  Card,
  CardContent,
  Typography,
  Switch,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import TerminalIcon from "@mui/icons-material/Terminal";
import WifiIcon from "@mui/icons-material/Wifi";
import ExtensionIcon from "@mui/icons-material/Extension";
import type { McpServer } from "../types";
import TokenBadge from "./TokenBadge";

interface McpServerCardProps {
  server: McpServer;
  onToggle: (name: string, enabled: boolean) => void;
  onDelete: (name: string) => void;
  onEdit: (server: McpServer) => void;
  toggling?: boolean;
}

export default function McpServerCard({
  server,
  onToggle,
  onDelete,
  onEdit,
  toggling,
}: McpServerCardProps) {
  const isReadOnly = server.scope === "project" || server.scope === "plugin";

  return (
    <Card
      sx={{
        opacity: server.enabled ? 1 : 0.6,
        transition: "opacity 0.2s",
      }}
    >
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Typography variant="h5">{server.name}</Typography>
              <Chip
                icon={
                  server.server_type === "stdio" ? (
                    <TerminalIcon sx={{ fontSize: 14 }} />
                  ) : (
                    <WifiIcon sx={{ fontSize: 14 }} />
                  )
                }
                label={server.server_type}
                size="small"
                sx={{
                  bgcolor: (t) =>
                    server.server_type === "stdio"
                      ? alpha(t.palette.warning.main, 0.1)
                      : alpha(t.palette.info.main, 0.1),
                  color: server.server_type === "stdio" ? "warning.main" : "info.main",
                  "& .MuiChip-icon": {
                    color: server.server_type === "stdio" ? "warning.main" : "info.main",
                  },
                }}
              />
              <Chip
                icon={server.scope === "plugin" ? <ExtensionIcon sx={{ fontSize: 14 }} /> : undefined}
                label={server.scope}
                size="small"
                variant="outlined"
                sx={server.scope === "plugin" ? {
                  borderColor: "#7C3AED",
                  color: "#7C3AED",
                  "& .MuiChip-icon": { color: "#7C3AED" },
                } : undefined}
              />
            </Box>
            {server.project_path && (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "text.secondary",
                  mb: 1,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.65rem",
                  wordBreak: "break-all",
                }}
              >
                {server.project_path}
              </Typography>
            )}
            {server.scope === "plugin" && server.plugin_id && (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "#7C3AED",
                  mb: 1,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "0.65rem",
                  wordBreak: "break-all",
                }}
              >
                Managed by plugin: {server.plugin_id}
              </Typography>
            )}
            <Typography
              variant="body2"
              sx={{
                fontFamily: "'JetBrains Mono', monospace",
                color: "text.secondary",
                mb: 1,
                fontSize: "0.75rem",
                wordBreak: "break-all",
              }}
            >
              {server.server_type === "http"
                ? server.url
                : `${server.command} ${server.args.join(" ")}`}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {server.tool_count > 0 && (
                <Chip
                  label={`${server.tool_count} tool${server.tool_count !== 1 ? "s" : ""}`}
                  size="small"
                  variant="outlined"
                />
              )}
              <TokenBadge tokens={server.estimated_tokens} />
            </Box>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
            <Switch
              checked={server.enabled}
              onChange={(_, checked) => onToggle(server.name, checked)}
              disabled={toggling || isReadOnly}
              color="primary"
            />
            <Box sx={{ display: "flex", gap: 0.25 }}>
              <Tooltip title={isReadOnly ? "Read-only" : "Edit server"}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => onEdit(server)}
                    disabled={isReadOnly}
                    sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
                  >
                    <EditIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title={isReadOnly ? (server.scope === "plugin" ? "Managed by plugin" : "Read-only") : "Delete server"}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => onDelete(server.name)}
                    disabled={isReadOnly}
                    sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </span>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
```

Key changes:
- Added `onEdit` prop
- Added `EditIcon` import and edit button next to delete
- Command display now shows `server.url` for HTTP servers, `command + args` for stdio
- Labels now show "http" instead of "sse" (data comes from backend)
- Wrapped icon buttons in `<span>` for tooltip on disabled buttons

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/code/Projects/CLI_Agent_Manager/frontend && npx tsc --noEmit`
Expected: Type errors in McpServersPage.tsx (missing `onEdit` prop) — this is expected, we'll fix it in Task 9

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/McpServerCard.tsx
git commit -m "feat: add edit button and fix http label in MCP server card"
```

---

## Task 9: Update McpServersPage — Server Type Toggle, URL Field, Scope Picker, Edit Dialog

**Files:**
- Modify: `frontend/src/pages/McpServersPage.tsx`

This is the largest frontend change. The page gets:
- Server type toggle (stdio/http) in the form
- URL field (shown when http selected)
- Scope picker (Global / project paths from API)
- Edit dialog (reuses the same form, pre-populated)

- [ ] **Step 1: Rewrite McpServersPage.tsx**

Replace `frontend/src/pages/McpServersPage.tsx` with:

```tsx
import { useState } from "react";
import {
  Box,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import TerminalIcon from "@mui/icons-material/Terminal";
import WifiIcon from "@mui/icons-material/Wifi";
import {
  useMcpServers,
  useToggleMcpServer,
  useCreateMcpServer,
  useDeleteMcpServer,
  useUpdateMcpServer,
  useProjectPaths,
} from "../api/mcp";
import type { McpServer } from "../types";
import McpServerCard from "../components/McpServerCard";
import ConfirmDialog from "../components/ConfirmDialog";
import LoadingCard from "../components/LoadingCard";

type DialogMode = "create" | "edit" | null;

export default function McpServersPage() {
  const { data, isLoading, error } = useMcpServers();
  const { data: projectData } = useProjectPaths();
  const servers = data?.servers ?? [];
  const projectPaths = projectData?.projects ?? [];
  const globalServers = servers.filter((server) => server.scope === "global");
  const projectServers = servers.filter((server) => server.scope === "project");
  const pluginServers = servers.filter((server) => server.scope === "plugin");
  const toggleServer = useToggleMcpServer();
  const createServer = useCreateMcpServer();
  const deleteServer = useDeleteMcpServer();
  const updateServer = useUpdateMcpServer();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formServerType, setFormServerType] = useState<"stdio" | "http">("stdio");
  const [formCommand, setFormCommand] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formArgs, setFormArgs] = useState("");
  const [formEnv, setFormEnv] = useState("");
  const [formScope, setFormScope] = useState<"global" | "project">("global");
  const [formProjectPath, setFormProjectPath] = useState("");

  const openCreate = () => {
    resetForm();
    setDialogMode("create");
  };

  const openEdit = (server: McpServer) => {
    setDialogMode("edit");
    setEditingName(server.name);
    setFormName(server.name);
    setFormServerType(server.server_type === "http" ? "http" : "stdio");
    setFormCommand(server.command ?? "");
    setFormUrl(server.url ?? "");
    setFormArgs(server.args.join("\n"));
    setFormEnv(
      Object.entries(server.env)
        .map(([k, v]) => `${k}=${v}`)
        .join("\n"),
    );
    setFormScope(server.scope === "project" ? "project" : "global");
    setFormProjectPath(server.project_path ?? "");
  };

  const resetForm = () => {
    setDialogMode(null);
    setEditingName(null);
    setFormName("");
    setFormServerType("stdio");
    setFormCommand("");
    setFormUrl("");
    setFormArgs("");
    setFormEnv("");
    setFormScope("global");
    setFormProjectPath("");
  };

  const parseEnv = (raw: string): Record<string, string> => {
    if (!raw.trim()) return {};
    try {
      return Object.fromEntries(
        raw
          .split("\n")
          .filter((l) => l.includes("="))
          .map((l) => {
            const idx = l.indexOf("=");
            return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
          }),
      );
    } catch {
      return {};
    }
  };

  const parseArgs = (raw: string): string[] =>
    raw
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean);

  const handleToggle = (name: string, enabled: boolean) => {
    toggleServer.mutate(
      { name, enabled },
      {
        onSuccess: () =>
          setToast({ msg: `${name} ${enabled ? "enabled" : "disabled"}`, severity: "success" }),
        onError: (e) => setToast({ msg: (e as Error).message, severity: "error" }),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteServer.mutate(deleteTarget, {
      onSuccess: () => {
        setToast({ msg: `${deleteTarget} deleted`, severity: "success" });
        setDeleteTarget(null);
      },
      onError: (e) => {
        setToast({ msg: (e as Error).message, severity: "error" });
        setDeleteTarget(null);
      },
    });
  };

  const handleSubmit = () => {
    const env = parseEnv(formEnv);
    const args = parseArgs(formArgs);

    if (dialogMode === "create") {
      createServer.mutate(
        {
          name: formName,
          server_type: formServerType,
          command: formServerType === "stdio" ? formCommand : undefined,
          url: formServerType === "http" ? formUrl : undefined,
          args: formServerType === "stdio" ? args : undefined,
          env,
          scope: formScope,
          project_path: formScope === "project" ? formProjectPath : null,
        },
        {
          onSuccess: () => {
            setToast({ msg: `${formName} created`, severity: "success" });
            resetForm();
          },
          onError: (e) => setToast({ msg: (e as Error).message, severity: "error" }),
        },
      );
    } else if (dialogMode === "edit" && editingName) {
      updateServer.mutate(
        {
          name: editingName,
          data: {
            new_name: formName !== editingName ? formName : undefined,
            server_type: formServerType,
            command: formServerType === "stdio" ? formCommand : undefined,
            url: formServerType === "http" ? formUrl : undefined,
            args: formServerType === "stdio" ? args : undefined,
            env,
            scope: formScope,
            project_path: formScope === "project" ? formProjectPath : null,
          },
        },
        {
          onSuccess: () => {
            setToast({ msg: `${formName} updated`, severity: "success" });
            resetForm();
          },
          onError: (e) => setToast({ msg: (e as Error).message, severity: "error" }),
        },
      );
    }
  };

  const isFormValid =
    formName.trim() &&
    (formServerType === "stdio" ? formCommand.trim() : formUrl.trim()) &&
    (formScope === "project" ? formProjectPath : true);

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load MCP servers: {(error as Error).message}</Alert>
      </Box>
    );
  }

  const renderSection = (title: string, items: typeof servers, badge: string) => (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography variant="h4">{title}</Typography>
        <Chip label={badge} size="small" variant="outlined" />
      </Box>
      {isLoading ? (
        <Grid container spacing={2}>
          {[0, 1].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 6 }}>
              <LoadingCard />
            </Grid>
          ))}
        </Grid>
      ) : items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No servers configured
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {items.map((s) => (
            <Grid key={`${s.scope}:${s.project_path ?? ""}:${s.name}`} size={{ xs: 12, md: 6 }}>
              <McpServerCard
                server={s}
                onToggle={handleToggle}
                onDelete={setDeleteTarget}
                onEdit={openEdit}
                toggling={toggleServer.isPending}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <Box />
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          Add Server
        </Button>
      </Box>

      {renderSection("Global MCP Servers", globalServers, "~/.claude.json")}
      {renderSection("Project MCP Servers", projectServers, "projects[*].mcpServers")}
      {pluginServers.length > 0 && renderSection("Plugin MCP Servers", pluginServers, "plugins")}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogMode !== null} onClose={resetForm} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogMode === "edit" ? "Edit Server" : "Add MCP Server"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <TextField
            label="Server Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            fullWidth
            size="small"
          />

          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary", mb: 0.5, display: "block" }}>
              Server Type
            </Typography>
            <ToggleButtonGroup
              value={formServerType}
              exclusive
              onChange={(_, val) => val && setFormServerType(val)}
              size="small"
              fullWidth
            >
              <ToggleButton value="stdio">
                <TerminalIcon sx={{ fontSize: 16, mr: 0.5 }} /> stdio
              </ToggleButton>
              <ToggleButton value="http">
                <WifiIcon sx={{ fontSize: 16, mr: 0.5 }} /> http
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {formServerType === "stdio" ? (
            <>
              <TextField
                label="Command"
                value={formCommand}
                onChange={(e) => setFormCommand(e.target.value)}
                fullWidth
                size="small"
                placeholder="npx -y @modelcontextprotocol/server-name"
              />
              <TextField
                label="Arguments (one per line)"
                value={formArgs}
                onChange={(e) => setFormArgs(e.target.value)}
                fullWidth
                size="small"
                multiline
                rows={3}
                placeholder={"--port\n3000"}
              />
            </>
          ) : (
            <TextField
              label="URL"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
              fullWidth
              size="small"
              placeholder="https://example.com/mcp"
            />
          )}

          <TextField
            label="Environment Variables (KEY=VALUE, one per line)"
            value={formEnv}
            onChange={(e) => setFormEnv(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={3}
            placeholder={"API_KEY=your-key\nDEBUG=true"}
          />

          <FormControl size="small" fullWidth>
            <InputLabel>Scope</InputLabel>
            <Select
              value={formScope === "project" ? `project:${formProjectPath}` : "global"}
              label="Scope"
              onChange={(e) => {
                const val = e.target.value;
                if (val === "global") {
                  setFormScope("global");
                  setFormProjectPath("");
                } else if (val.startsWith("project:")) {
                  setFormScope("project");
                  setFormProjectPath(val.slice("project:".length));
                }
              }}
              renderValue={(selected) => {
                if (selected === "global") return "Global";
                const path = selected.replace("project:", "");
                return `Project: ${path.split("/").pop()}`;
              }}
            >
              <MenuItem value="global">Global</MenuItem>
              {projectPaths.map((p) => (
                <MenuItem key={p} value={`project:${p}`}>
                  <Typography
                    sx={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: "0.8rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p}
                  </Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={resetForm} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!isFormValid || createServer.isPending || updateServer.isPending}
          >
            {dialogMode === "edit" ? "Save" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete MCP Server"
        message={`Are you sure you want to remove "${deleteTarget}"? This cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert severity={toast?.severity} onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /home/code/Projects/CLI_Agent_Manager/frontend && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Build frontend**

Run: `cd /home/code/Projects/CLI_Agent_Manager && npm run build:frontend`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/McpServersPage.tsx
git commit -m "feat: add server type toggle, URL field, scope picker, and edit dialog to MCP page"
```

---

## Task 10: End-to-End Smoke Test

**Files:** None — verification only

- [ ] **Step 1: Run all backend tests**

Run: `cd /home/code/Projects/CLI_Agent_Manager && python -m pytest backend/tests/ -v`
Expected: ALL PASS

- [ ] **Step 2: Run frontend type check**

Run: `cd /home/code/Projects/CLI_Agent_Manager/frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Build frontend**

Run: `cd /home/code/Projects/CLI_Agent_Manager && npm run build:frontend`
Expected: Build succeeds

- [ ] **Step 4: Start dev server and verify**

Run: `cd /home/code/Projects/CLI_Agent_Manager && claude-panel`

Verify in browser at `http://localhost:8787`:
1. MCP Servers page loads with servers grouped by scope
2. Server cards show "http" label (not "sse") for HTTP servers like figma, paper, manifest-movies
3. HTTP server cards display the URL instead of command
4. Edit button appears on global server cards, disabled on plugin cards
5. Click "Add Server" — form shows server type toggle (stdio/http)
6. Toggle to "http" — URL field appears, command/args fields hide
7. Scope dropdown shows "Global" + project paths
8. Click edit on an existing server — dialog pre-fills with current values
9. Change name and save — server updates

- [ ] **Step 5: Final commit if any fixes needed**

If smoke test revealed issues, fix them and commit:
```bash
git add -A
git commit -m "fix: address smoke test findings in MCP server management"
```
