import { createContext, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiClient } from "@/api/client";
import { defaultUser } from "@/shared/auth/defaultUser";
import type { AuthState, LoginCredentials, User } from "@/shared/auth/types";
import { clearTokens, getAccessToken, setTokens } from "@/shared/auth/tokenStorage";

export const AuthContext = createContext<AuthState | null>(null);

function getInitialAuthState() {
  const hasToken = Boolean(getAccessToken());
  return {
    isAuthenticated: hasToken,
    user: hasToken ? defaultUser : null
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ user, isAuthenticated }, setAuthState] = useState<{
    user: User | null;
    isAuthenticated: boolean;
  }>(getInitialAuthState);

  const login = useCallback(async ({ username, password }: LoginCredentials) => {
    const response = await apiClient.post("/api/token/", { username, password });
    const access = response.data?.access as string | undefined;
    const refresh = response.data?.refresh as string | undefined;

    if (!access || !refresh) {
      throw new Error("Token response missing access/refresh");
    }

    setTokens(access, refresh);
    setAuthState({ user: defaultUser, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    setAuthState({ user: null, isAuthenticated: false });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated,
      login,
      logout
    }),
    [user, isAuthenticated, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
