import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import McpServerCard from "../McpServerCard";
import type { McpServer } from "../../types";

const mockServer: McpServer = {
  name: "test-server",
  server_type: "stdio",
  command: "node",
  args: ["server.js"],
  env: {},
  enabled: true,
  scope: "global",
  tool_count: 3,
  estimated_tokens: 950,
};

const mockProps = {
  onToggle: vi.fn(),
  onDelete: vi.fn(),
  toggling: false,
};

describe("McpServerCard", () => {
  it("renders basic server information", () => {
    render(<McpServerCard server={mockServer} {...mockProps} />);

    expect(screen.getByText("test-server")).toBeInTheDocument();
    expect(screen.getByText("stdio")).toBeInTheDocument();
    expect(screen.getByText("global")).toBeInTheDocument();
    expect(screen.getByText("node server.js")).toBeInTheDocument();
    expect(screen.getByText("3 tools")).toBeInTheDocument();
  });

  it("displays OAuth chip when OAuth is configured", () => {
    const serverWithOAuth: McpServer = {
      ...mockServer,
      oauth_auth_server_metadata_url: "https://auth.example.com/.well-known/oauth-authorization-server",
    };

    render(<McpServerCard server={serverWithOAuth} {...mockProps} />);

    expect(screen.getByText("OAuth")).toBeInTheDocument();
  });

  it("does not display OAuth chip when OAuth is not configured", () => {
    render(<McpServerCard server={mockServer} {...mockProps} />);

    expect(screen.queryByText("OAuth")).not.toBeInTheDocument();
  });

  it("displays connection status when headers helper is enabled", () => {
    const serverWithConnection: McpServer = {
      ...mockServer,
      has_headers_helper: true,
      connection_status: "connected",
    };

    render(<McpServerCard server={serverWithConnection} {...mockProps} />);

    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("displays reconnecting status with warning color", () => {
    const serverReconnecting: McpServer = {
      ...mockServer,
      has_headers_helper: true,
      connection_status: "reconnecting",
    };

    render(<McpServerCard server={serverReconnecting} {...mockProps} />);

    expect(screen.getByText("Reconnecting")).toBeInTheDocument();
  });

  it("displays disconnected status with error color", () => {
    const serverDisconnected: McpServer = {
      ...mockServer,
      has_headers_helper: true,
      connection_status: "disconnected",
    };

    render(<McpServerCard server={serverDisconnected} {...mockProps} />);

    expect(screen.getByText("Disconnected")).toBeInTheDocument();
  });

  it("displays unknown status when connection status is unknown", () => {
    const serverUnknown: McpServer = {
      ...mockServer,
      has_headers_helper: true,
      connection_status: "unknown",
    };

    render(<McpServerCard server={serverUnknown} {...mockProps} />);

    expect(screen.getByText("Status Unknown")).toBeInTheDocument();
  });

  it("does not display connection status when headers helper is not enabled", () => {
    const serverNoHeaders: McpServer = {
      ...mockServer,
      has_headers_helper: false,
      connection_status: "connected",
    };

    render(<McpServerCard server={serverNoHeaders} {...mockProps} />);

    expect(screen.queryByText("Connected")).not.toBeInTheDocument();
    expect(screen.queryByText("Reconnecting")).not.toBeInTheDocument();
    expect(screen.queryByText("Disconnected")).not.toBeInTheDocument();
  });

  it("displays validation warnings when output schema issues exist", () => {
    const serverWithWarnings: McpServer = {
      ...mockServer,
      has_output_schema_issues: true,
      validation_warnings: ["Invalid schema format", "Missing required field"],
    };

    render(<McpServerCard server={serverWithWarnings} {...mockProps} />);

    expect(screen.getByText(/Output schema issues:/)).toBeInTheDocument();
    expect(screen.getByText(/Invalid schema format; Missing required field/)).toBeInTheDocument();
  });

  it("does not display validation warnings when no issues exist", () => {
    const serverNoWarnings: McpServer = {
      ...mockServer,
      has_output_schema_issues: false,
      validation_warnings: [],
    };

    render(<McpServerCard server={serverNoWarnings} {...mockProps} />);

    expect(screen.queryByText(/Output schema issues:/)).not.toBeInTheDocument();
  });

  it("displays all enhanced features together", () => {
    const fullyEnhancedServer: McpServer = {
      ...mockServer,
      oauth_auth_server_metadata_url: "https://auth.example.com/.well-known/oauth-authorization-server",
      has_headers_helper: true,
      connection_status: "connected",
      has_output_schema_issues: true,
      validation_warnings: ["Schema warning"],
    };

    render(<McpServerCard server={fullyEnhancedServer} {...mockProps} />);

    // Check all enhanced features are displayed
    expect(screen.getByText("OAuth")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText(/Output schema issues:/)).toBeInTheDocument();
    expect(screen.getByText(/Schema warning/)).toBeInTheDocument();
  });

  it("handles plugin scope with special styling", () => {
    const pluginServer: McpServer = {
      ...mockServer,
      scope: "plugin",
      plugin_id: "test-plugin",
    };

    render(<McpServerCard server={pluginServer} {...mockProps} />);

    expect(screen.getByText("plugin")).toBeInTheDocument();
    expect(screen.getByText("Managed by plugin: test-plugin")).toBeInTheDocument();
  });

  it("handles project scope with project path", () => {
    const projectServer: McpServer = {
      ...mockServer,
      scope: "project",
      project_path: "/path/to/project",
    };

    render(<McpServerCard server={projectServer} {...mockProps} />);

    expect(screen.getByText("project")).toBeInTheDocument();
    expect(screen.getByText("/path/to/project")).toBeInTheDocument();
  });
});
