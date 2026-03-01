import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, patch } from "./client";
import type { SettingsData, SettingsUpdateRequest } from "../types";

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
