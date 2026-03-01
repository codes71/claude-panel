import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, put, del } from "./client";
import type {
  CommandListResponse,
  CommandDetail,
  CommandCreateRequest,
  CommandUpdateRequest,
} from "../types";

export function useCommands() {
  return useQuery({
    queryKey: ["commands"],
    queryFn: () => get<CommandListResponse>("/commands"),
  });
}

export function useCommandDetail(namespace: string | null, name: string | null) {
  const ns = namespace === "" ? "_root_" : namespace;
  return useQuery({
    queryKey: ["command", namespace, name],
    queryFn: () => get<CommandDetail>(`/commands/${encodeURIComponent(ns!)}/${encodeURIComponent(name!)}`),
    enabled: namespace !== null && name !== null,
  });
}

export function useCreateCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CommandCreateRequest) =>
      post<CommandDetail>("/commands", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commands"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name, content }: { namespace: string; name: string; content: string }) => {
      const ns = namespace === "" ? "_root_" : namespace;
      return put<CommandDetail>(`/commands/${encodeURIComponent(ns)}/${encodeURIComponent(name)}`, { content });
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["commands"] });
      qc.invalidateQueries({ queryKey: ["command", vars.namespace, vars.name] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ namespace, name }: { namespace: string; name: string }) => {
      const ns = namespace === "" ? "_root_" : namespace;
      return del<{ message: string }>(`/commands/${encodeURIComponent(ns)}/${encodeURIComponent(name)}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commands"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
