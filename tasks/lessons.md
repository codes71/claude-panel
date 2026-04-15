# Lessons

## 2026-04-15: Always bump version before PR

**What happened**: Created PR #9 without bumping `package.json` and `backend/pyproject.toml` versions. User caught it.

**Why it matters**: CLAUDE.md Rule 7 — version is injected into the frontend at build time via `vite.config.ts`. Without bumping, users won't know they got the update. Both `package.json` (frontend) and `backend/pyproject.toml` (backend) must be bumped together.

**Pattern**: Before running `gh pr create`, always check and bump versions. Patch for fixes/refactors, minor for features, major for breaking changes.
