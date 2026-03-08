import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, put, post, del } from "./client";
import type {
  ClaudeMdListResponse,
  ClaudeMdFileContent,
  ClaudeMdUpdateRequest,
  ClaudeMdCreateRequest,
} from "../types";

export function useClaudeMdFiles() {
  return useQuery({
    queryKey: ["claude-md"],
    queryFn: () => get<ClaudeMdListResponse>("/claude-md"),
  });
}

export function useClaudeMdFile(path: string | null) {
  return useQuery({
    queryKey: ["claude-md", path],
    queryFn: () =>
      get<ClaudeMdFileContent>(`/claude-md/file?path=${encodeURIComponent(path!)}`),
    enabled: !!path,
  });
}

export function useUpdateClaudeMd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ClaudeMdUpdateRequest) =>
      put<ClaudeMdFileContent>("/claude-md", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claude-md"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCreateClaudeMd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ClaudeMdCreateRequest) =>
      post<ClaudeMdFileContent>("/claude-md", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claude-md"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteClaudeMd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (path: string) =>
      del<{ deleted: string }>(`/claude-md?path=${encodeURIComponent(path)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claude-md"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
