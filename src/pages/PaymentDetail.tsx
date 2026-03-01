import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { paymentsApi } from "@/api/payments";
import type { Payment } from "@/api/payments";
import { tenantsApi } from "@/api/tenants";
import type { Tenant } from "@/api/tenants";
import "@/pages/PaymentDetail.css";

const STATUS_OPTIONS = [
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
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
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

export default function PaymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [payment, setPayment] = useState<Payment | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const modalPanelRef = useRef<HTMLDivElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty }
  } = useForm<PaymentFormValues>();

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!id) {
        setLoadError("Payment ID is required.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const [paymentData, tenantList] = await Promise.all([
          paymentsApi.get(parseInt(id, 10)),
          tenantsApi.list()
        ]);

        if (!isMounted) return;

        setPayment(paymentData);
        setTenants(tenantList);

        reset({
          tenant_id: paymentData.tenant?.toString() ?? "",
          invoice_id: paymentData.invoice?.toString() ?? "",
          amount: paymentData.amount,
          payment_method: paymentData.payment_method ?? "",
          payment_date: paymentData.payment_date ?? new Date().toISOString().slice(0, 10),
          reference_number: paymentData.reference_number ?? "",
          notes: paymentData.notes ?? "",
          status: paymentData.status ?? "pending"
        });
      } catch (error) {
        if (!isMounted) return;

        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setLoadError("Payment not found.");
        } else {
          setLoadError("Unable to load payment details. Please try again.");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, reset]);

  useEffect(() => {
    if (!showDeleteConfirm) return;

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowDeleteConfirm(false);
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [showDeleteConfirm]);

  const onSubmit = async (values: PaymentFormValues) => {
    if (!payment) return;

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
      await paymentsApi.update(payment.id, payload);
      const updatedPayment = await paymentsApi.get(payment.id);
      setPayment(updatedPayment);
      reset(values);
      setPageSuccess("Payment updated successfully.");
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

  const handleDelete = async () => {
    if (!payment) return;

    setIsDeleting(true);
    setFormError(null);

    try {
      await paymentsApi.delete(payment.id);
      navigate("/payments");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        navigate("/payments");
        return;
      }
      setFormError("Unable to delete payment. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleBack = () => {
    navigate("/payments");
  };

  if (isLoading) {
    return (
      <main className="payment-detail-page">
        <div className="payment-detail-loading">Loading payment details...</div>
      </main>
    );
  }

  if (loadError && !payment) {
    return (
      <main className="payment-detail-page">
        <div className="payment-detail-error-state">
          <p>{loadError}</p>
          <button type="button" className="payment-detail-button" onClick={handleBack}>
            Back to Payments
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="payment-detail-page">
      <header className="payment-detail-header">
        <div className="payment-detail-header__left">
          <button type="button" className="payment-detail-back" onClick={handleBack}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
          <div>
            <h1>Payment #{payment?.id}</h1>
            <div className="payment-detail-meta">
              <span
                className="payment-detail-status"
                style={{
                  backgroundColor: `${getStatusColor(payment?.status ?? null)}15`,
                  color: getStatusColor(payment?.status ?? null)
                }}
              >
                {getStatusLabel(payment?.status ?? null)}
              </span>
              <span className="payment-detail-amount">{formatCurrency(payment?.amount ?? null)}</span>
            </div>
          </div>
        </div>
      </header>

      {pageSuccess && (
        <div className="payment-detail-alert payment-detail-alert--success">{pageSuccess}</div>
      )}
      {formError && (
        <div className="payment-detail-alert payment-detail-alert--error">{formError}</div>
      )}

      <div className="payment-detail-content">
        <form className="payment-detail-form" onSubmit={handleSubmit(onSubmit)}>
          <section className="payment-detail-section">
            <h2>Payment Information</h2>
            <div className="payment-detail-grid">
              <label className="payment-detail-field">
                <span>Amount *</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("amount", { required: "Amount is required." })}
                  className={
                    errors.amount
                      ? "payment-detail-input payment-detail-input--error"
                      : "payment-detail-input"
                  }
                />
                {errors.amount && (
                  <span className="payment-detail-error">{errors.amount.message}</span>
                )}
              </label>

              <label className="payment-detail-field">
                <span>Payment Method</span>
                <select {...register("payment_method")} className="payment-detail-input">
                  <option value="">Select method</option>
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="payment-detail-field">
                <span>Payment Date *</span>
                <input
                  type="date"
                  {...register("payment_date", { required: "Payment date is required." })}
                  className={
                    errors.payment_date
                      ? "payment-detail-input payment-detail-input--error"
                      : "payment-detail-input"
                  }
                />
                {errors.payment_date && (
                  <span className="payment-detail-error">{errors.payment_date.message}</span>
                )}
              </label>

              <label className="payment-detail-field">
                <span>Status</span>
                <select {...register("status")} className="payment-detail-input">
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="payment-detail-section">
            <h2>Related Records</h2>
            <div className="payment-detail-grid">
              <label className="payment-detail-field">
                <span>Tenant</span>
                <select {...register("tenant_id")} className="payment-detail-input">
                  <option value="">Select tenant</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.first_name} {tenant.last_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="payment-detail-field">
                <span>Invoice ID</span>
                <input
                  type="text"
                  {...register("invoice_id")}
                  className="payment-detail-input"
                  placeholder="Optional"
                />
              </label>
            </div>
          </section>

          <section className="payment-detail-section">
            <h2>Additional Information</h2>
            <div className="payment-detail-grid">
              <label className="payment-detail-field">
                <span>Reference Number</span>
                <input
                  type="text"
                  {...register("reference_number")}
                  className="payment-detail-input"
                />
              </label>

              <label className="payment-detail-field">
                <span>Notes</span>
                <textarea
                  {...register("notes")}
                  className="payment-detail-input payment-detail-textarea"
                  rows={3}
                />
              </label>
            </div>
          </section>

          <section className="payment-detail-section payment-detail-section--meta">
            <h2>Metadata</h2>
            <div className="payment-detail-meta-grid">
              <div className="payment-detail-meta-item">
                <span className="payment-detail-meta-label">Created</span>
                <span className="payment-detail-meta-value">
                  {formatDate(payment?.created_at ?? null)}
                </span>
              </div>
              <div className="payment-detail-meta-item">
                <span className="payment-detail-meta-label">Tenant</span>
                <span className="payment-detail-meta-value">
                  {payment?.tenant_name || "-"}
                </span>
              </div>
              <div className="payment-detail-meta-item">
                <span className="payment-detail-meta-label">Invoice</span>
                <span className="payment-detail-meta-value">
                  {payment?.invoice_number || payment?.invoice || "-"}
                </span>
              </div>
              <div className="payment-detail-meta-item">
                <span className="payment-detail-meta-label">Payment Method</span>
                <span className="payment-detail-meta-value">
                  {getPaymentMethodLabel(payment?.payment_method ?? null)}
                </span>
              </div>
            </div>
          </section>

          <div className="payment-detail-actions">
            <button
              type="button"
              className="payment-detail-button payment-detail-button--danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Payment
            </button>
            <div className="payment-detail-actions__right">
              <button type="button" className="payment-detail-button" onClick={handleBack}>
                Cancel
              </button>
              <button
                type="submit"
                className="payment-detail-primary"
                disabled={isSaving || !isDirty}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {showDeleteConfirm && (
        <div className="payment-detail-modal" role="dialog" aria-modal="true">
          <div
            className="payment-detail-modal__overlay"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="payment-detail-modal__panel" ref={modalPanelRef}>
            <h2>Delete Payment</h2>
            <p>
              Are you sure you want to delete payment <strong>#{payment?.id}</strong>? This action
              cannot be undone.
            </p>
            <div className="payment-detail-modal__actions">
              <button
                type="button"
                className="payment-detail-button"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="payment-detail-button payment-detail-button--danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}