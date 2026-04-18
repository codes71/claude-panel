import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.getByText("Environment Variables")).toBeInTheDocument();
  });

  it("renders env stored as Claude array-of-objects (not index/object garbage)", () => {
    mockedUseSettings.mockReturnValue({
      data: {
        env: [
          { key: "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS", value: "1" },
          { key: "CLAUDE_CODE_NO_FLICKER", value: "1" },
        ],
        skipDangerousModePermissionPrompt: false,
        statusLine: null,
        enabledPlugins: {},
      },
      isLoading: false,
      error: null,
    } as any);
    render(<SettingsPage />, { wrapper });
    expect(screen.getByDisplayValue("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS")).toBeInTheDocument();
    expect(screen.getByDisplayValue("CLAUDE_CODE_NO_FLICKER")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("[object Object]")).not.toBeInTheDocument();
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
    expect(screen.getByText("Environment Variables")).toBeInTheDocument();
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
    expect(screen.getByText("Permissions")).toBeInTheDocument();
  });

  it("shows Add from catalog and opens dialog with official env docs link", async () => {
    const user = userEvent.setup();
    mockedUseSettings.mockReturnValue({
      data: {
        env: {},
        skipDangerousModePermissionPrompt: false,
        statusLine: null,
        enabledPlugins: {},
      },
      isLoading: false,
      error: null,
    } as any);
    render(<SettingsPage />, { wrapper });
    await user.click(screen.getByRole("button", { name: /add from catalog/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /official reference/i })).toHaveAttribute(
      "href",
      "https://code.claude.com/docs/en/env-vars",
    );
  });
});
