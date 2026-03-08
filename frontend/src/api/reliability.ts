import { useQuery } from "@tanstack/react-query";
import { get } from "./client";
import type {
  ClaudeMdDriftResponse,
  McpDiagnosticsResponse,
  McpHealthResponse,
  ProviderProvenanceResponse,
} from "../types";

export function useMcpDiagnostics() {
  return useQuery({
    queryKey: ["mcp-diagnostics"],
    queryFn: () => get<McpDiagnosticsResponse>("/mcp/diagnostics"),
    refetchInterval: 15_000,
  });
}

export function useMcpHealth() {
  return useQuery({
    queryKey: ["mcp-health"],
    queryFn: () => get<McpHealthResponse>("/mcp/health"),
    refetchInterval: 15_000,
  });
}

export function useClaudeMdDrift() {
  return useQuery({
    queryKey: ["claude-md-drift"],
    queryFn: () => get<ClaudeMdDriftResponse>("/claude-md/drift"),
    refetchInterval: 20_000,
  });
}

export function useProviderProvenance() {
  return useQuery({
    queryKey: ["provider-provenance"],
    queryFn: () => get<ProviderProvenanceResponse>("/skill-providers/provenance"),
    refetchInterval: 20_000,
  });
}
