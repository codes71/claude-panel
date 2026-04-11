# Enhanced MCP Server Management

**Date:** 2026-04-11
**Status:** Approved
**Issue:** #4 (pivoted from research findings to real gaps)

## Problem

The MCP server management UI has 5 gaps that limit its usefulness:

1. **Can't create HTTP servers** — no URL field in the form, even though Claude Code supports `type: "http"` servers with a `url` field
2. **Can't edit existing servers** — only delete + recreate
3. **"sse" vs "http" naming mismatch** — panel uses "sse" internally, Claude Code config uses "http"
4. **No project-scoped server creation** — all servers forced to global scope
5. **Basic diagnostics** — only checks command-on-PATH and URL format

## Approach

In-place enhancement of existing MCP page and components. No new UI patterns — reuse the dialog-based form for both create and edit. All MCP business logic stays in `mcp_service.py`.

---

## Section 1: Backend API Changes

### New Endpoints

**`PUT /mcp/{name}`** — Update an existing server.

Request body:
```python
class McpServerUpdateBody(BaseModel):
    new_name: str | None = None        # Rename (optional)
    server_type: str | None = None     # "stdio" | "http"
    command: str | None = None         # Required if server_type is "stdio"
    args: list[str] | None = None
    env: dict[str, str] | None = None
    url: str | None = None             # Required if server_type is "http"
    scope: str | None = None           # "global" | "project"
    project_path: str | None = None    # Required if scope is "project"
```

Behavior:
- If `new_name` differs from path param `{name}`, delete old entry and create under new name
- If `scope` changes (global <-> project), remove from old location and write to new location
- Returns `{"name": "<final_name>", "status": "updated"}`
- Returns 404 if server not found, 400 if validation fails
- Plugin and read-only servers cannot be updated (returns 403)

**`GET /mcp/projects`** — List known project paths.

Response:
```json
{
  "projects": ["/home/code/Projects/CLI_Agent_Manager", "/home/code/manifestMovies/manifest-movies-next"]
}
```

Source: `~/.claude.json` `projects` key.

### Extended Endpoint

**`POST /mcp`** — Extended create request.

```python
class McpServerCreateBody(BaseModel):
    name: str
    server_type: str = "stdio"         # "stdio" | "http"
    command: str | None = None         # Required if server_type is "stdio"
    args: list[str] = []
    env: dict[str, str] = {}
    url: str | None = None             # Required if server_type is "http"
    scope: str = "global"              # "global" | "project"
    project_path: str | None = None    # Required if scope is "project"
```

Validation:
- If `server_type == "stdio"`: `command` is required, `url` is ignored
- If `server_type == "http"`: `url` is required, `command`/`args` are ignored
- If `scope == "project"`: `project_path` is required and must exist in known projects
- Server name must not already exist in the target scope

### Naming Fix

All API responses use `"http"` instead of `"sse"` for HTTP-type servers.

---

## Section 2: Backend Service Changes

All new logic goes in **`mcp_service.py`**. `claude_json_service.py` stays as low-level JSON read/write — `mcp_service.py` calls it for file I/O but owns all MCP business logic.

### New Functions in `mcp_service.py`

**`update_server(old_name: str, updates: dict) -> dict`**

Handles all mutation scenarios:
- Same scope, same name: update fields in place in `~/.claude.json`
- Name changed: delete old key, write new key in same scope
- Scope changed (global <-> project): remove from old location, write to new location
- If server is disabled (in sidecar file), update there too
- Returns the updated server dict

**`create_server(name: str, config: dict, scope: str, project_path: str | None) -> dict`**

Extended version of existing `add_mcp_server`:
- Supports both stdio and http server types
- Supports global and project scope
- For project scope: writes to `projects[project_path].mcpServers` in `~/.claude.json`
- Returns the created server dict

**`list_project_paths() -> list[str]`**

Reads `~/.claude.json`'s `projects` key, returns sorted list of project paths.

### Changes to Existing Functions

**`list_all_servers()`**
- Normalize "sse" to "http" on read (for backward compat with sidecar file)
- Server type detection: if config has `url` key → "http", if config has `command` key → "stdio"

### `McpServerType` Enum

```python
class McpServerType(str, Enum):
    STDIO = "stdio"
    HTTP = "http"    # was SSE = "sse"
```

---

## Section 3: Frontend Changes

### Shared Server Form

Extract form fields into a reusable section used by both Create and Edit dialogs. Not a separate component file — just shared JSX within `McpServersPage.tsx` (both dialogs are already in that file).

**Fields:**
| Field | Type | Shown When | Required |
|-------|------|------------|----------|
| Server Name | TextField | Always | Yes |
| Server Type | Toggle (stdio / http) | Always | Yes (default: stdio) |
| Command | TextField | server_type = "stdio" | Yes |
| URL | TextField | server_type = "http" | Yes |
| Arguments | TextField (multiline) | server_type = "stdio" | No |
| Environment Variables | TextField (multiline) | Always | No |
| Scope | Select (Global / project paths) | Always | Yes (default: Global) |

**Scope picker:**
- MUI Select following InstanceSwitcher's styling pattern
- First option: "Global" (default)
- Remaining options: project paths from `GET /mcp/projects`
- Each project path shown in monospace, truncated with ellipsis if long

