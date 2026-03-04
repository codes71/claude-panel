import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../api/commands", () => ({
  useCommands: vi.fn(),
  useCommandDetail: vi.fn(() => ({ data: undefined })),
  useCreateCommand: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateCommand: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteCommand: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useRenameCommand: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

import CommandsPage from "../CommandsPage";
import { useCommands } from "../../api/commands";

const mockedUseCommands = vi.mocked(useCommands);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("CommandsPage", () => {
  it("renders heading", () => {
    mockedUseCommands.mockReturnValue({
      data: { namespaces: [], commands: [], total_count: 0, total_tokens: 0 },
      isLoading: false,
      error: null,
    } as any);
    render(<CommandsPage />, { wrapper });
    expect(screen.getByText("Commands")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockedUseCommands.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Failed"),
    } as any);
    render(<CommandsPage />, { wrapper });
    expect(screen.getByText(/Failed to load commands/)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockedUseCommands.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);
    render(<CommandsPage />, { wrapper });
    expect(screen.getByText("Commands")).toBeInTheDocument();
  });
});
