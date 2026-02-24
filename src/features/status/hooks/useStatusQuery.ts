import { useQuery } from "@tanstack/react-query";
import { statusApi } from "@/features/status/services";

export const statusQueryKeys = {
  all: ["status"] as const,
  current: () => [...statusQueryKeys.all, "current"] as const
};

export function useStatusQuery() {
  return useQuery({
    queryKey: statusQueryKeys.current(),
    queryFn: statusApi.getStatus,
    staleTime: 30_000
  });
}
