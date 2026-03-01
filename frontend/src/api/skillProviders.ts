import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "./client";
import type {
  SkillProviderListResponse,
  SkillProviderAddRequest,
  SkillProviderActionResponse,
  SkillInstallRequest,
  SkillInstallActionResponse,
} from "../types";

export function useSkillProviders() {
  return useQuery({
    queryKey: ["skill-providers"],
    queryFn: () => get<SkillProviderListResponse>("/skill-providers"),
  });
}

export function useAddSkillProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SkillProviderAddRequest) =>
      post<SkillProviderActionResponse>("/skill-providers", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skill-providers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useRemoveSkillProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) =>
      del<SkillProviderActionResponse>(`/skill-providers/${encodeURIComponent(slug)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skill-providers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateSkillProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (slug?: string) =>
      post<SkillProviderActionResponse[] | SkillProviderActionResponse>(
        slug
          ? `/skill-providers/${encodeURIComponent(slug)}/update`
          : "/skill-providers/update"
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skill-providers"] });
    },
  });
}

export function useInstallSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SkillInstallRequest) =>
      post<SkillInstallActionResponse>("/skill-providers/install", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skill-providers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["visibility"] });
    },
  });
}

export function useUninstallSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SkillInstallRequest) =>
      post<SkillInstallActionResponse>("/skill-providers/uninstall", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["skill-providers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["visibility"] });
    },
  });
}
