import { describe, it, expect } from "vitest";
import { isMarketplaceSuggestionInstalled, SUGGESTED_MARKETPLACES } from "./suggestedMarketplaces";

describe("isMarketplaceSuggestionInstalled", () => {
  it("returns false when no marketplaces", () => {
    expect(isMarketplaceSuggestionInstalled(SUGGESTED_MARKETPLACES[0], [])).toBe(false);
  });

  it("returns true when official marketplace id is present", () => {
    expect(
      isMarketplaceSuggestionInstalled(SUGGESTED_MARKETPLACES[0], [
        { id: "claude-plugins-official", name: "Anthropic" },
      ]),
    ).toBe(true);
  });

  it("returns true when demo marketplace id is present", () => {
    expect(
      isMarketplaceSuggestionInstalled(SUGGESTED_MARKETPLACES[1], [
        { id: "anthropics-claude-code", name: "Claude Code Plugins" },
      ]),
    ).toBe(true);
  });

  it("returns false when only unrelated marketplaces exist", () => {
    expect(
      isMarketplaceSuggestionInstalled(SUGGESTED_MARKETPLACES[0], [{ id: "other-mp", name: "Other" }]),
    ).toBe(false);
  });
});
