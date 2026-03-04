import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../api/instances", () => ({
  useInstances: vi.fn(),
  useSwitchInstance: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useAddInstance: vi.fn(() => ({ mutate: vi.fn(), isPending: false, isError: false })),
  useRemoveInstance: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

import InstanceSwitcher from "../InstanceSwitcher";
import { useInstances } from "../../api/instances";

const mockedUseInstances = vi.mocked(useInstances);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("InstanceSwitcher", () => {
  it("returns null when loading", () => {
    mockedUseInstances.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);
    const { container } = render(<InstanceSwitcher />, { wrapper });
    expect(container.firstChild).toBeNull();
  });

  it("returns null when only 1 instance", () => {
    mockedUseInstances.mockReturnValue({
      data: {
        instances: [{
          id: ".claude", path: "/home/.claude", label: ".claude",
          has_credentials: true, has_settings: true, has_plugins: true,
          has_commands: false, settings_count: 3, mcp_server_count: 1,
          is_active: true, claude_json_path: "/home/.claude.json",
        }],
        active: { id: ".claude", path: "/home/.claude", label: ".claude", is_active: true },
      },
      isLoading: false,
      error: null,
    } as any);
    const { container } = render(<InstanceSwitcher />, { wrapper });
    expect(container.firstChild).toBeNull();
  });

  it("renders selector when 2+ instances", () => {
    mockedUseInstances.mockReturnValue({
      data: {
        instances: [
          {
            id: ".claude", path: "/home/.claude", label: ".claude",
            has_credentials: true, has_settings: true, has_plugins: true,
            has_commands: false, settings_count: 3, mcp_server_count: 1,
            is_active: true, claude_json_path: "/home/.claude.json",
          },
          {
            id: ".claude-work", path: "/home/.claude-work", label: ".claude-work",
            has_credentials: true, has_settings: false, has_plugins: false,
            has_commands: false, settings_count: 0, mcp_server_count: 0,
            is_active: false, claude_json_path: "/home/.claude-work/.claude.json",
          },
        ],
        active: { id: ".claude", path: "/home/.claude", label: ".claude", is_active: true },
      },
      isLoading: false,
      error: null,
    } as any);
    render(<InstanceSwitcher />, { wrapper });
    expect(screen.getByText("Instance")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockedUseInstances.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed"),
    } as any);
    render(<InstanceSwitcher />, { wrapper });
    expect(screen.getByText("Failed to load instances")).toBeInTheDocument();
  });
});
