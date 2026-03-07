import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../api/plugins", () => ({
  usePlugins: vi.fn(),
  useTogglePlugin: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

import PluginsPage from "../PluginsPage";
import { usePlugins } from "../../api/plugins";

const mockedUsePlugins = vi.mocked(usePlugins);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("PluginsPage", () => {
  it("renders heading", () => {
    mockedUsePlugins.mockReturnValue({
      data: { plugins: [], total_tokens: 0 },
      isLoading: false,
      error: null,
    } as any);
    render(<PluginsPage />, { wrapper });
    expect(screen.getByText("No plugins found.")).toBeInTheDocument();
  });

  it("shows no plugins message", () => {
    mockedUsePlugins.mockReturnValue({
      data: { plugins: [], total_tokens: 0 },
      isLoading: false,
      error: null,
    } as any);
    render(<PluginsPage />, { wrapper });
    expect(screen.getByText("No plugins found.")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockedUsePlugins.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
    } as any);
    render(<PluginsPage />, { wrapper });
    expect(screen.getByText(/Failed to load plugins/)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockedUsePlugins.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);
    render(<PluginsPage />, { wrapper });
    expect(screen.getByPlaceholderText("Search plugins, skills...")).toBeInTheDocument();
  });
});
