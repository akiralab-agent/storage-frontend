import { apiClient } from "@/api/client";

// ── Types ──────────────────────────────────────────────────────────────────

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "OVERDUE" | "VOID";

export type InvoiceItem = {
  id: number;
  description: string;
  quantity: number;
  unit_price: string;
  total_amount?: string;
};

export type Invoice = {
  id: number;
  contract?: number | null;
  tenant: number | { id: number; name?: string | null } | null;
  tenant_name?: string | null;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  total_amount?: string | null;
  void_reason?: string | null;
  items?: InvoiceItem[];
};

export type InvoicePayload = {
  contract?: number | null;
  tenant: number;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  items?: { description: string; quantity: number; unit_price: string }[];
};

export type InvoiceItemPayload = {
  description: string;
  quantity: number;
  unit_price: string;
};

export type RecordPaymentPayload = {
  invoice: number;
  amount: string;
  method: "CASH" | "CARD" | "TRANSFER" | "OTHER";
  transaction_id?: string;
};

export type InvoiceListParams = {
  status?: string;
  tenant_id?: string;
  page?: number;
  page_size?: number;
};

export type InvoiceListResponse = {
  results: Invoice[];
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  pageSize: number;
};

// ── Helpers ────────────────────────────────────────────────────────────────

export const encodePathSegment = (id: string | number) => encodeURIComponent(String(id));

function billingBase(facilityId: string | number) {
  return `/api/v1/billing/facilities/${encodePathSegment(facilityId)}`;
}

function normalizeList(payload: unknown): { results: Invoice[]; count: number } {
  if (Array.isArray(payload)) {
    return { results: payload as Invoice[], count: payload.length };
  }
  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: Invoice[] }).results;
    const count =
      (payload as { count?: number }).count ?? (Array.isArray(results) ? results.length : 0);
    return { results: Array.isArray(results) ? results : [], count };
  }
  return { results: [], count: 0 };
}

// ── Invoice API ────────────────────────────────────────────────────────────

export const invoiceAPI = {
  list: async (
    facilityId: string | number,
    params: InvoiceListParams = {}
  ): Promise<InvoiceListResponse> => {
    const response = await apiClient.get(`${billingBase(facilityId)}/invoices/`, { params });
    const data = response.data as {
      results?: Invoice[];
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

  get: async (facilityId: string | number, invoiceId: string | number): Promise<Invoice> => {
    const response = await apiClient.get(
      `${billingBase(facilityId)}/invoices/${encodePathSegment(invoiceId)}/`
    );
    return response.data;
  },

  create: async (facilityId: string | number, payload: InvoicePayload): Promise<Invoice> => {
    const response = await apiClient.post(`${billingBase(facilityId)}/invoices/`, payload);
    return response.data;
  },

  update: async (
    facilityId: string | number,
    invoiceId: string | number,
    payload: Partial<InvoicePayload>
  ): Promise<Invoice> => {
    const response = await apiClient.patch(
      `${billingBase(facilityId)}/invoices/${encodePathSegment(invoiceId)}/`,
      payload
    );
    return response.data;
  },

  delete: async (facilityId: string | number, invoiceId: string | number): Promise<void> => {
    await apiClient.delete(`${billingBase(facilityId)}/invoices/${encodePathSegment(invoiceId)}/`);
  },

  voidInvoice: async (
    facilityId: string | number,
    invoiceId: string | number,
    payload: { void_reason: string }
  ): Promise<Invoice> => {
    const response = await apiClient.patch(
      `${billingBase(facilityId)}/invoices/${encodePathSegment(invoiceId)}/void/`,
      payload
    );
    return response.data;
  },

  recordPayment: async (
    facilityId: string | number,
    payload: RecordPaymentPayload
  ): Promise<unknown> => {
    const response = await apiClient.post(
      `${billingBase(facilityId)}/invoices/record-payment/`,
      payload
    );
    return response.data;
  },

  downloadPdfUrl: (facilityId: string | number, invoiceId: string | number): string => {
    return `${billingBase(facilityId)}/invoices/${encodePathSegment(invoiceId)}/pdf/`;
  },

  fetchInvoicePdf: async (
    facilityId: string | number,
    invoiceId: string | number
  ): Promise<string> => {
    const response = await apiClient.get(
      `${billingBase(facilityId)}/invoices/${encodePathSegment(invoiceId)}/pdf/`,
      { responseType: "blob" }
    );
    return URL.createObjectURL(response.data as Blob);
  }
};

// ── Payment Types ──────────────────────────────────────────────────────────

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

// ── Payment API ─────────────────────────────────────────────────────────────

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

// ── Invoice Items API ──────────────────────────────────────────────────────

export const invoiceItemsAPI = {
  list: async (facilityId: string | number, invoiceId: string | number): Promise<InvoiceItem[]> => {
    const response = await apiClient.get(
      `${billingBase(facilityId)}/invoices/${encodePathSegment(invoiceId)}/items/`
    );
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  },

  create: async (
    facilityId: string | number,
    invoiceId: string | number,
    payload: InvoiceItemPayload
  ): Promise<InvoiceItem> => {
    const response = await apiClient.post(
      `${billingBase(facilityId)}/invoices/${encodePathSegment(invoiceId)}/items/`,
      payload
    );
    return response.data;
  },

  update: async (
    facilityId: string | number,
    invoiceId: string | number,
    itemId: string | number,
    payload: Partial<InvoiceItemPayload>
  ): Promise<InvoiceItem> => {
    const response = await apiClient.patch(
      `${billingBase(facilityId)}/invoices/${encodePathSegment(invoiceId)}/items/${encodePathSegment(itemId)}/`,
      payload
    );
    return response.data;
  },

  delete: async (
    facilityId: string | number,
    invoiceId: string | number,
    itemId: string | number
  ): Promise<void> => {
    await apiClient.delete(
      `${billingBase(facilityId)}/invoices/${encodePathSegment(invoiceId)}/items/${encodePathSegment(itemId)}/`
    );
  }
};
