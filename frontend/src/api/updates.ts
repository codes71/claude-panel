import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post } from "./client";
import type { UpdateCheckResponse, UpdateApplyResponse } from "../types";

export function useUpdateCheck() {
  return useQuery({
    queryKey: ["updates", "check"],
    queryFn: () => get<UpdateCheckResponse>("/updates/check"),
    staleTime: 3_600_000,
    refetchOnWindowFocus: false,
  });
}

export function useApplyUpdate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => post<UpdateApplyResponse>("/updates/apply"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["updates"] });
    },
  });
}
