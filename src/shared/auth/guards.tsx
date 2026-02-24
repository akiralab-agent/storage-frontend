import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import type { Facility, Role } from "@/shared/auth/types";
import { useAuth } from "@/shared/auth/context";

interface GuardProps {
  children: ReactNode;
}

export function RequireRole({ roles, children }: GuardProps & { roles: Role[] }) {
  const { user } = useAuth();
  const location = useLocation();
  const authorized = !!user && roles.some((role) => user.roles.includes(role));

  if (!authorized) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

export function RequireFacility({ facilities, children }: GuardProps & { facilities: Facility[] }) {
  const { user } = useAuth();
  const location = useLocation();
  const authorized = !!user && facilities.some((facility) => user.facilities.includes(facility));

  if (!authorized) {
    return <Navigate to="/unauthorized" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
