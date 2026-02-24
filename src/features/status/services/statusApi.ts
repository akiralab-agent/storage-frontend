import { request } from "@/shared/api/httpClient";
import type { StatusResponse } from "@/features/status/types";

export const statusApi = {
  getStatus: () => request<StatusResponse>("/status")
};
