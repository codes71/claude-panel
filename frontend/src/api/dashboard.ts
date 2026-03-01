import { useQuery } from "@tanstack/react-query";
import { get } from "./client";
import type { DashboardData } from "../types";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => get<DashboardData>("/dashboard"),
    refetchInterval: 30_000,
  });
}
