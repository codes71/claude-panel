import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../api/settings", () => ({
  useSettings: vi.fn(),
  useUpdateSettings: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

import SettingsPage from "../SettingsPage";
import { useSettings } from "../../api/settings";

const mockedUseSettings = vi.mocked(useSettings);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("SettingsPage", () => {
  it("renders heading", () => {
    mockedUseSettings.mockReturnValue({
      data: {
        env: { MY_VAR: "hello" },
        skipDangerousModePermissionPrompt: false,
        statusLine: null,
        enabledPlugins: {},
      },
      isLoading: false,
      error: null,
    } as any);
    render(<SettingsPage />, { wrapper });
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders with empty data (instance switch scenario)", () => {
    mockedUseSettings.mockReturnValue({
      data: {
        env: undefined,
        skipDangerousModePermissionPrompt: undefined,
        statusLine: null,
        enabledPlugins: {},
      },
      isLoading: false,
      error: null,
    } as any);
    render(<SettingsPage />, { wrapper });
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockedUseSettings.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
    } as any);
    render(<SettingsPage />, { wrapper });
    expect(screen.getByText(/Failed to load settings/)).toBeInTheDocument();
  });

  it("shows loading skeleton", () => {
    mockedUseSettings.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);
    render(<SettingsPage />, { wrapper });
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });
});
