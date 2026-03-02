import { apiClient } from "@/api/client";

export type ContractStatus = "DRAFT" | "ACTIVE" | "CLOSED" | "CANCELED";

export type Contract = {
  id: number;
  tenant: number;
  unit: number;
  move_in: string;
  move_out: string | null;
  terms: string | null;
  status: ContractStatus;
  signed_metadata: Record<string, unknown>;
  signed_at: string | null;
  audit_reference_id: string | null;
  billing_reference_id: string | null;
  facility: number;
  created_at: string;
  updated_at: string;
};

export type ContractPayload = {
  tenant: number;
  unit: number;
  move_in: string;
  move_out?: string | null;
  terms?: string | null;
  status?: ContractStatus;
  signed_metadata?: Record<string, unknown>;
  signed_at?: string | null;
  audit_reference_id?: string | null;
  billing_reference_id?: string | null;
};

export type ContractFilters = {
  status?: ContractStatus;
  tenant_id?: number;
  unit_id?: number;
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

export const contractsApi = {
  list: async (filters?: ContractFilters): Promise<Contract[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.tenant_id) params.append("tenant_id", String(filters.tenant_id));
    if (filters?.unit_id) params.append("unit_id", String(filters.unit_id));

    const query = params.toString();
    const url = query ? `/api/v1/contracts/?${query}` : "/api/v1/contracts/";
    const response = await apiClient.get(url);
    return normalizeList<Contract>(response.data);
  },

  get: async (id: number): Promise<Contract> => {
    const response = await apiClient.get(`/api/v1/contracts/${id}/`);
    return response.data as Contract;
  },

  create: async (data: ContractPayload): Promise<Contract> => {
    const response = await apiClient.post("/api/v1/contracts/", data);
    return response.data as Contract;
  },

  update: async (id: number, data: Partial<ContractPayload>): Promise<Contract> => {
    const response = await apiClient.patch(`/api/v1/contracts/${id}/`, data);
    return response.data as Contract;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/contracts/${id}/`);
  }
};
