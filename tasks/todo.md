# Tasks

## Pending

(none)

## Completed (2026-04-15)

- [x] **Extract `MarkdownField` base component** — Single reusable monospace editor at `frontend/src/components/MarkdownField.tsx` with `flexFill` prop for full editors vs dialog use.
- [x] **Refactor `CodeEditor` to compose `MarkdownField`** — CodeEditor no longer owns TextField styling, composes MarkdownField instead.
- [x] **Replace inline TextFields in dialogs** — `AgentBuilder.tsx` and `CommandDialogs.tsx` now use `MarkdownField` instead of duplicate styled TextFields.
- [x] **Fix scroll containment in editors** — Constrained height chain from App.tsx main content through AgentsPage/ClaudeMdPage/CommandsPage containers and Card overflow. Editor textarea scrolls internally, page stays put.
- [x] **Optimize agent list partial reads** — `_build_agent_info()` reads only first 2KB for frontmatter instead of full file content (142 agents).
- [x] **Increase frontend query staleTime** — Agent/command/CLAUDE.md queries now 30-60s staleTime instead of 10s default. Prevents redundant refetches on page navigation.
- [x] **Cache CLAUDE.md tree scan server-side** — Module-level cache with mtime-based staleness check + 5min hard TTL. Second call: 1.3s → 5ms (269x speedup). Invalidated on write/create/delete mutations.
- [x] **Update checker UI + auto-update** — Backend: `update_service.py` checks npm registry, caches 24h, `apply_update()` runs npm install. Router: GET `/updates/check`, POST `/updates/apply`. Frontend: `UpdateBadge` chip in header, dialog with version info + one-click update. Startup pre-warms cache.
