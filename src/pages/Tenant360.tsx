import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { tenantsApi } from "@/api/tenants";
import type { Tenant360 } from "@/api/tenants";
import "@/pages/Tenant360.css";

const DEFAULT_TABS = ["contracts", "invoices", "payments", "access", "tickets", "audit_logs"];

type ColumnDef = {
  key: string;
  label: string;
  format?: "date" | "datetime" | "currency" | "status";
};

const TAB_COLUMNS: Record<string, ColumnDef[]> = {
  contracts: [
    { key: "id", label: "#" },
    { key: "unit_id", label: "Unit" },
    { key: "move_in", label: "Move In", format: "date" },
    { key: "move_out", label: "Move Out", format: "date" },
    { key: "status", label: "Status", format: "status" },
    { key: "created_at", label: "Created", format: "datetime" }
  ],
  invoices: [
    { key: "id", label: "#" },
    { key: "contract_id", label: "Contract" },
    { key: "issue_date", label: "Issue Date", format: "date" },
    { key: "due_date", label: "Due Date", format: "date" },
    { key: "total_amount", label: "Amount", format: "currency" },
    { key: "status", label: "Status", format: "status" }
  ],
  payments: [
    { key: "id", label: "#" },
    { key: "invoice_id", label: "Invoice" },
    { key: "amount", label: "Amount", format: "currency" },
    { key: "payment_date", label: "Date", format: "datetime" },
    { key: "method", label: "Method" },
    { key: "status", label: "Status", format: "status" }
  ],
  access: [
    { key: "id", label: "#" },
    { key: "type", label: "Type" },
    { key: "timestamp", label: "Timestamp", format: "datetime" },
    { key: "status", label: "Status", format: "status" }
  ],
  tickets: [
    { key: "id", label: "#" },
    { key: "subject", label: "Subject" },
    { key: "status", label: "Status", format: "status" },
    { key: "created_at", label: "Created", format: "datetime" },
    { key: "resolved_at", label: "Resolved", format: "datetime" }
  ],
  audit_logs: [
    { key: "id", label: "#" },
    { key: "timestamp", label: "Date", format: "datetime" },
    { key: "reason", label: "Reason" }
  ]
};

const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  facility_id: "Facility",
  tenant_id: "Tenant",
  unit_id: "Unit",
  contract_id: "Contract",
  invoice_id: "Invoice",
  move_in: "Move In",
  move_out: "Move Out",
  terms: "Terms",
  status: "Status",
  signed_metadata: "Signed Metadata",
  signed_at: "Signed At",
  audit_reference_id: "Audit Reference",
  billing_reference_id: "Billing Reference",
  created_at: "Created",
  updated_at: "Updated",
  issue_date: "Issue Date",
  due_date: "Due Date",
  total_amount: "Total Amount",
  amount: "Amount",
  payment_date: "Payment Date",
  method: "Method",
  transaction_id: "Transaction ID",
  subject: "Subject",
  description: "Description",
  resolved_at: "Resolved At",
  user_id: "User",
  content_type_id: "Content Type",
  object_id: "Object ID",
  changes: "Changes",
  timestamp: "Timestamp",
  reason: "Reason",
  type: "Type"
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIVE: { bg: "#ecfdf5", color: "#059669" },
  DRAFT: { bg: "#eff6ff", color: "#2563eb" },
  SIGNED: { bg: "#ecfdf5", color: "#059669" },
  CANCELLED: { bg: "#fff1f2", color: "#dc2626" },
  PENDING: { bg: "#fffbeb", color: "#d97706" },
  OPEN: { bg: "#eff6ff", color: "#2563eb" },
  OVERDUE: { bg: "#fff1f2", color: "#dc2626" },
  PAID: { bg: "#ecfdf5", color: "#059669" },
  VOID: { bg: "#f1f5f9", color: "#64748b" },
  COMPLETED: { bg: "#ecfdf5", color: "#059669" },
  FAILED: { bg: "#fff1f2", color: "#dc2626" },
  RESOLVED: { bg: "#ecfdf5", color: "#059669" },
  IN_PROGRESS: { bg: "#fffbeb", color: "#d97706" },
  TRANSFER: { bg: "#eff6ff", color: "#2563eb" },
  PIX: { bg: "#f0fdf4", color: "#16a34a" },
  CREDIT_CARD: { bg: "#faf5ff", color: "#7c3aed" },
  BOLETO: { bg: "#fffbeb", color: "#d97706" }
};