### McpServersPage.tsx

- **Create dialog:** Now includes server type toggle and scope picker
- **Edit dialog:** Same form, pre-populated with current server values. Title: "Edit Server". Opens via edit button on card.
- **State:** Add `editingServer: McpServer | null` state. When set, opens the edit dialog.
- **API hook:** Add `useUpdateMcpServer()` mutation hook in `frontend/src/api/mcp.ts`

### McpServerCard.tsx

- Add edit icon button (EditIcon from MUI) next to the delete button
- Disabled for plugin/read-only servers (same logic as delete button)
- Fix type badge label: "sse" → "http"

### types.ts

```typescript
// McpServer.server_type
server_type: "stdio" | "http";  // was "stdio" | "sse"

// Extended create request
interface McpServerCreateRequest {
  name: string;
  server_type: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  scope: "global" | "project";
  project_path?: string | null;
}

// New update request
interface McpServerUpdateRequest {
  new_name?: string;
  server_type?: "stdio" | "http";
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  scope?: "global" | "project";
  project_path?: string | null;
}
```

---

## Section 4: Diagnostics Enhancement

Three new checks added to **`mcp_diagnostics_service.py`**, appended to the existing `diagnose_server()` check list.

### `_check_duplicate_name(server_name: str, all_servers: list[dict]) -> dict`

- Counts how many servers across all scopes share the same name
- If count > 1: status "warn", message identifies the scopes where duplicates exist
- If count == 1: status "ok"
- This check requires the full server list, so `diagnose_server()` signature changes to accept the server list as an optional param (backward compatible — defaults to None, skips check if not provided)

### `_check_url_reachability(server: dict) -> dict`

- Only runs for HTTP servers (skips stdio with status "ok")
- HTTP HEAD request with 3-second timeout
- Status "ok" if 2xx/3xx response
- Status "warn" if timeout, connection refused, DNS failure, or non-2xx/3xx
- Not a blocking check — informational only
- Uses `httpx` (already a FastAPI dependency) for the request

### `_check_empty_env_values(server: dict) -> dict`

- Iterates env dict, flags any key with empty string value
- Status "warn" listing the empty keys: "Empty values for: API_KEY, SECRET"
- Status "ok" if no empty values

### No Changes to Existing Checks

The 5 existing checks (transport, stdio command, SSE URL, args, env types) stay as-is, except the SSE URL check references "http" instead of "sse" in messages.

---

## Section 5: Migration / Breaking Changes

### "sse" → "http" Rename

| Location | Change |
|----------|--------|
| `McpServerType` enum | `SSE = "sse"` → `HTTP = "http"` |
| `McpServer.server_type` | Values change from "sse" to "http" |
| Frontend `types.ts` | `"sse"` → `"http"` in union type |
| `McpServerCard.tsx` | Badge label "sse" → "http" |
| Sidecar file | Normalize on read: if "sse" found, treat as "http". No migration script. |
| Diagnostics messages | "SSE" → "HTTP" in diagnostic check messages |

### Backward Compatibility

- All new fields on create/update requests are optional with sensible defaults
- Existing `POST /mcp` callers (if any) continue working — `server_type` defaults to "stdio", `scope` defaults to "global"
- Sidecar file entries with old "sse" type are normalized on read
- No database migration (file-based storage)

### What Does NOT Change

- `GET /mcp` response shape — same fields, just "http" instead of "sse" in `server_type`
- `PUT /mcp/{name}/toggle` — unchanged
- `DELETE /mcp/{name}` — unchanged
- `GET /mcp/diagnostics` — same shape, new checks appended
- Plugin servers remain read-only

---

## Files Changed

### Backend
| File | Change |
|------|--------|
| `backend/claude_panel/models/mcp.py` | `McpServerType.SSE` → `HTTP`, update `McpServerCreateRequest`, add `McpServerUpdateRequest` |
| `backend/claude_panel/routers/mcp.py` | Add `PUT /mcp/{name}`, `GET /mcp/projects`, extend `POST /mcp` |
| `backend/claude_panel/services/mcp_service.py` | Add `update_server()`, `create_server()` (extended), `list_project_paths()`. Normalize "sse" → "http" on read. |
| `backend/claude_panel/services/mcp_diagnostics_service.py` | Add 3 new checks: duplicate name, URL reachability, empty env values |

### Frontend
| File | Change |
|------|--------|
| `frontend/src/types.ts` | `"sse"` → `"http"`, extend create request, add update request |
| `frontend/src/api/mcp.ts` | Add `useUpdateMcpServer()`, `useProjectPaths()` hooks |
| `frontend/src/pages/McpServersPage.tsx` | Server type toggle, URL field, scope picker, edit dialog |
| `frontend/src/components/McpServerCard.tsx` | Edit button, "sse" → "http" label |

### Tests
| File | Change |
|------|--------|
| `backend/tests/test_mcp_service.py` | Tests for `update_server()`, `create_server()`, `list_project_paths()`, "sse" → "http" normalization |
| `backend/tests/test_mcp_diagnostics_service.py` | Tests for 3 new diagnostic checks |
