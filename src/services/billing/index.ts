import { apiClient } from "@/api/client";

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "OVERDUE" | "VOID";

export type PaymentMethod = "CASH" | "CARD" | "TRANSFER" | "OTHER";

export type InvoiceItem = {
  id: number | string;
  description: string;
  quantity: number;
  unit_price: string;
  total?: string;
};

export type Invoice = {
  id: number | string;
  contract: number;
  tenant: number | { id: number; name: string };
  tenant_id?: number;
  tenant_name?: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  total_amount: string;
  items: InvoiceItem[];
  void_reason?: string;
  created_at?: string;
  updated_at?: string;
};

export type InvoiceCreatePayload = {
  contract: number;
  tenant: number;
  issue_date: string;
  due_date: string;
  status?: InvoiceStatus;
  items: {
    description: string;
    quantity: number;
    unit_price: string;
  }[];
};

export type InvoiceUpdatePayload = Partial<InvoiceCreatePayload>;

export type InvoiceItemPayload = {
  description: string;
  quantity: number;
  unit_price: string;
};

export type PaymentPayload = {
  invoice: number;
  amount: string;
  method: PaymentMethod;
  transaction_id?: string;
};

export type InvoiceListParams = {
  status?: InvoiceStatus;
  tenant_id?: string | number;
  page?: number;
  page_size?: number;
};

export type PaginatedResponse<T> = {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
};

export const encodePathSegment = (id: string | number) => encodeURIComponent(String(id));

const BILLING_BASE = "/api/v1/billing/facilities";

export const invoiceAPI = {
  list: async (
    facilityId: string | number,
    params: InvoiceListParams = {}
  ): Promise<PaginatedResponse<Invoice>> => {
    const response = await apiClient.get(`${BILLING_BASE}/${encodePathSegment(facilityId)}/invoices/`, {
      params
    });
    const data = response.data;
    if (Array.isArray(data)) {
      return { results: data, count: data.length, next: null, previous: null };
    }
    return {
      results: data.results ?? [],
      count: data.count ?? 0,
      next: data.next ?? null,
      previous: data.previous ?? null
    };
  },

  get: async (facilityId: string | number, invoiceId: string | number): Promise<Invoice> => {
    const response = await apiClient.get(
      `${BILLING_BASE}/${encodePathSegment(facilityId)}/invoices/${encodePathSegment(invoiceId)}/`
    );
    return response.data;
  },

  create: async (facilityId: string | number, payload: InvoiceCreatePayload): Promise<Invoice> => {
    const response = await apiClient.post(
      `${BILLING_BASE}/${encodePathSegment(facilityId)}/invoices/`,
      payload
    );
    return response.data;
  },

  update: async (
    facilityId: string | number,
    invoiceId: string | number,
    payload: InvoiceUpdatePayload
  ): Promise<Invoice> => {
    const response = await apiClient.put(
      `${BILLING_BASE}/${encodePathSegment(facilityId)}/invoices/${encodePathSegment(invoiceId)}/`,
      payload
    );
    return response.data;
  },

  partialUpdate: async (
    facilityId: string | number,
    invoiceId: string | number,
    payload: InvoiceUpdatePayload
  ): Promise<Invoice> => {
    const response = await apiClient.patch(
      `${BILLING_BASE}/${encodePathSegment(facilityId)}/invoices/${encodePathSegment(invoiceId)}/`,
      payload
    );
    return response.data;
  },

  delete: async (facilityId: string | number, invoiceId: string | number): Promise<void> => {
    await apiClient.delete(
      `${BILLING_BASE}/${encodePathSegment(facilityId)}/invoices/${encodePathSegment(invoiceId)}/`
    );
  },

  void: async (
    facilityId: string | number,
    invoiceId: string | number,
    void_reason: string
  ): Promise<Invoice> => {
    const response = await apiClient.patch(
      `${BILLING_BASE}/${encodePathSegment(facilityId)}/invoices/${encodePathSegment(invoiceId)}/void/`,
      { void_reason }
    );
    return response.data;
  },

  getPdfUrl: (facilityId: string | number, invoiceId: string | number): string => {
    return `${apiClient.defaults.baseURL}${BILLING_BASE}/${encodePathSegment(facilityId)}/invoices/${encodePathSegment(invoiceId)}/pdf/`;
  },

  recordPayment: async (
    facilityId: string | number,
    payload: PaymentPayload
  ): Promise<unknown> => {
    const response = await apiClient.post(
      `${BILLING_BASE}/${encodePathSegment(facilityId)}/invoices/record-payment/`,
      payload
    );
    return response.data;
  }
};

export const invoiceItemAPI = {
  list: async (
    facilityId: string | number,
    invoiceId: string | number
  ): Promise<InvoiceItem[]> => {
    const response = await apiClient.get(
      `${BILLING_BASE}/${encodePathSegment(facilityId)}/invoices/${encodePathSegment(invoiceId)}/items/`
    );
    const data = response.data;
    return Array.isArray(data) ? data : data.results ?? [];
  },

  create: async (
    facilityId: string | number,
    invoiceId: string | number,
    payload: InvoiceItemPayload
  ): Promise<InvoiceItem> => {
    const response = await apiClient.post(
      `${BILLING_BASE}/${encodePathSegment(facilityId)}/invoices/${encodePathSegment(invoiceId)}/items/`,
      payload
    );
    return response.data;
  },

  get: async (
    facilityId: string | number,
    invoiceId: string | number,
    itemId: string | number
  ): Promise<InvoiceItem> => {
    const response = await apiClient.get(
      `${BILLING_BASE}/${encodePathSegment(facilityId)}/invoices/${encodePathSegment(invoiceId)}/items/${encodePathSegment(itemId)}/`
    );
    return response.data;
  },

  update: async (
    facilityId: string | number,
    invoiceId: string | number,
    itemId: string | number,
    payload: InvoiceItemPayload
  ): Promise<InvoiceItem> => {
    const response = await apiClient.put(
      `${BILLING_BASE}/${encodePathSegment(facilityId)}/invoices/${encodePathSegment(invoiceId)}/items/${encodePathSegment(itemId)}/`,
      payload
    );
    return response.data;
  },

  partialUpdate: async (
    facilityId: string | number,
    invoiceId: string | number,
    itemId: string | number,
    payload: Partial<InvoiceItemPayload>
  ): Promise<InvoiceItem> => {
    const response = await apiClient.patch(
      `${BILLING_BASE}/${encodePathSegment(facilityId)}/invoices/${encodePathSegment(invoiceId)}/items/${encodePathSegment(itemId)}/`,
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
      `${BILLING_BASE}/${encodePathSegment(facilityId)}/invoices/${encodePathSegment(invoiceId)}/items/${encodePathSegment(itemId)}/`
    );
  }
};