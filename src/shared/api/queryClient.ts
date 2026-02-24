import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { handleQueryError } from "@/shared/api/errorHandling";

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleQueryError
  }),
  mutationCache: new MutationCache({
    onError: handleQueryError
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        return !(typeof error === "object" && error !== null && "status" in error);
      }
    }
  }
});
