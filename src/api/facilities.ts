import { apiClient } from "@/api/client";

export type FacilityRecord = {
  id: string;
  name: string;
  address: string;
  organization: string;
  timezone: string;
};

export type FacilityPayload = {
  name: string;
  address: string;
  organization: string;
  timezone: string;
};

function normalizeList(payload: unknown): FacilityRecord[] {
  if (Array.isArray(payload)) {
    return payload as FacilityRecord[];
  }

  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: FacilityRecord[] }).results;
    if (Array.isArray(results)) {
      return results;
    }
  }

  return [];
}

export const facilitiesApi = {
  list: async (): Promise<FacilityRecord[]> => {
    const response = await apiClient.get("/api/facilities/");
    return normalizeList(response.data);
  },

  create: async (data: FacilityPayload): Promise<FacilityRecord> => {
    const response = await apiClient.post("/api/facilities/", data);
    return response.data as FacilityRecord;
  },

  update: async (id: string, data: FacilityPayload): Promise<FacilityRecord> => {
    const response = await apiClient.put(`/api/facilities/${id}/`, data);
    return response.data as FacilityRecord;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/facilities/${id}/`);
  }
};
