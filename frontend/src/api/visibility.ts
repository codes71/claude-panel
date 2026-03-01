import { useQuery } from "@tanstack/react-query";
import { get } from "./client";
import type { VisibilityData } from "../types";

export function useVisibility() {
  return useQuery({
    queryKey: ["visibility"],
    queryFn: () => get<VisibilityData>("/visibility"),
  });
}
