import { apiClient } from "@/api/client";

export type FacilityRecord = {
  id: number;
  name: string;
  address: string;
  organization: number;
  timezone: string;
};

export type FacilityPayload = {
  name: string;
  address: string;
  organization: number;
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
    const response = await apiClient.get("/api/v1/organizations/facilities/");
    return normalizeList(response.data);
  },

  create: async (data: FacilityPayload): Promise<FacilityRecord> => {
    const response = await apiClient.post("/api/v1/organizations/facilities/", data);
    return response.data as FacilityRecord;
  },

  update: async (id: number, data: FacilityPayload): Promise<FacilityRecord> => {
    const response = await apiClient.put(`/api/v1/organizations/facilities/${id}/`, data);
    return response.data as FacilityRecord;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/organizations/facilities/${id}/`);
  }
};
