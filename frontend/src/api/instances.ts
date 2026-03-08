import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "./client";
import type {
  InstanceListResponse,
  InstanceInfo,
  InstanceSwitchRequest,
  InstanceAddRequest,
} from "../types";

export function useInstances() {
  return useQuery({
    queryKey: ["instances"],
    queryFn: () => get<InstanceListResponse>("/instances"),
    staleTime: 60_000,
  });
}

export function useActiveInstance() {
  return useQuery({
    queryKey: ["instances", "active"],
    queryFn: () => get<InstanceInfo>("/instances/active"),
    staleTime: 60_000,
  });
}

export function useSwitchInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InstanceSwitchRequest) =>
      post<InstanceInfo>("/instances/switch", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] });
      qc.invalidateQueries({ queryKey: ["instances", "active"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["plugins"] });
      qc.invalidateQueries({ queryKey: ["mcp-servers"] });
      qc.invalidateQueries({ queryKey: ["mcp-diagnostics"] });
      qc.invalidateQueries({ queryKey: ["mcp-health"] });
      qc.invalidateQueries({ queryKey: ["claude-md"] });
      qc.invalidateQueries({ queryKey: ["claude-md-drift"] });
      qc.invalidateQueries({ queryKey: ["visibility"] });
      qc.invalidateQueries({ queryKey: ["ccr"] });
      qc.invalidateQueries({ queryKey: ["commands"] });
      qc.invalidateQueries({ queryKey: ["command"] });
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      qc.invalidateQueries({ queryKey: ["providers"] });
      qc.invalidateQueries({ queryKey: ["skill-providers"] });
      qc.invalidateQueries({ queryKey: ["skill-catalog"] });
      qc.invalidateQueries({ queryKey: ["provider-provenance"] });
      qc.invalidateQueries({ queryKey: ["config-bundle-export"] });
    },
  });
}

export function useAddInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: InstanceAddRequest) =>
      post<InstanceInfo>("/instances/add", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] });
    },
  });
}

export function useRemoveInstance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (path: string) =>
      del<void>(`/instances/${encodeURIComponent(path)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] });
    },
  });
}
