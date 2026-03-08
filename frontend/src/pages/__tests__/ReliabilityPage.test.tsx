import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../../api/reliability", () => ({
  useMcpDiagnostics: vi.fn(),
  useMcpHealth: vi.fn(),
  useClaudeMdDrift: vi.fn(),
  useProviderProvenance: vi.fn(),
}));

vi.mock("../../api/configBundle", () => ({
  useConfigBundleExport: vi.fn(),
  useValidateConfigBundle: vi.fn(),
  useApplyConfigBundle: vi.fn(),
}));

import ReliabilityPage from "../ReliabilityPage";
import {
  useMcpDiagnostics,
  useMcpHealth,
  useClaudeMdDrift,
  useProviderProvenance,
} from "../../api/reliability";
import {
  useApplyConfigBundle,
  useConfigBundleExport,
  useValidateConfigBundle,
} from "../../api/configBundle";

const mockedUseMcpDiagnostics = vi.mocked(useMcpDiagnostics);
const mockedUseMcpHealth = vi.mocked(useMcpHealth);
const mockedUseClaudeMdDrift = vi.mocked(useClaudeMdDrift);
const mockedUseProviderProvenance = vi.mocked(useProviderProvenance);
const mockedUseConfigBundleExport = vi.mocked(useConfigBundleExport);
const mockedUseValidateConfigBundle = vi.mocked(useValidateConfigBundle);
const mockedUseApplyConfigBundle = vi.mocked(useApplyConfigBundle);

describe("ReliabilityPage", () => {
  it("renders mcp doctor and claude.md drift sections", () => {
    mockedUseMcpDiagnostics.mockReturnValue({
      data: { servers: [], total: 0 },
      isLoading: false,
      error: null,
    } as any);
    mockedUseMcpHealth.mockReturnValue({
      data: { servers: [], updated_at: Date.now() },
      isLoading: false,
      error: null,
    } as any);
    mockedUseClaudeMdDrift.mockReturnValue({
      data: { events: [], cursor: "", generated_at: Date.now() },
      isLoading: false,
      error: null,
    } as any);
    mockedUseProviderProvenance.mockReturnValue({
      data: { version: 1, providers: [] },
      isLoading: false,
      error: null,
    } as any);
    mockedUseConfigBundleExport.mockReturnValue({
      data: { bundle: { version: 1 } },
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as any);
    mockedUseValidateConfigBundle.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: undefined,
    } as any);
    mockedUseApplyConfigBundle.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: undefined,
    } as any);

    render(<ReliabilityPage />);
    expect(screen.getByRole("heading", { name: /MCP Doctor/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /CLAUDE\.md Drift/i })).toBeInTheDocument();
  });
});
