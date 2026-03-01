import { useMemo } from "react";
import { useAuth } from "@/shared/auth";
import type { Role } from "@/shared/auth/types";

type Permission =
  | "billing.view_invoice"
  | "billing.add_invoice"
  | "billing.change_invoice"
  | "billing.delete_invoice"
  | "billing.record_payment"
  | "billing.view_invoiceitem"
  | "billing.add_invoiceitem"
  | "billing.change_invoiceitem"
  | "billing.delete_invoiceitem";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    "billing.view_invoice",
    "billing.add_invoice",
    "billing.change_invoice",
    "billing.delete_invoice",
    "billing.record_payment",
    "billing.view_invoiceitem",
    "billing.add_invoiceitem",
    "billing.change_invoiceitem",
    "billing.delete_invoiceitem"
  ],
  admin_corporativo: [
    "billing.view_invoice",
    "billing.add_invoice",
    "billing.change_invoice",
    "billing.delete_invoice",
    "billing.record_payment",
    "billing.view_invoiceitem",
    "billing.add_invoiceitem",
    "billing.change_invoiceitem",
    "billing.delete_invoiceitem"
  ],
  gerente: [
    "billing.view_invoice",
    "billing.add_invoice",
    "billing.change_invoice",
    "billing.view_invoiceitem",
    "billing.add_invoiceitem"
  ],
  financeiro: [
    "billing.view_invoice",
    "billing.add_invoice",
    "billing.change_invoice",
    "billing.delete_invoice",
    "billing.record_payment",
    "billing.view_invoiceitem",
    "billing.add_invoiceitem",
    "billing.change_invoiceitem",
    "billing.delete_invoiceitem"
  ],
  ops: ["billing.view_invoice", "billing.view_invoiceitem"],
  viewer: []
};

function buildPermissionSet(roles: Role[] | undefined): Set<Permission> {
  const set = new Set<Permission>();
  if (!roles) {
    return set;
  }
  roles.forEach((role) => {
    ROLE_PERMISSIONS[role]?.forEach((perm) => {
      set.add(perm);
    });
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
