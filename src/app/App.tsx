import { QueryClientProvider } from "@tanstack/react-query";
import StatusPage from "@/features/status/ui/StatusPage";
import { queryClient } from "@/shared/api/queryClient";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusPage />
    </QueryClientProvider>
  );
}
