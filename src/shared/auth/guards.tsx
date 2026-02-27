import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import type { FacilityInfo, Role } from "@/shared/auth/types";
import { useAuth } from "@/shared/auth/useAuth";

interface GuardProps {
  children: ReactNode;
}

export function RequireRole({ roles, children }: GuardProps & { roles: Role[] }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Show nothing while loading - let the app finish initialization
  if (isLoading) {
    return null;
  }

  const authorized = !!user && roles.some((role) => user.roles.includes(role));

  if (!authorized) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export function RequireFacility({ facilities, children }: GuardProps & { facilities: FacilityInfo[] }) {
  const { user } = useAuth();
  const location = useLocation();
  const authorized = !!user && facilities.some((facility) => user.facilities.includes(facility));

  if (!authorized) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
