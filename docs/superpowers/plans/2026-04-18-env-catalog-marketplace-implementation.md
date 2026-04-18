# Implementation plan: Env catalog + suggested marketplaces

**Depends on:** [docs/research/2026-04-18-claude-code-env-and-marketplace.md](../../research/2026-04-18-claude-code-env-and-marketplace.md) (same repo)  
**Out of scope:** Prior GitHub MCP issues; runtime scraping of docs.

---

## Goals

1. **Settings:** Let users pick Claude Code environment variables from a **searchable, grouped catalog** (official names + descriptions), then edit values in the existing table.
2. **Marketplace / Extensions:** Show **suggested** `owner/repo` sources (official only in v1) so fresh installs are not empty, using the existing `POST /marketplace/providers` flow.

---

## Non-goals (v1)

- Fetching or parsing `code.claude.com` at runtime.
- Curated third-party marketplace repos without a separate security review.
- Server-side validation of env values against Claude Code rules.

---

## Task 1: Bundled env catalog data

**Deliverable:** `frontend/src/data/claudeEnvCatalog.ts` (or `.json` + thin TS re-export).

**Content:**

- One entry per row in the [official env-vars table](https://code.claude.com/docs/en/env-vars): `key`, `description` (copy from doc; shorten only if needed for UI), `category` (use research doc groupings), `docsPath` (optional anchor or `/docs/en/env-vars`), `tags?: ("preview" | "experimental" | "deprecated" | "mcp" | ...)[]`.
- Include **deprecated** vars with a `deprecated?: true` or `tags: ["deprecated"]` and optional `replacedBy` string.
- **Preview / experimental filter:** tag rows called out in research (`ANTHROPIC_BETAS`, `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS`, `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`, `CLAUDE_CODE_NO_FLICKER`, `ENABLE_TOOL_SEARCH`, `ENABLE_PROMPT_CACHING_1H`, etc.).

**Process note:** Initial file can be generated once from the 2026-04-18 doc capture; future updates are manual PRs with a one-line changelog in the research doc’s maintenance section.

**Files:**

- Add: `frontend/src/data/claudeEnvCatalog.ts`
- Add: `frontend/src/types/envCatalog.ts` (optional) for `ClaudeEnvCatalogEntry`

---

## Task 2: Settings page — catalog picker

**File:** [frontend/src/pages/SettingsPage.tsx](../../../frontend/src/pages/SettingsPage.tsx)

**Behavior:**

- Keep current env **table** as the source of truth persisted via [useUpdateSettings](../../../frontend/src/api/settings.ts).
- Add **“Add from catalog”** control:
  - Autocomplete or dialog with **search**, **category** filter, and **“Preview & betas”** toggle.
  - On select: if key not present, **append** a row with key filled and value empty (or placeholder); if present, **focus** that row.
- Optional: icon button per catalog row opening `https://code.claude.com/docs/en/env-vars` in a new tab (or internal tooltip with full description).

**A11y:** Ensure keyboard navigation works inside the picker dialog.

---

## Task 3: Suggested marketplace sources

**Data:** `frontend/src/data/suggestedMarketplaces.ts`

```ts
// Illustrative shape
export interface SuggestedMarketplace {
  source: string;       // "anthropics/claude-plugins-official"
  title: string;
  description: string;
  official: boolean;
}
```

**Initial rows:** Only entries from research table (`anthropics/claude-plugins-official`, `anthropics/claude-code`).

**File:** [frontend/src/pages/MarketplacePage.tsx](../../../frontend/src/pages/MarketplacePage.tsx)

**UI:**

- Section **“Suggested sources”** above or beside the main plugin grid.
- Card per suggestion: title, one-line description, **Add** → `useAddProvider` with `source`.
- If `data.marketplaces` already includes a matching marketplace (compare by `repo` from provider list or by id if exposed), show **Added** and disable button.
- On failure (no CLI, network), show existing toast pattern.

**Optional follow-up:** “Add all official” button with sequential calls and aggregated toast (defer if timeboxed).

---

## Task 4: Tests and verification

- `cd frontend && npx tsc --noEmit`
- `npm run build:frontend`
- Manual: empty `known_marketplaces` — suggested section visible; Add succeeds when `claude` is on PATH.
- Manual: Settings — pick `ANTHROPIC_BETAS` from catalog, save, confirm backend receives key.

---

## Task 5: Version bump (before PR)

Per [CLAUDE.md](../../../CLAUDE.md): bump `package.json` and `backend/pyproject.toml` patch (or minor if you treat this as a feature).

---

## Risk / notes

- **Catalog size:** ~200+ entries — use virtualized list or MUI Autocomplete with limit if perf issues on low-end machines.
- **Description length:** Truncate in list; full text in detail tooltip or secondary line.
- **Official marketplace id:** Docs use marketplace name `claude-plugins-official` and repo `anthropics/claude-plugins-official`; verify `add_provider` accepts the same string the CLI expects (`claude plugin marketplace add anthropics/claude-plugins-official`).
