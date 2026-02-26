import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { router } from "@/app/router";
import { AuthProvider } from "@/shared/auth";
import { FacilityProvider } from "@/contexts/FacilityContext";
import { queryClient } from "@/shared/api/queryClient";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <FacilityProvider>
          <RouterProvider router={router} />
        </FacilityProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
