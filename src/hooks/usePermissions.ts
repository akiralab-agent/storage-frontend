import { useMemo } from "react";
import { useAuth } from "@/shared/auth";
import type { Role } from "@/shared/auth/types";

type Permission =
  | "billing.view_invoice"
  | "billing.view_invoices"
  | "billing.record_payment"
  | "billing.void_invoice";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "billing.view_invoice",
    "billing.view_invoices",
    "billing.record_payment",
    "billing.void_invoice"
  ],
  admin_corporativo: [
    "billing.view_invoice",
    "billing.view_invoices",
    "billing.record_payment",
    "billing.void_invoice"
  ],
  gerente: ["billing.view_invoice", "billing.view_invoices", "billing.record_payment"],
  financeiro: [
    "billing.view_invoice",
    "billing.view_invoices",
    "billing.record_payment",
    "billing.void_invoice"
  ],
  ops: ["billing.view_invoice", "billing.view_invoices"],
  viewer: []
};

function buildPermissionSet(roles: Role[] | undefined): Set<Permission> {
  const set = new Set<Permission>();
  if (!roles) {
    return set;
  }
  roles.forEach((role) => {
    ROLE_PERMISSIONS[role]?.forEach((perm) => set.add(perm));
  });
  return set;
}

export function usePermissions() {
  const { user } = useAuth();

  const permissionSet = useMemo(() => buildPermissionSet(user?.roles), [user?.roles]);

  const hasPermission = (permission: Permission) => permissionSet.has(permission);

  return {
    permissions: permissionSet,
    hasPermission
  };
}
