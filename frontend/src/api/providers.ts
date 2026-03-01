import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "./client";
import type { ProviderListResponse, ProviderActionResponse } from "../types";

export function useProviders() {
  return useQuery({
    queryKey: ["providers"],
    queryFn: () => get<ProviderListResponse>("/marketplace/providers"),
  });
}

export function useAddProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (source: string) =>
      post<ProviderActionResponse>("/marketplace/providers", { source }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useRemoveProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      del<ProviderActionResponse>(`/marketplace/providers/${encodeURIComponent(name)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name?: string) =>
      post<ProviderActionResponse>(
        name
          ? `/marketplace/providers/${encodeURIComponent(name)}/update`
          : "/marketplace/providers/update",
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["providers"] });
      qc.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });
}
