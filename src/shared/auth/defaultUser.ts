import type { User } from "@/shared/auth/types";

export const defaultUser: User = {
  id: "demo-operator",
  name: "Demo Operator",
  roles: ["viewer"],
  facilities: ["primary"]
};
