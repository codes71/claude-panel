# Reliability Control Plane

## Overview
ClaudeBoard now includes a reliability-first control plane focused on:
- MCP diagnostics and health visibility
- CLAUDE.md drift detection and lint findings
- Provider provenance locks (repo/branch/commit)
- Config bundle export/validate/dry-run apply workflows

## Backend Endpoints
- `GET /api/mcp/diagnostics`
- `GET /api/mcp/{name}/diagnose`
- `GET /api/mcp/health`
- `GET /api/claude-md/drift`
- `GET /api/skill-providers/provenance`
- `GET /api/config-bundle/export`
- `POST /api/config-bundle/validate`
- `POST /api/config-bundle/apply`

## Frontend Surfaces
- New `Reliability` page (sidebar route: `/reliability`)
- `Configuration` page quick-link to Reliability
- `Skill Providers` page quick-link to provider provenance

## Verification Checklist
- [x] Backend test suite
  - Command: `cd backend && uv run pytest -q`
  - Result: `127 passed, 38 warnings`
- [x] Frontend test suite
  - Command: `cd frontend && npm test -- --run`
  - Result: `8 files, 29 tests passed`
- [x] Frontend build
  - Command: `npm run build:frontend`
  - Result: build succeeded; assets written to `backend/ccm/static`
- [x] Manual smoke flow: drift + doctor + provider lock + bundle dry-run
  - Steps:
    - call `claude_md_drift_service.list_drift_events()`
    - call `mcp_service.diagnose_all_servers()` and `mcp_service.list_health()`
    - call `provider_provenance_service.read_lock()`
    - call `config_bundle_service.export_bundle()`, `validate_bundle()`, `apply_bundle(..., dry_run=True)`
  - Result: all functions returned expected shapes; validation was `True`; dry-run apply reported `applied=False`

## Known Limitations
- Config bundle apply currently performs direct MCP + CLAUDE.md sync and reports provider lock entries but does not clone/update providers automatically.
- Health and drift rely on persisted local snapshots; first run is baseline-oriented.
- FastAPI startup uses `on_event("startup")` and still emits a deprecation warning in tests.
