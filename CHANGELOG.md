# Changelog

All notable changes to ClaudeBoard are documented in this file.

## [1.5.0] - 2026-03-02

### Rebranding
- Renamed project from "CCM" / "Claude Code Config Manager" to **ClaudeBoard** — "Claude Code Control Panel"
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
