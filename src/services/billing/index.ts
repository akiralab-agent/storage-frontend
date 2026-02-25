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
    const count = (payload as { count?: number }).count ?? (Array.isArray(results) ? results.length : 0);
    return { results: Array.isArray(results) ? results : [], count };
  }

  return { results: [], count: 0 };
}

const encodePathSegment = (id: string | number) => encodeURIComponent(String(id));

export const invoiceAPI = {
  list: async (facilityId: string, params: InvoiceListParams = {}): Promise<InvoiceListResponse> => {
    const response = await apiClient.get(`/api/facilities/${encodePathSegment(facilityId)}/invoices/`, {
      params
    });
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

  recordPayment: async (facilityId: string, invoiceId: string | number, payload: Record<string, unknown>) => {
    const response = await apiClient.post(
      `/api/facilities/${encodePathSegment(facilityId)}/invoices/${encodePathSegment(invoiceId)}/payments/`,
      payload
    );
    return response.data;
  },

  voidInvoice: async (facilityId: string, invoiceId: string | number) => {
    const response = await apiClient.post(
      `/api/facilities/${encodePathSegment(facilityId)}/invoices/${encodePathSegment(invoiceId)}/void/`
    );
    return response.data;
  }
};
