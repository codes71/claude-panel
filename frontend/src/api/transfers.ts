import { useMutation, useQueryClient } from "@tanstack/react-query";
import { post } from "./client";
import type {
  TransferPreviewRequest,
  TransferPreviewResponse,
  TransferApplyRequest,
  TransferApplyResponse,
} from "../types";

export function usePreviewTransfer() {
  return useMutation({
    mutationFn: (body: TransferPreviewRequest) =>
      post<TransferPreviewResponse>("/instances/transfers/preview", body),
  });
}

export function useApplyTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TransferApplyRequest) =>
      post<TransferApplyResponse>("/instances/transfers/apply", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commands"] });
      qc.invalidateQueries({ queryKey: ["plugins"] });
      qc.invalidateQueries({ queryKey: ["mcp-servers"] });
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["instances"] });
    },
  });
}
