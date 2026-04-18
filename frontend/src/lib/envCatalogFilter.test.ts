import { describe, it, expect } from "vitest";
import { filterClaudeEnvCatalog } from "./envCatalogFilter";

/** Minimal catalog rows for unit tests (subset of real schema). */
const fixture = [
  { key: "ANTHROPIC_API_KEY", description: "API key header", category: "Authentication and API" },
  {
    key: "ANTHROPIC_BETAS",
    description: "Beta headers",
    category: "Authentication and API",
    tags: ["preview"] as const,
  },
  {
    key: "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS",
    description: "Agent teams",
    category: "Experimental",
    tags: ["preview", "experimental"] as const,
  },
  { key: "FOO", description: "something unrelated", category: "Other" },
];

describe("filterClaudeEnvCatalog", () => {
  it("returns all when search category and preview filter are empty", () => {
    expect(filterClaudeEnvCatalog(fixture, { search: "", category: "", previewOnly: false })).toHaveLength(4);
  });

  it("filters by search on key case-insensitive", () => {
    const r = filterClaudeEnvCatalog(fixture, { search: "anthropic_api", category: "", previewOnly: false });
    expect(r.map((e) => e.key)).toEqual(["ANTHROPIC_API_KEY"]);
  });

  it("filters by search on description", () => {
    const r = filterClaudeEnvCatalog(fixture, { search: "beta", category: "", previewOnly: false });
    expect(r.map((e) => e.key)).toEqual(["ANTHROPIC_BETAS"]);
  });

  it("filters by category", () => {
    const r = filterClaudeEnvCatalog(fixture, { search: "", category: "Experimental", previewOnly: false });
    expect(r.map((e) => e.key)).toEqual(["CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"]);
  });

  it("when previewOnly, keeps only entries tagged preview or experimental", () => {
    const r = filterClaudeEnvCatalog(fixture, { search: "", category: "", previewOnly: true });
    expect(r.map((e) => e.key).sort()).toEqual(
      ["ANTHROPIC_BETAS", "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"].sort(),
    );
  });

  it("combines search with previewOnly", () => {
    const r = filterClaudeEnvCatalog(fixture, { search: "AGENT", category: "", previewOnly: true });
    expect(r.map((e) => e.key)).toEqual(["CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS"]);
  });
});
