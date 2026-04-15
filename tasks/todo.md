# Tasks

## Pending

- [ ] **Cache CLAUDE.md tree scan server-side** — `_find_claude_md_files()` in `backend/claude_panel/services/claude_md_service.py` walks `Path.home()` via `os.walk` on every `/api/claude-md` request (~167ms warm). Add an in-memory cache keyed on the `scan_roots` directories' `mtime` — if no directory has changed, return the cached result. Invalidate on write/create/delete mutations. This is the last major latency source; frontend `staleTime: 60s` masks it but the first load per minute still pays the cost.

- [ ] **Update checker UI + auto-update** — Two parts:
  1. **UI update checker**: Add a version check indicator in the header/footer. Backend endpoint compares installed version (`package.json`) against latest published version (npm registry or GitHub releases). Frontend shows a badge/banner when an update is available with a one-click "Update Now" button.
  2. **Background auto-update**: Optional background process that periodically checks for updates (e.g. every 24h) and auto-applies them (re-run `npm install -g claude-panel` or equivalent). Should be opt-in via settings with a toggle. Needs: backend `/api/updates/check` endpoint, `/api/updates/apply` endpoint, frontend UI in header or settings page, and a background polling mechanism.

## Completed (2026-04-15)

- [x] **Extract `MarkdownField` base component** — Single reusable monospace editor at `frontend/src/components/MarkdownField.tsx` with `flexFill` prop for full editors vs dialog use.
- [x] **Refactor `CodeEditor` to compose `MarkdownField`** — CodeEditor no longer owns TextField styling, composes MarkdownField instead.
- [x] **Replace inline TextFields in dialogs** — `AgentBuilder.tsx` and `CommandDialogs.tsx` now use `MarkdownField` instead of duplicate styled TextFields.
- [x] **Fix scroll containment in editors** — Constrained height chain from App.tsx main content through AgentsPage/ClaudeMdPage/CommandsPage containers and Card overflow. Editor textarea scrolls internally, page stays put.
- [x] **Optimize agent list partial reads** — `_build_agent_info()` reads only first 2KB for frontmatter instead of full file content (142 agents).
- [x] **Increase frontend query staleTime** — Agent/command/CLAUDE.md queries now 30-60s staleTime instead of 10s default. Prevents redundant refetches on page navigation.
