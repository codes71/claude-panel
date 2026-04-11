import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "./client";
import type {
  McpServerListResponse,
  McpServerCreateRequest,
  McpServerUpdateRequest,
  McpProjectsResponse,
} from "../types";

export function useMcpServers() {
  return useQuery({
    queryKey: ["mcp-servers"],
    queryFn: () => get<McpServerListResponse>("/mcp"),
  });
}

export function useProjectPaths() {
  return useQuery({
    queryKey: ["mcp-projects"],
    queryFn: () => get<McpProjectsResponse>("/mcp/projects"),
  });
}

export function useToggleMcpServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      put<{ name: string; enabled: boolean; status: string }>(
        `/mcp/${encodeURIComponent(name)}/toggle?enabled=${enabled}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-servers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCreateMcpServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: McpServerCreateRequest) =>
      post<{ name: string; status: string }>("/mcp", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-servers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateMcpServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, data }: { name: string; data: McpServerUpdateRequest }) =>
      put<{ name: string; status: string }>(`/mcp/${encodeURIComponent(name)}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-servers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteMcpServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      del<{ name: string; status: string }>(`/mcp/${encodeURIComponent(name)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp-servers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
