import type { RouteObject } from "react-router-dom";
import StatusPage from "@/features/status/ui/StatusPage";
import StatusOpsPage from "@/features/status/ui/StatusOpsPage";
import { RequireFacility, RequireRole } from "@/shared/auth";

export const statusRoutes: RouteObject[] = [
  {
    path: "/status",
    element: <StatusPage />
  },
  {
    path: "/status/ops",
    element: (
      <RequireRole roles={["ops", "admin"]}>
        <RequireFacility facilities={["primary"]}>
          <StatusOpsPage />
        </RequireFacility>
      </RequireRole>
    )
  }
];