function formatDate(value: unknown): string {
  if (!value) return "-";
  const str = String(value);
  const date = new Date(str);
  if (isNaN(date.getTime())) return str;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatDateTime(value: unknown): string {
  if (!value) return "-";
  const str = String(value);
  const date = new Date(str);
  if (isNaN(date.getTime())) return str;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return "-";
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function renderStatusBadge(value: unknown): JSX.Element {
  if (!value) return <span>-</span>;
  const str = String(value);
  const style = STATUS_COLORS[str] ?? { bg: "#f1f5f9", color: "#64748b" };
  return (
    <span
      className="tenant-360-status-badge"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {str.replace(/_/g, " ")}
    </span>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function renderCell(value: unknown, format?: string): JSX.Element | string {
  switch (format) {
    case "date":
      return formatDate(value);
    case "datetime":
      return formatDateTime(value);
    case "currency":
      return formatCurrency(value);
    case "status":
      return renderStatusBadge(value);
    default:
      return formatCellValue(value);
  }
}

function isDateField(key: string): boolean {
  return /(_at|_date|date_|timestamp|move_in|move_out|signed_at|resolved_at)$/i.test(key) ||
    key === "move_in" || key === "move_out";
}

function isCurrencyField(key: string): boolean {
  return /amount/i.test(key);
}

function formatDetailValue(key: string, value: unknown): JSX.Element | string {
  if (value === null || value === undefined) return "-";

  if (typeof value === "object") {
    return (
      <pre className="tenant-360-detail-json">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  const str = String(value);

  if (key === "status" || key === "method") {
    return renderStatusBadge(value);
  }

  if (isDateField(key) && str) {
    return formatDateTime(value);
  }

  if (isCurrencyField(key)) {
    return formatCurrency(value);
  }

  return str || "-";
}

function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Tenant360Page() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<Tenant360 | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("contracts");
  const [detailRow, setDetailRow] = useState<Record<string, unknown> | null>(null);
  const modalPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!id) {
        setLoadError("Tenant ID is required.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const result = await tenantsApi.get360(parseInt(id, 10));

        if (!isMounted) {
          return;
        }

        setData(result);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setLoadError("Tenant not found.");
        } else {
          setLoadError("Unable to load tenant 360 view. Please try again.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  const closeModal = useCallback(() => {
    setDetailRow(null);
  }, []);

  useEffect(() => {
    if (!detailRow) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [detailRow, closeModal]);

  const handleEdit = () => {
    if (!id) return;
    navigate(`/tenants/${id}`);
  };

  const handleBack = () => {
    navigate("/tenants");
  };

  if (isLoading) {
    return (
      <main className="tenant-360-page">
        <div className="tenant-360-loading">Loading tenant 360 view...</div>
      </main>
    );
  }

  if (loadError && !data) {
    return (
      <main className="tenant-360-page">
        <div className="tenant-360-error">
          <p>{loadError}</p>
          <button type="button" className="tenant-360-button" onClick={handleBack}>
            Back to Tenants
          </button>
        </div>
      </main>
    );
  }

  const tenant = data?.tenant;
  const tabs = data?.tabs ?? [];
  const activeTabData = tabs.find((t) => t.key === activeTab);
  const tabResults = activeTabData?.data?.results ?? [];
  const columns = TAB_COLUMNS[activeTab] ?? [];

  const tabKeys =
    tabs.length > 0
      ? tabs
      : DEFAULT_TABS.map((key) => ({
          key,
          label: key
            .replace(/_/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          data: {
            count: 0,
            page: 1,
            page_size: 25,
            num_pages: 0,
            next_page: null,
            prev_page: null,
            results: []
          }
        }));

  const activeTabLabel = tabKeys.find((t) => t.key === activeTab)?.label ?? activeTab;

  return (
    <main className="tenant-360-page">
      <header className="tenant-360-header">
        <div className="tenant-360-header__left">
          <button type="button" className="tenant-360-back" onClick={handleBack}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
          <div>
            <h1>
              {tenant?.first_name} {tenant?.last_name}
            </h1>
            <div className="tenant-360-meta">
              {tenant?.email && <span className="tenant-360-info">{tenant.email}</span>}
              {tenant?.phone_primary && <span className="tenant-360-info">{tenant.phone_primary}</span>}
            </div>
          </div>
        </div>
        <div className="tenant-360-header__actions">
          <button type="button" className="tenant-360-secondary" onClick={handleEdit}>
            Edit Tenant
          </button>
        </div>
      </header>

      {loadError && <div className="tenant-360-alert--error">{loadError}</div>}

      <div className="tenant-360-table-wrapper">
        <div className="tenant-360-tabs" role="tablist">
          {tabKeys.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`tenant-360-tab ${activeTab === tab.key ? "tenant-360-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          {tabResults.length === 0 ? (
            <div style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--ink-faint)" }}>
              No data available.
            </div>
          ) : (
            <table className="tenant-360-table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {tabResults.map((row, index) => (
                  <tr key={index}>
                    {columns.map((col) => (
                      <td key={col.key}>{renderCell(row[col.key], col.format)}</td>
                    ))}
                    <td>
                      <div className="tenant-360-actions">
                        <button
                          type="button"
                          className="tenant-360-icon-button"
                          onClick={() => setDetailRow(row)}
                          aria-label="View details"
                          title="View"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="tenant-360-table-footer">
          {activeTabData
            ? `Showing ${tabResults.length} of ${activeTabData.data.count} entries`
            : "0 entries"}
        </div>
      </div>

      {detailRow && (
        <div
          className="tenant-360-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tenant-360-detail-title"
        >
          <div className="tenant-360-modal__overlay" onClick={closeModal} />
          <div className="tenant-360-modal__panel" ref={modalPanelRef}>
            <div className="tenant-360-modal__header">
              <h2 id="tenant-360-detail-title">
                {activeTabLabel} #{String(detailRow.id ?? "")}
              </h2>
              <button type="button" className="tenant-360-modal__close" onClick={closeModal}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="tenant-360-detail-grid">
              {Object.entries(detailRow).map(([key, value]) => (
                <div key={key} className="tenant-360-detail-item">
                  <span className="tenant-360-detail-label">{getFieldLabel(key)}</span>
                  <span className="tenant-360-detail-value">
                    {formatDetailValue(key, value)}
                  </span>
                </div>
              ))}
            </div>

            <div className="tenant-360-modal__actions">
              <button type="button" className="tenant-360-button" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
