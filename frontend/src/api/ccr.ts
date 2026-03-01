import { useQuery } from "@tanstack/react-query";
import { get } from "./client";
import type { CcrDashboardResponse } from "../types";

export function useCcrDashboard() {
  return useQuery({
    queryKey: ["ccr"],
    queryFn: () => get<CcrDashboardResponse>("/ccr"),
  });
}
