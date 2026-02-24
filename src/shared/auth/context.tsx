import { createContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { AuthState, User } from "@/shared/auth/types";
import { defaultUser } from "@/shared/auth/defaultUser";

export const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user] = useState<User | null>(defaultUser);
  const value = useMemo<AuthState>(() => ({ user }), [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
