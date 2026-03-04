import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("../../api/dashboard", () => ({
  useDashboard: vi.fn(),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

import DashboardPage from "../DashboardPage";
import { useDashboard } from "../../api/dashboard";

const mockedUseDashboard = vi.mocked(useDashboard);

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("DashboardPage", () => {
  it("renders dashboard heading", () => {
    mockedUseDashboard.mockReturnValue({
      data: {
        total_tokens: 5000,
        categories: [
          { name: "Plugins", total_tokens: 2000, color: "#8B5CF6", items: [] },
          { name: "MCP Servers", total_tokens: 1500, color: "#38BDF8", items: [] },
          { name: "CLAUDE.md", total_tokens: 1500, color: "#34D399", items: [] },
        ],
        suggestions: [],
        top_consumers: [],
      },
      isLoading: false,
      error: null,
    } as any);
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders with empty categories", () => {
    mockedUseDashboard.mockReturnValue({
      data: {
        total_tokens: 0,
        categories: [],
        suggestions: [],
        top_consumers: [],
      },
      isLoading: false,
      error: null,
    } as any);
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockedUseDashboard.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Fetch failed"),
    } as any);
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText(/Failed to load dashboard/)).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockedUseDashboard.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);
    render(<DashboardPage />, { wrapper });
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });
});
