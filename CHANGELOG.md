# Changelog

All notable changes to Claude Panel are documented in this file.

## [2.1.1] - 2026-03-15

### Bug Fixes
- Fix skill installation ignoring active instance — personal scope now installs to the active instance's directory (`settings.claude_home`) instead of always `~/.claude/`
- Make skill providers global across all instances — provider registry moved to `~/.config/claude-panel/skill-providers/` so providers only need to be added once and are available to every instance

## [2.1.0] - 2026-03-06

### Reliability Control Plane
- Add `Reliability` page with MCP diagnostics, MCP health, CLAUDE.md drift, provider provenance, and config bundle workflows
- Add MCP doctor endpoints: `/api/mcp/diagnostics`, `/api/mcp/{name}/diagnose`
- Add MCP health endpoint and persisted state snapshot: `/api/mcp/health`
- Add CLAUDE.md drift endpoint and snapshot comparison: `/api/claude-md/drift`
- Add CLAUDE.md linting and scan root metadata in list response (`issues`, `scan_roots`)
- Add provider provenance lock tracking (`repo`, `branch`, `commit`) and `/api/skill-providers/provenance`
- Add config bundle APIs: `/api/config-bundle/export`, `/api/config-bundle/validate`, `/api/config-bundle/apply`

### Testing
- Add backend tests for drift, MCP diagnostics/health, provider provenance, and config bundle service/routes
- Add frontend `ReliabilityPage` test and API hook coverage through page rendering tests

## [2.0.0] - 2026-03-05

### UX Redesign
- Collapsible sidebar (240px expanded / 64px rail) with 4 consolidated nav items
- Top header bar with instance switcher and theme toggle
- Dark/light theme system with localStorage persistence (ThemeContext)
- New Extensions page with 3 tabs: Installed, Marketplace, Skill Catalog
- New Configuration page with 3 tabs: Settings, MCP Servers, Commands
- Dashboard overhaul: real activity stats from stats-cache.json, config inventory cards, collapsible Visibility section
- Stats service (stats_service.py) reading actual usage data
- Legacy routes redirect to new consolidated pages
- Code Router hidden from UI (backend retained)
- Visibility page folded into Dashboard as collapsible section
- 11 sidebar items reduced to 4: Dashboard, Extensions, Configuration, CLAUDE.md

---

## [1.9.1] - 2026-03-04

### Skill Index Service
- Add persistent skill catalog indexing with git-SHA-based cache invalidation
- Paginated search/filter queries across all registered providers
- Catalog endpoint with category, provider, and text search filters

---

## [1.9.0] - 2026-03-04

### Modularity Refactor
- Extract 8 scanner dataclasses from `services/scanner.py` to `models/scanner.py`
- Split `CommandsPage` (770→40 lines) into `CommandTree`, `CommandDetail`, `CommandDialogs`
- Split `SkillCatalogPage` (600→40 lines) into `CatalogGrid`, `InstalledSkills`, `ProviderManager`
- Merge `providers.ts` hooks into `marketplace.ts` (single API module)
- Add "Add Source" button to Marketplace page for adding providers directly
- Add `OSError` guards around scanner filesystem operations

---

## [1.8.0] - 2026-03-04

### Test Infrastructure
- 110 backend tests (pytest) covering all 11 services and API routes
- 28 frontend tests (Vitest + React Testing Library) for pages and components
- Tests cover render, loading, error, and empty states

---

## [1.7.1] - 2026-03-03

### Stability Hardening
- Add null guards and optional chaining across all frontend pages
- Wrap backend JSON parsing with try/except for malformed config files
- Prevent crashes when switching between instances with different configs

---

## [1.7.0] - 2026-03-03

### Multi-Instance Management
- Switch between multiple Claude Code configuration profiles (~/.claude, ~/.claude-alt, etc.)
- Automatic discovery with strong-marker validation (filters out plugin data dirs)
- Instance switcher in sidebar with add/remove dialogs
- React ErrorBoundary for graceful render error recovery
- SPA routing fix: catch-all serves index.html for client-side routes
- Targeted query invalidation on instance switch (13 query keys)

---

## [1.6.1] - 2026-03-03

### Open-Source Branding
- MIT License
- README with badges, install/usage docs, troubleshooting
- CONTRIBUTING.md with dev setup and PR workflow
- CODE_OF_CONDUCT.md (Contributor Covenant v2.1)
- GitHub issue templates (bug report, feature request)

---

## [1.6.0] - 2026-03-03

