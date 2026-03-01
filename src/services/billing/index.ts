import { apiClient } from "@/api/client";

export type InvoiceRecord = {
  id: string | number;
  tenant_name?: string | null;
  tenant?: { id?: string | number; name?: string | null } | null;
  tenant_id?: string | number | null;
  issue_date?: string | null;
  due_date?: string | null;
  total?: number | string | null;
  amount_total?: number | string | null;
  status?: string | null;
  state?: string | null;
};

export type InvoiceListParams = {
  status?: string;
  tenant_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
};

export type InvoiceListResponse = {
  results: InvoiceRecord[];
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  pageSize: number;
};

function normalizeList(payload: unknown): { results: InvoiceRecord[]; count: number } {
  if (Array.isArray(payload)) {
    return { results: payload as InvoiceRecord[], count: payload.length };
  }

  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: InvoiceRecord[] }).results;
    const count =
      (payload as { count?: number }).count ?? (Array.isArray(results) ? results.length : 0);
    return { results: Array.isArray(results) ? results : [], count };
  }

  return { results: [], count: 0 };
}

export const encodePathSegment = (id: string | number) => encodeURIComponent(String(id));

export const invoiceAPI = {
  get: async (facilityId: string, invoiceId: string | number) => {
    const response = await apiClient.get(
      `/api/facilities/${encodePathSegment(facilityId)}/invoices/${encodePathSegment(invoiceId)}/`
    );
    return response.data;
  },

  list: async (
    facilityId: string,
    params: InvoiceListParams = {}
  ): Promise<InvoiceListResponse> => {
    const response = await apiClient.get(
      `/api/facilities/${encodePathSegment(facilityId)}/invoices/`,
      {
        params
      }
    );
    const data = response.data as {
      results?: InvoiceRecord[];
      count?: number;
      next?: string | null;
      previous?: string | null;
      page_size?: number;
    };

    const normalized = normalizeList(data);
    const pageSize = data?.page_size ?? params.page_size ?? normalized.results.length;

    return {
      results: normalized.results,
      count: normalized.count,
      next: data?.next ?? null,
      previous: data?.previous ?? null,
      page: params.page ?? 1,
      pageSize
    };
  },

  recordPayment: async (
    facilityId: string,
    invoiceId: string | number,
    payload: Record<string, unknown>
  ) => {
    const response = await apiClient.post(
      `/api/facilities/${encodePathSegment(facilityId)}/invoices/${encodePathSegment(invoiceId)}/payments/`,
      payload
    );
    return response.data;
  },

  voidInvoice: async (
    facilityId: string,
    invoiceId: string | number,
    payload: Record<string, unknown> = {}
  ) => {
    const response = await apiClient.patch(
      `/api/facilities/${encodePathSegment(facilityId)}/invoices/${encodePathSegment(
        invoiceId
      )}/void/`,
      payload
    );
    return response.data;
  }
};

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED";

export type PaymentMethod = "CARD" | "CASH" | "BANK_TRANSFER" | "CHECK" | "OTHER";

export type PaymentRecord = {
  id: string | number;
  invoice: string | number;
  amount: string;
  method: string;
  transaction_id: string | null;
  status: PaymentStatus;
  created_at?: string;
  updated_at?: string;
};

export type PaymentPayload = {
  invoice: string | number;
  amount: string;
  method: string;
  transaction_id?: string | null;
  status?: PaymentStatus;
};

export type PaymentListParams = {
  invoice?: string | number;
  status?: PaymentStatus;
  page?: number;
  page_size?: number;
};

export type PaymentListResponse = {
  results: PaymentRecord[];
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  pageSize: number;
};

export const paymentAPI = {
  list: async (
    facilityId: string,
    params: PaymentListParams = {}
  ): Promise<PaymentListResponse> => {
    const response = await apiClient.get(
      `/api/v1/billing/facilities/${encodePathSegment(facilityId)}/payments/`,
      { params }
    );
    const data = response.data as {
      results?: PaymentRecord[];
      count?: number;
      next?: string | null;
      previous?: string | null;
      page_size?: number;
    };

    const results = Array.isArray(data?.results) ? data.results : [];
    const count = data?.count ?? results.length;
    const pageSize = data?.page_size ?? params.page_size ?? results.length;

    return {
      results,
      count,
      next: data?.next ?? null,
      previous: data?.previous ?? null,
      page: params.page ?? 1,
      pageSize
    };
  },

  get: async (facilityId: string, paymentId: string | number): Promise<PaymentRecord> => {
    const response = await apiClient.get(
      `/api/v1/billing/facilities/${encodePathSegment(facilityId)}/payments/${encodePathSegment(paymentId)}/`
    );
    return response.data as PaymentRecord;
  },

  create: async (facilityId: string, payload: PaymentPayload): Promise<PaymentRecord> => {
    const response = await apiClient.post(
      `/api/v1/billing/facilities/${encodePathSegment(facilityId)}/payments/`,
      payload
    );
    return response.data as PaymentRecord;
  },

  update: async (
    facilityId: string,
    paymentId: string | number,
    payload: Partial<PaymentPayload>
  ): Promise<PaymentRecord> => {
    const response = await apiClient.put(
      `/api/v1/billing/facilities/${encodePathSegment(facilityId)}/payments/${encodePathSegment(paymentId)}/`,
      payload
    );
    return response.data as PaymentRecord;
  },

  patch: async (
    facilityId: string,
    paymentId: string | number,
    payload: Partial<PaymentPayload>
  ): Promise<PaymentRecord> => {
    const response = await apiClient.patch(
      `/api/v1/billing/facilities/${encodePathSegment(facilityId)}/payments/${encodePathSegment(paymentId)}/`,
      payload
    );
    return response.data as PaymentRecord;
  },

  delete: async (facilityId: string, paymentId: string | number): Promise<void> => {
    await apiClient.delete(
      `/api/v1/billing/facilities/${encodePathSegment(facilityId)}/payments/${encodePathSegment(paymentId)}/`
    );
  }
};
