import { useQuery } from "@tanstack/react-query";
import { get } from "./client";

export interface HealthResponse {
  status: string;
  version: string;
  claude_home: string;
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => get<HealthResponse>("/health"),
    staleTime: 60_000,
  });
}
