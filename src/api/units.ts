import { apiClient } from "@/api/client";

export type UnitType = {
  id: string;
  name: string;
};

export type UnitStatus = "LIVRE" | "RESERVADA" | "OCUPADA" | "BLOQUEADA" | "EM_VISTORIA";

export type UnitRecord = {
  id: string;
  unit_type: string;
  unit_number: string;
  status: UnitStatus;
  reservation_expires_at: string | null;
};

export type UnitPayload = {
  unit_type: string;
  unit_number: string;
  status: UnitStatus;
  reservation_expires_at: string | null;
};

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: T[] }).results;
    if (Array.isArray(results)) {
      return results;
    }
  }

  return [];
}

export const unitTypesApi = {
  list: async (): Promise<UnitType[]> => {
    const response = await apiClient.get("/api/unit-types/");
    return normalizeList<UnitType>(response.data);
  }
};

export const unitsApi = {
  list: async (): Promise<UnitRecord[]> => {
    const response = await apiClient.get("/api/units/");
    return normalizeList<UnitRecord>(response.data);
  },

  create: async (data: UnitPayload): Promise<UnitRecord> => {
    const response = await apiClient.post("/api/units/", data);
    return response.data as UnitRecord;
  },

  update: async (id: string, data: UnitPayload): Promise<UnitRecord> => {
    const response = await apiClient.put(`/api/units/${id}/`, data);
    return response.data as UnitRecord;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/units/${id}/`);
  }
};
