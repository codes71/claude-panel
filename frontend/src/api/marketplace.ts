import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "./client";
import type { MarketplaceListResponse, PluginInstallRequest } from "../types";

export function useMarketplace() {
  return useQuery({
    queryKey: ["marketplace"],
    queryFn: () => get<MarketplaceListResponse>("/marketplace"),
  });
}

export function useInstallPlugin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: PluginInstallRequest) =>
      post<{ plugin_id: string; action: string; success: boolean; message: string }>(
        "/marketplace/install",
        req,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      qc.invalidateQueries({ queryKey: ["plugins"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUninstallPlugin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pluginId: string) =>
      post<{ plugin_id: string; action: string; success: boolean; message: string }>(
        "/marketplace/uninstall",
        { plugin_id: pluginId },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      qc.invalidateQueries({ queryKey: ["plugins"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
