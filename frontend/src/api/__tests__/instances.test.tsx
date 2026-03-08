import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";

vi.mock("../client", () => ({
  get: vi.fn(),
  post: vi.fn(),
  del: vi.fn(),
}));

import { useSwitchInstance } from "../instances";
import { post } from "../client";

const mockedPost = vi.mocked(post);

describe("useSwitchInstance", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    mockedPost.mockReset();
  });

  it("invalidates instance-dependent MCP queries after a successful switch", async () => {
    mockedPost.mockResolvedValue({
      id: ".claude",
      path: "/home/code/.claude",
      label: ".claude",
      claude_json_path: "/home/code/.claude.json",
      has_credentials: true,
      has_settings: true,
      has_plugins: true,
      has_commands: true,
      settings_count: 3,
      mcp_server_count: 5,
      is_active: true,
    });

    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useSwitchInstance(), { wrapper });

    await result.current.mutateAsync({ path: "/home/code/.claude" });

    expect(mockedPost).toHaveBeenCalledWith("/instances/switch", { path: "/home/code/.claude" });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["instances"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["instances", "active"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["mcp-servers"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["mcp-diagnostics"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["mcp-health"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["claude-md-drift"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["provider-provenance"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["config-bundle-export"] });
  });
});
