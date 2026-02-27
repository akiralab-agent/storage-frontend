import { apiClient } from "@/api/client";

export type Tenant = {
  id: number;
  first_name: string;
  last_name: string;
  document: string | null;
  email: string | null;
  category: string | null;
  address: string | null;
  phone_primary: string | null;
  phone_secondary: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  facility: number | null;
};

export type TenantPayload = {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone_primary?: string | null;
  phone_secondary?: string | null;
  document?: string | null;
  category?: string | null;
  address?: string | null;
};

export type Tenant360Tab = {
  key: string;
  label: string;
  data: {
    count: number;
    page: number;
    page_size: number;
    num_pages: number;
    next_page: number | null;
    prev_page: number | null;
    results: Record<string, unknown>[];
  };
};

export type Tenant360 = {
  tenant: Tenant;
  facility_id: string;
  tabs: Tenant360Tab[];
};

function normalizeList(payload: unknown): Tenant[] {
  if (Array.isArray(payload)) {
    return payload as Tenant[];
  }

  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: Tenant[] }).results;
    if (Array.isArray(results)) {
      return results;
    }
  }

  return [];
}

export const tenantsApi = {
  list: async (): Promise<Tenant[]> => {
    const response = await apiClient.get("/api/v1/tenants/");
    return normalizeList(response.data);
  },

  get: async (id: number): Promise<Tenant> => {
    const response = await apiClient.get(`/api/v1/tenants/${id}/`);
    return response.data as Tenant;
  },

  create: async (data: TenantPayload): Promise<Tenant> => {
    const response = await apiClient.post("/api/v1/tenants/", data);
    return response.data as Tenant;
  },

  update: async (id: number, data: TenantPayload): Promise<Tenant> => {
    const response = await apiClient.patch(`/api/v1/tenants/${id}/`, data);
    return response.data as Tenant;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/tenants/${id}/`);
  },

  get360: async (id: number): Promise<Tenant360> => {
    const response = await apiClient.get(`/api/v1/tenants/${id}/360/`);
    return response.data as Tenant360;
  }
};
