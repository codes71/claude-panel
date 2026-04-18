# Research: Claude Code environment variables and plugin marketplaces

**Date:** 2026-04-18  
**Purpose:** Ground the claude-panel **env catalog** and **suggested marketplace** features in official documentation.

---

## Primary sources

| Topic | URL | Notes |
| --- | --- | --- |
| Environment variables (authoritative table) | [Environment variables - Claude Code Docs](https://code.claude.com/docs/en/env-vars) | Single table of all supported vars; fetched 2026-04-18 |
| Settings / `env` key | [Settings](https://code.claude.com/en/settings) | Vars can be set in shell or `settings.json` → `env` |
| Plugin discovery | [Discover and install prebuilt plugins](https://code.claude.com/docs/en/discover-plugins) | Official + demo marketplace repo IDs and CLI commands |
| CLI flags (overlap with env) | `claude --help` (local CLI) | e.g. `--bare` sets `CLAUDE_CODE_SIMPLE=1`; `--betas` vs `ANTHROPIC_BETAS` |

---

## Environment variables — scope for the catalog

The official page lists **on the order of 200+** variables (single comprehensive table). The panel should not guess names; the shipped catalog should **mirror that official list** and be **updated when docs change** (periodic PR or release-note diff).

### Suggested categories for UI grouping

These are editorial groupings for the Settings picker (not official Anthropic taxonomy):

| Category | Examples (official names) |
| --- | --- |
| **Authentication & API** | `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL`, `CLAUDE_CODE_OAUTH_TOKEN`, `CLAUDE_CODE_OAUTH_REFRESH_TOKEN`, `CLAUDE_CODE_OAUTH_SCOPES` |
| **Anthropic API betas / preview** | `ANTHROPIC_BETAS` (opt into API betas before native support), `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` (strip beta headers for gateways) |
| **Cloud providers** | `CLAUDE_CODE_USE_BEDROCK`, `CLAUDE_CODE_USE_VERTEX`, `CLAUDE_CODE_USE_FOUNDRY`, `CLAUDE_CODE_USE_MANTLE`, `ANTHROPIC_VERTEX_*`, `ANTHROPIC_BEDROCK_*`, `ANTHROPIC_FOUNDRY_*`, `AWS_BEARER_TOKEN_BEDROCK`, `VERTEX_REGION_*`, skip-auth `CLAUDE_CODE_SKIP_*_AUTH` |
| **Model configuration** | `ANTHROPIC_MODEL`, `ANTHROPIC_DEFAULT_*_MODEL*`, `CLAUDE_CODE_SUBAGENT_MODEL`, `MAX_THINKING_TOKENS`, `CLAUDE_CODE_EFFORT_LEVEL`, `CLAUDE_CODE_DISABLE_*_CONTEXT`, extended thinking toggles |
| **MCP** | `MCP_TIMEOUT`, `MCP_TOOL_TIMEOUT`, `MCP_SERVER_CONNECTION_BATCH_SIZE`, `MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE`, `MCP_CONNECTION_NONBLOCKING`, `MCP_OAUTH_CALLBACK_PORT`, `MCP_CLIENT_SECRET`, `ENABLE_TOOL_SEARCH`, `MAX_MCP_OUTPUT_TOKENS`, `ENABLE_CLAUDEAI_MCP_SERVERS` |
| **Plugins** | `CLAUDE_CODE_PLUGIN_CACHE_DIR`, `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS`, `CLAUDE_CODE_PLUGIN_SEED_DIR`, `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE`, `CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL`, `FORCE_AUTOUPDATE_PLUGINS`, sync install vars |
| **Network & TLS** | `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`, `CLAUDE_CODE_CERT_STORE`, `CLAUDE_CODE_CLIENT_CERT`, `CLAUDE_CODE_CLIENT_KEY`, `CLAUDE_CODE_PROXY_RESOLVES_HOSTS` |
| **Privacy / telemetry / disable flags** | `DISABLE_TELEMETRY`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `DISABLE_ERROR_REPORTING`, `DISABLE_AUTOUPDATER`, many `CLAUDE_CODE_DISABLE_*` and `DISABLE_*` |
| **OpenTelemetry** | `CLAUDE_CODE_ENABLE_TELEMETRY`, `CLAUDE_CODE_OTEL_*`, `OTEL_LOG_*`, `OTEL_METRICS_*`, standard `OTEL_EXPORTER_*` (see doc “See also” on env-vars page) |
| **TUI / UX / IDE** | `CLAUDE_CODE_NO_FLICKER` (**described as “research preview”** in official doc), `CLAUDE_CODE_AUTO_CONNECT_IDE`, `CLAUDE_CODE_IDE_*`, `CLAUDE_CODE_ACCESSIBILITY`, fullscreen / scroll vars |
| **Experimental / agent features** | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` (**“experimental and disabled by default”**), `CLAUDE_CODE_ENABLE_TASKS`, task list / background task vars |
| **Bash & tools** | `BASH_*`, `CLAUDE_ENV_FILE`, `USE_BUILTIN_RIPGREP`, `CLAUDE_CODE_GLOB_*`, `CLAUDE_CODE_USE_POWERSHELL_TOOL` |
| **Config paths** | `CLAUDE_CONFIG_DIR`, `CLAUDE_CODE_TMPDIR`, `CLAUDE_CODE_DEBUG_LOGS_DIR` |

### Variables explicitly tied to “preview”, “experimental”, or API betas

Use these for a **“Preview & betas”** filter chip in the catalog UI:

- **`ANTHROPIC_BETAS`** — extra `anthropic-beta` headers; works with subscription auth (unlike `--betas` CLI).
- **`CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`** — strip beta headers/tool fields for strict gateways.
- **`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`** — agent teams (experimental).
- **`CLAUDE_CODE_NO_FLICKER`** — fullscreen / research preview (per doc).
- **`ENABLE_TOOL_SEARCH`** — MCP tool deferral modes (`true` / `auto` / `false`).
- **`ENABLE_PROMPT_CACHING_1H`** — longer cache TTL (billing implications; doc calls out 1h writes).

### Deprecated / legacy names called out in official doc

Implementation should show **one canonical row** but may mention aliases in description:

- `ANTHROPIC_SMALL_FAST_MODEL` — deprecated.
- `ENABLE_PROMPT_CACHING_1H_BEDROCK` — deprecated; use `ENABLE_PROMPT_CACHING_1H`.
- `DISABLE_BUG_COMMAND` — older name for disabling `/feedback` (`DISABLE_FEEDBACK_COMMAND`).

### OpenTelemetry

Official text: standard exporter variables are supported; see [Monitoring](https://code.claude.com/en/monitoring-usage). Catalog should include a **short OTel subsection** linking to that page rather than duplicating every `OTEL_*` variant if the table grows.

---

## Plugin marketplaces — recommended sources for empty installs

Official docs state:

1. **Official marketplace** — id `claude-plugins-official`; catalog at [claude.com/plugins](https://claude.com/plugins). Users can run `/plugin marketplace add anthropics/claude-plugins-official` if the marketplace is missing or outdated.

2. **Demo / example marketplace** — **`anthropics/claude-code`** hosts demo plugins (`claude-code-plugins`); docs say to add manually:
   - `claude plugin marketplace add anthropics/claude-code` (panel already uses `claude plugin marketplace add <source>` in [marketplace_service.py](../../backend/claude_panel/services/marketplace_service.py)).

### Recommended hard-coded list for “Suggested sources” (initial)

| `owner/repo` | Role | Citation |
| --- | --- | --- |
| `anthropics/claude-plugins-official` | Official Anthropic plugin catalog | [Discover plugins](https://code.claude.com/docs/en/discover-plugins) |
| `anthropics/claude-code` | Demo/example marketplace (`anthropics-claude-code` install suffix in docs) | Same page, “Try it: add the demo marketplace” |

**Caution:** Third-party marketplaces (community GitHub repos) are **not** listed here; adding them requires explicit trust review. The implementation plan can include an optional “Community” subsection later.

### Note on “empty marketplace” for npm-only users

Interactive Claude Code may auto-register the official marketplace; headless or panel-only flows may not. Seeding **suggested** rows avoids an empty UX without forcing `claude plugin marketplace add` on every startup.

---

## CLI vs env (for catalog descriptions)

From `claude --help` (sample): `--bare` sets `CLAUDE_CODE_SIMPLE=1`; `--betas` is API-key-only while `ANTHROPIC_BETAS` works with all auth methods (matches env-vars doc). The catalog can **cross-link** flag names in `description` fields where helpful.

---

## Maintenance

- **Source of truth:** [code.claude.com/docs/en/env-vars](https://code.claude.com/docs/en/env-vars).
- **Update cadence:** When bumping supported Claude Code version or on user reports of missing vars, diff the official table and update the bundled catalog file.
