import { apiClient } from "@/api/client";

export type Organization = {
  id: string;
  name: string;
  tax_id: string;
  timezone: string;
};

export type OrganizationPayload = {
  name: string;
  tax_id: string;
  timezone: string;
};

function normalizeList(payload: unknown): Organization[] {
  if (Array.isArray(payload)) {
    return payload as Organization[];
  }

  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: Organization[] }).results;
    if (Array.isArray(results)) {
      return results;
    }
  }

  return [];
}

export const organizationsApi = {
  list: async (): Promise<Organization[]> => {
    const response = await apiClient.get("/api/organizations/");
    return normalizeList(response.data);
  },

  create: async (data: OrganizationPayload): Promise<Organization> => {
    const response = await apiClient.post("/api/organizations/", data);
    return response.data as Organization;
  },

  update: async (id: string, data: OrganizationPayload): Promise<Organization> => {
    const response = await apiClient.put(`/api/organizations/${id}/`, data);
    return response.data as Organization;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/organizations/${id}/`);
  }
};
