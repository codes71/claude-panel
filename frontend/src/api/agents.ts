import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "./client";
import type {
  AgentListResponse,
  AgentDetail,
  AgentCreateRequest,
  AgentRenameRequest,
  AgentScanResponse,
  AgentImportResponse,
  BrowseResponse,
} from "../types";

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: () => get<AgentListResponse>("/agents"),
  });
}

export function useAgentDetail(name: string | null) {
  return useQuery({
    queryKey: ["agent", name],
    queryFn: () => get<AgentDetail>(`/agents/${encodeURIComponent(name!)}`),
    enabled: name !== null,
  });
}

export function useCreateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AgentCreateRequest) =>
      post<AgentDetail>("/agents", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, content }: { name: string; content: string }) =>
      put<AgentDetail>(`/agents/${encodeURIComponent(name)}`, { content }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["agent", vars.name] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useRenameAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, ...body }: { name: string } & AgentRenameRequest) =>
      post<AgentDetail>(`/agents/${encodeURIComponent(name)}/rename`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name }: { name: string }) =>
      del<{ message: string }>(`/agents/${encodeURIComponent(name)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useBrowseDirectory() {
  return useMutation({
    mutationFn: (path: string) =>
      post<BrowseResponse>("/agents/browse", { path }),
  });
}

export function useScanFolder() {
  return useMutation({
    mutationFn: (folder_path: string) =>
      post<AgentScanResponse>("/agents/scan", { folder_path }),
  });
}

export function useImportAgents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { folder_path: string; names: string[]; overwrite: boolean }) =>
      post<AgentImportResponse>("/agents/import", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
