import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../api/marketplace", () => ({
  useMarketplace: vi.fn(),
  useInstallPlugin: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUninstallPlugin: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useAddProvider: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

import MarketplacePage from "../MarketplacePage";
import { useMarketplace } from "../../api/marketplace";

const mockedUseMarketplace = vi.mocked(useMarketplace);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("MarketplacePage", () => {
  it("renders heading", () => {
    mockedUseMarketplace.mockReturnValue({
      data: { marketplaces: [], plugins: [], total_available: 0, total_installed: 0 },
      isLoading: false,
      error: null,
    } as any);
    render(<MarketplacePage />, { wrapper });
    expect(screen.getByText("Add Source")).toBeInTheDocument();
  });

  it("shows no plugins message", () => {
    mockedUseMarketplace.mockReturnValue({
      data: { marketplaces: [], plugins: [], total_available: 0, total_installed: 0 },
      isLoading: false,
      error: null,
    } as any);
    render(<MarketplacePage />, { wrapper });
    expect(screen.getByText("No plugins available.")).toBeInTheDocument();
  });

  it("shows Add Source button", () => {
    mockedUseMarketplace.mockReturnValue({
      data: { marketplaces: [], plugins: [], total_available: 0, total_installed: 0 },
      isLoading: false,
      error: null,
    } as any);
    render(<MarketplacePage />, { wrapper });
    expect(screen.getByText("Add Source")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockedUseMarketplace.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Fetch failed"),
    } as any);
    render(<MarketplacePage />, { wrapper });
    expect(screen.getByText(/Failed to load marketplace/)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockedUseMarketplace.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);
    render(<MarketplacePage />, { wrapper });
    expect(screen.getByPlaceholderText("Search plugins...")).toBeInTheDocument();
  });

  it("shows Suggested sources with official marketplace card", () => {
    mockedUseMarketplace.mockReturnValue({
      data: { marketplaces: [], plugins: [], total_available: 0, total_installed: 0 },
      isLoading: false,
      error: null,
    } as any);
    render(<MarketplacePage />, { wrapper });
    expect(screen.getByText("Suggested sources")).toBeInTheDocument();
    expect(screen.getByText("Official Anthropic plugins")).toBeInTheDocument();
  });
});
