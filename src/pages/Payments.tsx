import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { paymentsApi } from "@/api/payments";
import type { Payment } from "@/api/payments";
import { tenantsApi } from "@/api/tenants";
import type { Tenant } from "@/api/tenants";
import "@/pages/Payments.css";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending", color: "#f59e0b" },
  { value: "completed", label: "Completed", color: "#10b981" },
  { value: "failed", label: "Failed", color: "#ef4444" },
  { value: "refunded", label: "Refunded", color: "#6366f1" }
];

const PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "pix", label: "PIX" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" }
];

const PAGE_SIZE = 10;

type PaymentFormValues = {
  tenant_id: string;
  invoice_id: string;
  amount: string;
  payment_method: string;
  payment_date: string;
  reference_number: string;
  notes: string;
  status: string;
};

const DEFAULT_FORM_VALUES: PaymentFormValues = {
  tenant_id: "",
  invoice_id: "",
  amount: "",
  payment_method: "",
  payment_date: new Date().toISOString().slice(0, 10),
  reference_number: "",
  notes: "",
  status: "pending"
};

function getStatusLabel(status: string | null): string {
  if (!status) return "-";
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

function getStatusColor(status: string | null): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "#64748b";
}

function getPaymentMethodLabel(method: string | null): string {
  if (!method) return "-";
  return PAYMENT_METHOD_OPTIONS.find((m) => m.value === method)?.label ?? method;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatCurrency(value: string | number | null): string {
  if (!value) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(num);
}

export default function PaymentsPage() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [pagination, setPagination] = useState({
    count: 0,
    page: 1,
    pageSize: PAGE_SIZE
  });
  const modalPanelRef = useRef<HTMLDivElement | null>(null);
  const modalFirstInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<PaymentFormValues>({
    defaultValues: DEFAULT_FORM_VALUES
  });

  const filteredPayments = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return payments.filter((payment) => {
      const tenantName = (payment.tenant_name ?? "").toLowerCase();
      const reference = (payment.reference_number ?? "").toLowerCase();
      const invoiceNum = (payment.invoice_number ?? "").toLowerCase();

      const matchesStatus = !statusFilter || payment.status === statusFilter;

      if (!normalizedQuery) {
        return matchesStatus;
      }

      const searchable = [tenantName, reference, invoiceNum].join(" ");
      return matchesStatus && searchable.includes(normalizedQuery);
    });
  }, [payments, searchTerm, statusFilter]);

  const totalPages = useMemo(() => {
    if (!pagination.count || !pagination.pageSize) return 1;
    return Math.max(1, Math.ceil(pagination.count / pagination.pageSize));
  }, [pagination.count, pagination.pageSize]);

  const visiblePages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const start = Math.max(1, Math.min(pagination.page - 2, totalPages - 4));
    return Array.from({ length: 5 }, (_, i) => start + i);
  }, [pagination.page, totalPages]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [paymentResponse, tenantList] = await Promise.all([
          paymentsApi.list({ page: pagination.page, page_size: PAGE_SIZE }),
          tenantsApi.list()
        ]);

        if (!isMounted) return;

        setPayments(paymentResponse.results);
        setPagination((prev) => ({
          ...prev,
          count: paymentResponse.count,
          pageSize: paymentResponse.page_size
        }));
        setTenants(tenantList);
      } catch {
        if (!isMounted) return;
        setLoadError("Unable to load payments. Please try again.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [pagination.page]);

  const refreshPayments = async () => {
    const response = await paymentsApi.list({ page: pagination.page, page_size: PAGE_SIZE });
    setPayments(response.results);
    setPagination((prev) => ({
      ...prev,
      count: response.count,
      pageSize: response.page_size
    }));
  };

  const openCreateModal = () => {
    setEditingPayment(null);
    reset(DEFAULT_FORM_VALUES);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (payment: Payment) => {
    setEditingPayment(payment);
    reset({
      tenant_id: payment.tenant?.toString() ?? "",
      invoice_id: payment.invoice?.toString() ?? "",
      amount: payment.amount,
      payment_method: payment.payment_method ?? "",
      payment_date: payment.payment_date ?? new Date().toISOString().slice(0, 10),
      reference_number: payment.reference_number ?? "",
      notes: payment.notes ?? "",
      status: payment.status ?? "pending"
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingPayment(null);
    reset(DEFAULT_FORM_VALUES);
  }, [reset]);

  useEffect(() => {
    if (!isModalOpen) return;

    const focusableSelector = [
      "button:not([disabled])",
      "a[href]",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");

    const getFocusable = () =>
      Array.from(modalPanelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);

    const focusTarget =
      modalFirstInputRef.current && !modalFirstInputRef.current.disabled
        ? modalFirstInputRef.current
        : getFocusable()[0];

    focusTarget?.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (
          !activeElement ||
          activeElement === first ||
          !modalPanelRef.current?.contains(activeElement)
        ) {
          event.preventDefault();
          last.focus();
        }
      } else if (activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [closeModal, isModalOpen]);

  const onSubmit = async (values: PaymentFormValues) => {
    setFormError(null);
    setPageSuccess(null);

    const payload = {
      tenant: values.tenant_id ? parseInt(values.tenant_id, 10) : null,
      invoice: values.invoice_id ? parseInt(values.invoice_id, 10) : null,
      amount: values.amount,
      payment_method: values.payment_method || null,
      payment_date: values.payment_date,
      reference_number: values.reference_number || null,
      notes: values.notes || null,
      status: values.status || "pending"
    };

    setIsSaving(true);

    try {
      const successMessage = editingPayment
        ? "Payment updated successfully."
        : "Payment created successfully.";

      if (editingPayment) {
        await paymentsApi.update(editingPayment.id, payload);
      } else {
        await paymentsApi.create(payload);
      }

      await refreshPayments();
      setPageSuccess(successMessage);
      closeModal();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        if (errorData && typeof errorData === "object") {
          const messages = Object.entries(errorData)
            .map(([field, fieldErrors]) => {
              if (Array.isArray(fieldErrors)) {
                return `${field}: ${fieldErrors.join(", ")}`;
              }
              return `${field}: ${fieldErrors}`;
            })
            .join("; ");
          setFormError(messages || "Unable to save payment. Please check the form and try again.");
        } else {
          setFormError("Unable to save payment. Please check the form and try again.");
        }
      } else {
        setFormError("Unexpected error while saving payment.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (payment: Payment) => {
    if (deletingIds.has(payment.id)) return;

    if (!window.confirm(`Delete payment #${payment.id}?`)) return;

    try {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.add(payment.id);
        return next;
      });
      await paymentsApi.delete(payment.id);
      await refreshPayments();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        await refreshPayments();
        return;
      }
      setLoadError("Unable to delete payment. Please try again.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(payment.id);
        return next;
      });
    }
  };

  const handleViewDetail = (payment: Payment) => {
    navigate(`/payments/${payment.id}`);
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const showingFrom = pagination.count === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const showingTo =
    pagination.count === 0 ? 0 : Math.min(pagination.page * pagination.pageSize, pagination.count);

  return (
    <main className="payments-page">
      <header className="payments-header">
        <div>
          <h1>Pagamentos</h1>
          <p className="payments-subtitle">Manage payments and transactions.</p>
        </div>
        <button type="button" className="payments-primary" onClick={openCreateModal}>
          New Payment
        </button>
      </header>

      {loadError && <div className="payments-alert payments-alert--error">{loadError}</div>}
      {pageSuccess && <div className="payments-alert payments-alert--success">{pageSuccess}</div>}

      {isLoading ? (
        <div className="payments-empty">Loading payments...</div>
      ) : payments.length === 0 ? (
        <div className="payments-empty">
          No payments found. Create the first payment to get started.
        </div>
      ) : (
        <div className="payments-table-wrapper">
          <div className="payments-table-toolbar">
            <select
              className="payments-table-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <label className="payments-search">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.65" y1="16.65" x2="21" y2="21" />
              </svg>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search payments..."
                aria-label="Search payments"
              />
            </label>
          </div>
          <table className="payments-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tenant</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <button
                      type="button"
                      className="payments-name-link"
                      onClick={() => handleViewDetail(payment)}
                    >
                      #{payment.id}
                    </button>
                  </td>
                  <td>{payment.tenant_name || "-"}</td>
                  <td>{formatCurrency(payment.amount)}</td>
                  <td>{getPaymentMethodLabel(payment.payment_method)}</td>
                  <td>{formatDate(payment.payment_date)}</td>
                  <td>
                    <span
                      className="payments-status-badge"
                      style={{
                        backgroundColor: `${getStatusColor(payment.status)}15`,
                        color: getStatusColor(payment.status)
                      }}
                    >
                      {getStatusLabel(payment.status)}
                    </span>
                  </td>
                  <td>
                    <div className="payments-actions">
                      <button
                        type="button"
                        className="payments-icon-button"
                        onClick={() => openEditModal(payment)}
                        aria-label="Edit payment"
                        title="Edit"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M3 21h6l12-12a2.1 2.1 0 0 0-3-3L6 18l-3 3z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="payments-icon-button payments-icon-button--danger"
                        onClick={() => handleDelete(payment)}
                        disabled={deletingIds.has(payment.id)}
                        aria-label="Delete payment"
                        title="Delete"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="payments-table-footer">
            <div className="payments-pagination-info">
              Showing {showingFrom} to {showingTo} of {pagination.count} entries
            </div>
            {totalPages > 1 && (
              <div className="payments-pagination">
                <button
                  className="payments-pagination__page"
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.page <= 1}
                  aria-label="First page"
                >
                  {"<<"}
                </button>
                <button
                  className="payments-pagination__page"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  aria-label="Previous page"
                >
                  {"<"}
                </button>
                {visiblePages.map((pageNumber) => (
                  <button
                    key={pageNumber}
                    className={
                      pageNumber === pagination.page
                        ? "payments-pagination__page payments-pagination__page--active"
                        : "payments-pagination__page"
                    }
                    onClick={() => handlePageChange(pageNumber)}
                    aria-label={`Page ${pageNumber}`}
                  >
                    {pageNumber}
                  </button>
                ))}
                <button
                  className="payments-pagination__page"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= totalPages}
                  aria-label="Next page"
                >
                  {">"}
                </button>
                <button
                  className="payments-pagination__page"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={pagination.page >= totalPages}
                  aria-label="Last page"
                >
                  {">>"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          className="payments-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payments-modal-title"
        >
          <div className="payments-modal__overlay" onClick={closeModal} />
          <div className="payments-modal__panel" ref={modalPanelRef}>
            <div className="payments-modal__header">
              <div>
                <h2 id="payments-modal-title">{editingPayment ? "Edit Payment" : "New Payment"}</h2>
                <p className="payments-subtitle">
                  {editingPayment ? "Update payment information." : "Create a new payment."}
                </p>
              </div>
              <button type="button" className="payments-button" onClick={closeModal}>
                Close
              </button>
            </div>

            <form className="payments-form" onSubmit={handleSubmit(onSubmit)}>
              <div className="payments-form-grid">
                <label className="payments-field">
                  <span>Tenant</span>
                  <select {...register("tenant_id")} className="payments-input">
                    <option value="">Select tenant</option>
                    {tenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.first_name} {tenant.last_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="payments-field">
                  <span>Invoice ID</span>
                  <input
                    type="text"
                    {...register("invoice_id")}
                    className="payments-input"
                    placeholder="Optional"
                  />
                </label>
              </div>

              <div className="payments-form-grid">
                <label className="payments-field">
                  <span>Amount *</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("amount", { required: "Amount is required." })}
                    className={
                      errors.amount ? "payments-input payments-input--error" : "payments-input"
                    }
                    ref={(node) => {
                      if (!editingPayment) {
                        modalFirstInputRef.current = node;
                      }
                    }}
                  />
                  {errors.amount && <span className="payments-error">{errors.amount.message}</span>}
                </label>

                <label className="payments-field">
                  <span>Payment Method</span>
                  <select {...register("payment_method")} className="payments-input">
                    <option value="">Select method</option>
                    {PAYMENT_METHOD_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="payments-form-grid">
                <label className="payments-field">
                  <span>Payment Date *</span>
                  <input
                    type="date"
                    {...register("payment_date", { required: "Payment date is required." })}
                    className={
                      errors.payment_date
                        ? "payments-input payments-input--error"
                        : "payments-input"
                    }
                  />
                  {errors.payment_date && (
                    <span className="payments-error">{errors.payment_date.message}</span>
                  )}
                </label>

                <label className="payments-field">
                  <span>Status</span>
                  <select {...register("status")} className="payments-input">
                    {STATUS_OPTIONS.filter((opt) => opt.value).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="payments-form-grid">
                <label className="payments-field">
                  <span>Reference Number</span>
                  <input type="text" {...register("reference_number")} className="payments-input" />
                </label>

                <label className="payments-field">
                  <span>Notes</span>
                  <textarea
                    {...register("notes")}
                    className="payments-input payments-textarea"
                    rows={3}
                  />
                </label>
              </div>

              {formError && <div className="payments-alert payments-alert--error">{formError}</div>}

              <div className="payments-form__actions">
                <button type="button" className="payments-button" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="payments-primary" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingPayment ? "Update Payment" : "Create Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
