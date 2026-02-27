import { apiClient } from "@/api/client";

export type UnitType = {
  id: number;
  name: string;
  width: string | null;
  depth: string | null;
  height: string | null;
  base_price: string | null;
  min_price: string | null;
  max_price: string | null;
  facility: number | null;
};

export type UnitStatus = "LIVRE" | "RESERVADA" | "OCUPADA" | "BLOQUEADA" | "EM_VISTORIA";

export type UnitRecord = {
  id: number;
  unit_type: number;
  unit_number: string;
  status: UnitStatus;
  reservation_expires_at: string | null;
};

export type UnitPayload = {
  unit_type: number;
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
    const response = await apiClient.get("/api/v1/inventory/unit-types/");
    return normalizeList<UnitType>(response.data);
  }
};

export const unitsApi = {
  list: async (): Promise<UnitRecord[]> => {
    const response = await apiClient.get("/api/v1/inventory/units/");
    return normalizeList<UnitRecord>(response.data);
  },

  create: async (data: UnitPayload): Promise<UnitRecord> => {
    const response = await apiClient.post("/api/v1/inventory/units/", data);
    return response.data as UnitRecord;
  },

  update: async (id: number, data: UnitPayload): Promise<UnitRecord> => {
    const response = await apiClient.put(`/api/v1/inventory/units/${id}/`, data);
    return response.data as UnitRecord;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/inventory/units/${id}/`);
  }
};
