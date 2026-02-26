import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { apiClient } from "@/api/client";
import type { AuthState, User } from "@/shared/auth/types";
import { clearTokens, getAccessToken, setTokens } from "@/shared/auth/tokenStorage";
import { readStoredFacilityId, writeStoredFacilityId } from "@/shared/facility/storage";

export const AuthContext = createContext<AuthState | null>(null);

async function fetchProfile(): Promise<User> {
  const response = await apiClient.get("/api/profile/");
  const data = response.data;
  return {
    id: data.id,
    email: data.email,
    name: data.email?.split("@")[0] ?? "",
    role: data.role,
    roles: data.role ? [data.role] : [],
    facilities: data.facilities ?? []
  };
}

function getInitialAuthState() {
  const hasToken = Boolean(getAccessToken());
  return {
    isAuthenticated: hasToken,
    isLoading: hasToken, // Loading if we have a token (need to fetch profile)
    user: null
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [{ user, isAuthenticated, isLoading }, setAuthState] = useState<{
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
  }>(getInitialAuthState);

  // Load profile on mount if token exists
  useEffect(() => {
    const token = getAccessToken();
    if (token && !user) {
      fetchProfile()
        .then((profile) => {
          // Set default facility from profile
          const savedFacilityId = readStoredFacilityId();
          if (savedFacilityId && profile.facilities?.some((f) => String(f.id) === savedFacilityId)) {
            // Keep existing
          } else if (profile.facilities?.length) {
            writeStoredFacilityId(String(profile.facilities[0].id));
          }
          setAuthState({ user: profile, isAuthenticated: true, isLoading: false });
        })
        .catch(() => {
          // Token invalid, clear state
          clearTokens();
          setAuthState({ user: null, isAuthenticated: false, isLoading: false });
        });
    } else if (!token) {
      setAuthState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async ({ username, password }: { username: string; password: string }) => {
    const response = await apiClient.post("/api/token/", { username, password });
    const access = response.data?.access as string | undefined;
    const refresh = response.data?.refresh as string | undefined;

    if (!access || !refresh) {
      throw new Error("Token response missing access/refresh");
    }

    setTokens(access, refresh);

    const profile = await fetchProfile();

    // Set default facility from profile (interceptor will pick it up from localStorage)
    const savedFacilityId = readStoredFacilityId();
    if (savedFacilityId && profile.facilities?.some((f) => String(f.id) === savedFacilityId)) {
      // Keep existing
    } else if (profile.facilities?.length) {
      writeStoredFacilityId(String(profile.facilities[0].id));
    }

    setAuthState({ user: profile, isAuthenticated: true, isLoading: false });
  }, []);

  const logout = useCallback(() => {
    clearTokens();
    writeStoredFacilityId(null);
    setAuthState({ user: null, isAuthenticated: false, isLoading: false });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      logout
    }),
    [user, isAuthenticated, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}