### npm Packaging
- Installable via `npx claude-panel` or `npm install -g claude-panel`
- CLI with `--port`, `--no-open`, `--help` options
- Platform checks (Linux/macOS), dependency validation (uv, Python)
- Dynamic port selection with health-check polling and browser auto-open
- Styled ANSI startup banner

---

## [1.5.1] - 2026-03-02

### Improvements

#### Shared CodeEditor Component
- Extracted reusable `CodeEditor` component from ClaudeMdPage and CommandsPage (~80 lines of duplicated editor JSX)
- Supports `extraToolbar` slot for page-specific buttons (e.g., delete icon)
- Added **Ctrl+S / Cmd+S** keyboard shortcut for saving across all editor pages

#### Command Creation Fixes
- Added name validation: only `[a-zA-Z0-9_-]` allowed (frontend regex + backend `_validate_name()`)
- Added Description field in Create Command dialog
- Auto-generates YAML frontmatter (`---\ndescription: "..."\n---`) so Claude Code recognizes skill descriptions
- Prevents malformed directory creation from names with spaces or slashes

---

## [1.5.0] - 2026-03-02

### Rebranding
- Renamed project from "CCM" / "Claude Code Config Manager" to **Claude Panel** — "Claude Code Control Panel"
- Updated sidebar branding with logo, new name, and tagline
- Added custom favicon (`favicon.svg`) and sidebar logo (`logo.svg`)
- Updated HTML title and meta tags

### New Features

#### Claude Code Router (CCR) Dashboard
- New page to view and manage Claude Code Router configuration
- Shows provider status, configured models, routing rules, and health check
- Backend: `ccr_service.py`, `ccr.py` router and models

#### Marketplace Browser
- Browse and manage plugin marketplaces and available plugins
- Install/uninstall plugins directly from the UI
- View plugin metadata: skills, agents, commands, version, category
- Backend: `marketplace_service.py`, `marketplace.py` router and models

#### Custom Commands Manager
- Full CRUD for custom slash commands (`~/.claude/commands/`)
- Namespace-grouped command listing with token estimates
- Create, edit, and delete commands with live markdown preview
- Backend: `command_service.py`, `commands.py` router and models

#### Skill Providers
- Add git-based skill providers by repository URL
- Discover skills and commands from provider repos
- Install/uninstall skills to global or project scope
- Refresh and remove providers
- Backend: `skill_provider_service.py`, `skill_providers.py` router and models

#### Skill Catalog
- Unified view of all installable skills across all registered providers
- Filter and search skills, view token estimates, install with one click

### Improvements

#### Plugin Service Overhaul
- Support for v2 `installed_plugins.json` format (dict-based) with v1 fallback
- Extracted `_scan_plugin_dir()` for reusable plugin directory scanning
- Improved cache scanning: respects `cache/<marketplace>/<plugin>/<version>/` structure
- Enabled plugins not in `installed_plugins.json` now get proper cache info and token estimates

#### Settings Page
- Added dirty-state tracking for environment variables (save button shows `Save*` when changed)
- Inverted "dangerous mode" toggle to positive framing: "Confirm before dangerous commands"

#### Dashboard
- Removed non-functional "Apply" button from suggestion cards
- Suggestions renamed to "Optimization Recommendations"
- SuggestionCard now uses lightbulb icon instead of magic wand
- Removed toast notification for suggestion apply (was a no-op)

#### MCP Servers Page
- Removed global/project scope split (simplified to single list)
- Removed scope selector from "Add Server" dialog
- Tool count chip now hidden when count is 0

#### CLAUDE.md Page
- Token estimate now uses server-provided `token_estimate` instead of client-side approximation

#### Configuration
- Added `ccm_skill_providers_dir` setting for skill provider storage path

### New Files (4,600+ lines of new code)
- **Backend**: 4 new routers, 4 new services, 4 new model files
- **Frontend**: 5 new pages, 5 new API hooks, 1 new component
- **Assets**: `favicon.svg`, `logo.svg`

---

## [1.0.0] - 2026-03-01

### Initial Release
- Dashboard with token breakdown, top consumers chart, optimization suggestions
- Settings management (env vars, hooks, dangerous mode toggle)
- Plugin management (list, enable/disable, token estimates)
- MCP server management (list, toggle, add/remove)
- CLAUDE.md editor with recursive tree scanner (global + per-project)
- Visibility page (commands, agents, memory files overview)
- Dark theme with JetBrains Mono + DM Sans typography
- File-based storage (no database)
- Backup system for all config modifications
