import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { get, post, del } from "./client";
import type {
  SkillProviderListResponse,
  SkillProviderAddRequest,
  SkillProviderActionResponse,
  SkillInstallRequest,
  SkillInstallActionResponse,
  CatalogPageResponse,
} from "../types";

export function useSkillProviders() {
  return useQuery({
    queryKey: ["skill-providers"],
    queryFn: () => get<SkillProviderListResponse>("/skill-providers"),
  });
}

export interface CatalogParams {
  page?: number;
  pageSize?: number;
  search?: string;
  provider?: string;
  type?: string;
}

export function useSkillCatalog(params: CatalogParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.pageSize) searchParams.set("page_size", String(params.pageSize));
  if (params.search) searchParams.set("search", params.search);
  if (params.provider) searchParams.set("provider", params.provider);
  if (params.type && params.type !== "all") searchParams.set("type", params.type);
  const qs = searchParams.toString();
  const path = `/skill-providers/catalog${qs ? `?${qs}` : ""}`;

  return useQuery({
    queryKey: ["skill-catalog", params],
    queryFn: () => get<CatalogPageResponse>(path),
    placeholderData: keepPreviousData,
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
      qc.invalidateQueries({ queryKey: ["skill-catalog"] });
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
      qc.invalidateQueries({ queryKey: ["skill-catalog"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["visibility"] });
    },
  });
}
