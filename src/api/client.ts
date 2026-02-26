import axios from "axios";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken
} from "@/shared/auth/tokenStorage";
import { readStoredFacilityId } from "@/shared/facility/storage";

const apiBaseUrl =
  import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

const apiClient = axios.create({
  baseURL: apiBaseUrl
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Always read facility ID from localStorage for consistency
  const facilityId = readStoredFacilityId();
  if (facilityId) {
    config.headers["X-Facility-ID"] = facilityId;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const response = await axios.post(
    `${apiBaseUrl}/api/token/refresh/`,
    { refresh: refreshToken },
    { headers: { "Content-Type": "application/json" } }
  );
  const access = response.data?.access as string | undefined;
  if (!access) {
    throw new Error("Token refresh did not return an access token");
  }
  setAccessToken(access);
  return access;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url ?? "";
    if (requestUrl.includes("/api/token/refresh/") || requestUrl.includes("/api/token/")) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return Promise.reject(error);
    }

    if (!refreshPromise) {
      refreshPromise = refreshAccessToken(refreshToken).finally(() => {
        refreshPromise = null;
      });
    }

    try {
      const newAccessToken = await refreshPromise;
      originalRequest._retry = true;
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      clearTokens();
      return Promise.reject(refreshError);
    }
  }
);

export { apiClient, apiBaseUrl };
