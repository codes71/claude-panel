import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put } from "./client";
import type { PluginListResponse } from "../types";

export function usePlugins() {
  return useQuery({
    queryKey: ["plugins"],
    queryFn: () => get<PluginListResponse>("/plugins"),
  });
}

export function useTogglePlugin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pluginId, enabled }: { pluginId: string; enabled: boolean }) =>
      put<{ plugin_id: string; enabled: boolean }>(
        `/plugins/${encodeURIComponent(pluginId)}/toggle?enabled=${enabled}`,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plugins"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
