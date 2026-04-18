import type { MarketplaceInfo } from "../types";

export interface SuggestedMarketplace {
  /** Argument to `claude plugin marketplace add` (owner/repo). */
  source: string;
  title: string;
  shortDescription: string;
  /**
   * Keys from `~/.claude/plugins/known_marketplaces.json` as returned by GET /marketplace `marketplaces[].id`.
   * Verified against Claude Code docs: official id `claude-plugins-official`; demo catalog `anthropics-claude-code`.
   */
  expectedMarketplaceIds: readonly string[];
}

export const SUGGESTED_MARKETPLACES: readonly SuggestedMarketplace[] = [
  {
    source: "anthropics/claude-plugins-official",
    title: "Official Anthropic plugins",
    shortDescription: "Curated plugins (GitHub, Linear, LSP, etc.). Same catalog as claude.com/plugins.",
    expectedMarketplaceIds: ["claude-plugins-official"],
  },
  {
    source: "anthropics/claude-code",
    title: "Claude Code demo marketplace",
    shortDescription: "Example plugins from the Claude Code repo (commit-commands, plugin-dev, …).",
    expectedMarketplaceIds: ["anthropics-claude-code"],
  },
];

export function isMarketplaceSuggestionInstalled(
  suggestion: SuggestedMarketplace,
  marketplaces: readonly Pick<MarketplaceInfo, "id" | "name">[],
): boolean {
  const ids = new Set(marketplaces.map((m) => m.id));
  return suggestion.expectedMarketplaceIds.some((id) => ids.has(id));
}
