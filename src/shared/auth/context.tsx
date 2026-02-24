import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AuthState, User } from "@/shared/auth/types";

const AuthContext = createContext<AuthState | null>(null);

const defaultUser: User = {
  id: "demo-operator",
  name: "Demo Operator",
  roles: ["viewer"],
  facilities: ["primary"]
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user] = useState<User | null>(defaultUser);
  const value = useMemo<AuthState>(() => ({ user }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
