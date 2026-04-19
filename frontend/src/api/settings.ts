import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, patch } from "./client";
import type { EnvVarUpdate, SettingsData, SettingsUpdateRequest } from "../types";

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => get<SettingsData>("/settings"),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SettingsUpdateRequest) =>
      patch<SettingsData>("/settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

/**
 * Env updates MUST go through the dedicated `/settings/env` endpoint —
 * the backend converts the `[{key, value}]` list into the canonical dict shape.
 * Sending env through `PATCH /settings` used to corrupt `settings.json` by
 * writing the array literally, which Claude Code's /doctor rejects.
 */
export function useUpdateEnvVars() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: EnvVarUpdate[]) =>
      patch<Record<string, string>>("/settings/env", updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
