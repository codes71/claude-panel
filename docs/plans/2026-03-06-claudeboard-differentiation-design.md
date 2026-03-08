# ClaudeBoard Differentiation Design (2026-03-06)

## Objective
Turn ClaudeBoard from a generic "manager dashboard" into a defensible product that wins in a crowded MCP/plugin-management market.

## Reality Check Summary
The broad category already exists and is active:
- MCP management UI and hubs already exist (`mcp-manager`, `mcp-hub`)
- Discovery/marketplace hubs already exist (`buildwithclaude`, `n-skills`)
- CLAUDE.md point tooling exists (plugin-level tooling)

Conclusion: competing on "single UI for everything" is low moat.

## Product Positioning
**Position ClaudeBoard as: _Local-First Reliability + Governance Control Plane for Claude Code teams_.**

### Core Jobs To Be Done
1. Keep `CLAUDE.md` files healthy across many repos.
2. Keep MCP servers working, debuggable, and measurable.
3. Safely import private skill/plugin providers from GitHub.
4. Make configuration reproducible (config-as-code), not purely click-ops.

## Approaches Considered

### Approach A: Marketplace-First Expansion
- What it is: Build bigger marketplace/discovery features as main value.
- Pros: Easy to understand; visible growth loop.
- Cons: Direct competition with larger incumbents; weak defensibility.

### Approach B: Reliability-First Control Plane (Recommended)
- What it is: Build "Doctor + Drift + Provenance" as first-class workflows.
- Pros: High painkiller value, strong team adoption, clear technical moat.
- Cons: Less flashy than marketplaces; requires deeper backend work.

### Approach C: Enterprise Policy Layer First
- What it is: Prioritize strict policy/compliance workflows before reliability UX.
- Pros: Enterprise story.
- Cons: Overly heavy for current product maturity; slower adoption.

## Recommended Direction
Choose **Approach B** now, then add selected policy features from C.

## Scope Boundaries

### In Scope (next 6 weeks)
1. **CLAUDE.md Ops**
- Faster scoped scanning (configured roots)
- Drift detection feed (new/changed/deleted files)
- Linting for quality and token risk

2. **MCP Reliability (Doctor)**
- Preflight validation (command, args, env, transport)
- Health snapshots and failure reason taxonomy
- Basic latency/error history per server

3. **Private Provider Importer**
- GitHub private repo support
- Install provenance and lock metadata (source, branch, commit)
- Dependency preflight checks before install

4. **Config-as-Code**
- Export current state as JSON/YAML
- Validate and dry-run apply
- Apply with backups and rollback path

### Out of Scope (for now)
- Full social marketplace/recommendation engine
- Hosted multi-tenant SaaS control plane
- Windows-first support

## Architecture Fit (Current Repo)

### Backend (FastAPI)
- Extend services in `backend/ccm/services/`
- Add focused routers in `backend/ccm/routers/`
- Expand Pydantic contracts in `backend/ccm/models/`
- Keep state in `~/.claude/ccm/*` sidecar files

### Frontend (React + React Query + MUI)
- Extend API modules in `frontend/src/api/`
- Extend contracts in `frontend/src/types.ts`
- Add pages/components for:
  - CLAUDE.md drift and lint status
  - MCP doctor diagnostics and history
  - Provider provenance and lock visibility

## UX Principles
1. Explain failures concretely (what broke, where, exact fix suggestion).
2. Prefer safe defaults (dry-run, backup, rollback).
3. Keep actions auditable (who/what changed config state).
4. Treat marketplace discovery as secondary to reliability.

## Success Metrics
1. < 5 minutes median time-to-fix for broken MCP setup.
2. > 80% of scanned repos have valid `CLAUDE.md` after lint guidance.
3. > 50% of provider installs are commit-pinned (provenance).
4. Config export/import success rate > 95% in integration tests.

## Risks and Mitigations
1. **Filesystem scanning cost**
- Mitigation: scoped roots, caching, incremental diffs.
2. **False-positive diagnostics**
- Mitigation: confidence levels and clear reason codes.
3. **Git auth complexity for private repos**
- Mitigation: explicit auth modes and preflight checks.

## Rollout Plan
1. Ship reliability features behind flags in backend config.
2. Enable by default after one release cycle of telemetry/feedback.
3. Publish migration docs and example config bundle templates.
