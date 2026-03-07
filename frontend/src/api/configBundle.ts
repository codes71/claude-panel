import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { get, post } from "./client";
import type {
  ConfigBundleApplyResponse,
  ConfigBundleExportResponse,
  ConfigBundleValidationResponse,
} from "../types";

export function useConfigBundleExport() {
  return useQuery({
    queryKey: ["config-bundle-export"],
    queryFn: () => get<ConfigBundleExportResponse>("/config-bundle/export"),
  });
}

export function useValidateConfigBundle() {
  return useMutation({
    mutationFn: (bundle: Record<string, unknown>) =>
      post<ConfigBundleValidationResponse>("/config-bundle/validate", { bundle }),
  });
}

export function useApplyConfigBundle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bundle, dryRun }: { bundle: Record<string, unknown>; dryRun: boolean }) =>
      post<ConfigBundleApplyResponse>("/config-bundle/apply", { bundle, dry_run: dryRun }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["mcp-servers"] });
      qc.invalidateQueries({ queryKey: ["claude-md"] });
      qc.invalidateQueries({ queryKey: ["provider-provenance"] });
      qc.invalidateQueries({ queryKey: ["config-bundle-export"] });
    },
  });
}
