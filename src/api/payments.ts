import { apiClient } from "@/api/client";

export type Payment = {
  id: number;
  tenant: number | null;
  tenant_name: string | null;
  invoice: number | null;
  invoice_number: string | null;
  amount: string;
  payment_method: string | null;
  payment_date: string;
  reference_number: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  facility: number | null;
};

export type PaymentPayload = {
  tenant?: number | null;
  invoice?: number | null;
  amount: string;
  payment_method?: string | null;
  payment_date: string;
  reference_number?: string | null;
  notes?: string | null;
  status?: string;
};

export type PaymentListResponse = {
  count: number;
  page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
  results: Payment[];
};

function normalizeList(payload: unknown): Payment[] {
  if (Array.isArray(payload)) {
    return payload as Payment[];
  }

  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: Payment[] }).results;
    if (Array.isArray(results)) {
      return results;
    }
  }

  return [];
}

export const paymentsApi = {
  list: async (params?: {
    tenant_id?: number;
    invoice_id?: number;
    status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaymentListResponse> => {
    const response = await apiClient.get("/api/v1/payments/", { params });
    const data = response.data;
    return {
      count: data.count ?? data.length ?? 0,
      page: data.page ?? 1,
      page_size: data.page_size ?? 10,
      next: data.next ?? null,
      previous: data.previous ?? null,
      results: normalizeList(data)
    };
  },

  get: async (id: number): Promise<Payment> => {
    const response = await apiClient.get(`/api/v1/payments/${id}/`);
    return response.data as Payment;
  },

  create: async (data: PaymentPayload): Promise<Payment> => {
    const response = await apiClient.post("/api/v1/payments/", data);
    return response.data as Payment;
  },

  update: async (id: number, data: PaymentPayload): Promise<Payment> => {
    const response = await apiClient.patch(`/api/v1/payments/${id}/`, data);
    return response.data as Payment;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/v1/payments/${id}/`);
  }
};
