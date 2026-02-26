import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useFacility } from "@/contexts/FacilityContext";
import { usePermissions } from "@/hooks/usePermissions";
import { invoiceAPI, paymentAPI } from "@/services/billing";
import "@/pages/billing/InvoiceListPage.css";
import "@/pages/billing/InvoiceDetailPage.css";

const PAYMENT_METHODS = [
  { value: "card", label: "Card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "check", label: "Check" },
  { value: "other", label: "Other" }
];

function formatDate(value) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatCurrency(value) {
  const numberValue = typeof value === "string" ? Number(value) : value;
  if (numberValue == null || Number.isNaN(numberValue)) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(numberValue);
}

function getInvoiceStatus(invoice) {
  return invoice?.status ?? invoice?.state ?? "unknown";
}

function formatStatusLabel(status) {
  if (!status) {
    return "Unknown";
  }
  return String(status).replace(/_/g, " ");
}

function formatStatusClass(status) {
  return String(status || "unknown")
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function getInvoiceNumber(invoice, fallbackId) {
  return invoice?.number ?? invoice?.invoice_number ?? invoice?.id ?? fallbackId ?? "—";
}

function getInvoiceTotal(invoice) {
  return (
    invoice?.total ??
    invoice?.amount_total ??
    invoice?.total_amount ??
    invoice?.amount ??
    "—"
  );
}

function getInvoiceAmountDue(invoice) {
  return (
    invoice?.total_due ??
    invoice?.amount_due ??
    invoice?.balance_due ??
    invoice?.amount_remaining ??
    invoice?.amount_outstanding ??
    getInvoiceTotal(invoice)
  );
}

function getTenantName(invoice) {
  if (invoice?.tenant_name) {
    return invoice.tenant_name;
  }
  if (invoice?.tenant?.name) {
    return invoice.tenant.name;
  }
  return "—";
}

function normalizeInvoiceItems(invoice) {
  const rawItems =
    invoice?.items ??
    invoice?.line_items ??
    invoice?.lines ??
    invoice?.lineItems ??
    invoice?.invoice_items;

  if (Array.isArray(rawItems)) {
    return rawItems;
  }

  if (rawItems && typeof rawItems === "object" && Array.isArray(rawItems.results)) {
    return rawItems.results;
  }

  return [];
}

function normalizeNumber(value, fallback = 0) {
  if (value == null) {
    return fallback;
  }
  const numeric = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(numeric)) {
    return fallback;
  }
  return numeric;
}

export default function InvoiceDetailPage() {
  const {
    facility_id: facilityParam,
    facilityId: facilityParamAlt,
    invoice_id: invoiceParam,
    invoiceId: invoiceParamAlt
  } = useParams();
  const { selectedFacilityId } = useFacility();
  const { hasPermission } = usePermissions();

  const facilityId = facilityParam ?? facilityParamAlt ?? selectedFacilityId;
  const invoiceId = invoiceParam ?? invoiceParamAlt;

  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [pageSuccess, setPageSuccess] = useState(null);

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: PAYMENT_METHODS[0].value,
    transactionId: ""
  });

  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const modalPanelRef = useRef(null);

  const canView = hasPermission("billing.view_invoice") || hasPermission("billing.view_invoices");
  const canRecordPayment = hasPermission("billing.record_payment");
  const canVoid = hasPermission("billing.void_invoice");

  const invoiceStatus = getInvoiceStatus(invoice);
  const isVoid = String(invoiceStatus).toLowerCase() === "void";

  const normalizedItems = useMemo(() => {
    const items = normalizeInvoiceItems(invoice);
    return items.map((item, index) => {
      const quantity =
        item?.quantity ?? item?.qty ?? item?.count ?? item?.units ?? item?.unit_count ?? 1;
      const unitPrice =
        item?.unit_price ?? item?.unitPrice ?? item?.price ?? item?.amount ?? item?.unit_amount ?? 0;
      const lineTotal =
        item?.total ??
        item?.line_total ??
        item?.total_amount ??
        normalizeNumber(quantity, 1) * normalizeNumber(unitPrice, 0);

      return {
        id: item?.id ?? `${index}`,
        description: item?.description ?? item?.name ?? item?.title ?? `Line item ${index + 1}`,
        quantity,
        unitPrice,
        total: lineTotal
      };
    });
  }, [invoice]);

  const fetchInvoice = async () => {
    if (!facilityId || !invoiceId || !canView) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await invoiceAPI.get(facilityId, invoiceId);
      setInvoice(response);
    } catch {
      setLoadError("Unable to load invoice details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [facilityId, invoiceId, canView]);

  useEffect(() => {
    if (!invoice) {
      return;
    }

    if (!paymentForm.amount) {
      const amountDue = getInvoiceAmountDue(invoice);
      if (amountDue != null && amountDue !== "—") {
        setPaymentForm((prev) => ({
          ...prev,
          amount: String(amountDue)
        }));
      }
    }
  }, [invoice, paymentForm.amount]);

  useEffect(() => {
    if (!isVoidModalOpen) {
      return;
    }

    modalPanelRef.current?.focus();

    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsVoidModalOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [isVoidModalOpen]);

  const handlePaymentChange = (field) => (event) => {
    setPaymentForm((prev) => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();

    if (!facilityId || !invoiceId || !canRecordPayment) {
      return;
    }

    setLoadError(null);
    setPageSuccess(null);

    const numericAmount = normalizeNumber(paymentForm.amount, null);

    try {
      await paymentAPI.create(facilityId, {
        invoice_id: invoiceId,
        amount: numericAmount ?? paymentForm.amount,
        method: paymentForm.method,
        transaction_id: paymentForm.transactionId || undefined
      });
      setPageSuccess(`Payment recorded for invoice ${invoiceId}.`);
      setPaymentForm({
        amount: "",
        method: PAYMENT_METHODS[0].value,
        transactionId: ""
      });
      await fetchInvoice();
    } catch {
      setLoadError("Unable to record payment. Please try again.");
    }
  };

  const openVoidModal = () => {
    setVoidReason("");
    setIsVoidModalOpen(true);
  };

  const closeVoidModal = () => {
    setIsVoidModalOpen(false);
  };

  const handleVoidSubmit = async (event) => {
    event.preventDefault();

    if (!facilityId || !invoiceId || !canVoid) {
      return;
    }

    setLoadError(null);
    setPageSuccess(null);

    try {
      await invoiceAPI.voidInvoice(facilityId, invoiceId, {
        reason: voidReason
      });
      setPageSuccess(`Invoice ${invoiceId} voided.`);
      closeVoidModal();
      await fetchInvoice();
    } catch {
      setLoadError("Unable to void invoice. Please try again.");
    }
  };

  if (!facilityId) {
    return (
      <div className="invoice-page">
        <div className="invoice-header">
          <div>
            <h1>Invoice Details</h1>
            <p className="invoice-subtitle">Select a facility to view invoices.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="invoice-page">
        <div className="invoice-header">
          <div>
            <h1>Invoice Details</h1>
            <p className="invoice-subtitle">You do not have billing access.</p>
          </div>
        </div>
      </div>
    );
  }

  const invoiceNumber = getInvoiceNumber(invoice, invoiceId);
  const pdfHref = invoiceId
    ? `/api/facilities/${facilityId}/invoices/${invoiceId}/pdf/`
    : "#";

  return (
    <div className="invoice-page">
      <div className="invoice-header">
        <div>
          <h1>Invoice {invoiceNumber}</h1>
          <p className="invoice-subtitle">{getTenantName(invoice)}</p>
          <div className="invoice-header-meta">
            <span>Issued {formatDate(invoice?.issue_date)}</span>
            <span>Due {formatDate(invoice?.due_date)}</span>
            <span
              className={`invoice-status invoice-status--${formatStatusClass(invoiceStatus)}`}
            >
              {formatStatusLabel(invoiceStatus)}
            </span>
            <span>Total {formatCurrency(getInvoiceTotal(invoice))}</span>
          </div>
        </div>
        <div className="invoice-actions">
          <a
            className="invoice-button invoice-button--primary"
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
          >
            Download PDF
          </a>
          {canVoid && !isVoid && (
            <button className="invoice-button invoice-button--danger" onClick={openVoidModal}>
              Void Invoice
            </button>
          )}
        </div>
      </div>

      {loadError && <div className="invoice-alert invoice-alert--error">{loadError}</div>}
      {pageSuccess && <div className="invoice-alert invoice-alert--success">{pageSuccess}</div>}

      {isLoading ? (
        <div className="invoice-empty">Loading invoice...</div>
      ) : (
        <>
          <section className="invoice-detail-grid">
            <div className="invoice-card">
              <h2>Summary</h2>
              <div className="invoice-detail-list">
                <div className="invoice-detail-row">
                  <span className="invoice-detail-label">Invoice #</span>
                  <span className="invoice-detail-value">{invoiceNumber}</span>
                </div>
                <div className="invoice-detail-row">
                  <span className="invoice-detail-label">Status</span>
                  <span
                    className={`invoice-status invoice-status--${formatStatusClass(
                      invoiceStatus
                    )}`}
                  >
                    {formatStatusLabel(invoiceStatus)}
                  </span>
                </div>
                <div className="invoice-detail-row">
                  <span className="invoice-detail-label">Issue date</span>
                  <span className="invoice-detail-value">{formatDate(invoice?.issue_date)}</span>
                </div>
                <div className="invoice-detail-row">
                  <span className="invoice-detail-label">Due date</span>
                  <span className="invoice-detail-value">{formatDate(invoice?.due_date)}</span>
                </div>
              </div>
            </div>
            <div className="invoice-card invoice-card--highlight">
              <h2>Amount</h2>
              <div className="invoice-detail-list">
                <div className="invoice-detail-row">
                  <span className="invoice-detail-label">Total</span>
                  <span className="invoice-detail-value">
                    {formatCurrency(getInvoiceTotal(invoice))}
                  </span>
                </div>
                <div className="invoice-detail-row">
                  <span className="invoice-detail-label">Amount due</span>
                  <span className="invoice-detail-value">
                    {formatCurrency(getInvoiceAmountDue(invoice))}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="invoice-section">
            <div className="invoice-section__header">
              <h2>Itemized charges</h2>
              <div className="invoice-inline-meta">
                <span>Items: {normalizedItems.length}</span>
              </div>
            </div>
            <div className="invoice-table-wrapper">
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="invoice-empty">
                        No line items available.
                      </td>
                    </tr>
                  ) : (
                    normalizedItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.description}</td>
                        <td>{item.quantity ?? "—"}</td>
                        <td>{formatCurrency(item.unitPrice)}</td>
                        <td>{formatCurrency(item.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="invoice-section">
            <div className="invoice-section__header">
              <h2>Record payment</h2>
              {!canRecordPayment && (
                <span className="invoice-subtitle">You do not have payment access.</span>
              )}
            </div>
            {canRecordPayment && (
              <form className="invoice-form" onSubmit={handlePaymentSubmit}>
                <div className="invoice-form-grid">
                  <label className="invoice-field">
                    Amount
                    <input
                      className="invoice-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={handlePaymentChange("amount")}
                      required
                    />
                  </label>
                  <label className="invoice-field">
                    Method
                    <select
                      className="invoice-input"
                      value={paymentForm.method}
                      onChange={handlePaymentChange("method")}
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="invoice-field">
                    Transaction ID
                    <input
                      className="invoice-input"
                      type="text"
                      value={paymentForm.transactionId}
                      onChange={handlePaymentChange("transactionId")}
                      placeholder="Optional"
                    />
                  </label>
                </div>
                <div className="invoice-actions invoice-actions--left">
                  <button
                    className="invoice-button invoice-button--primary"
                    type="submit"
                    disabled={isVoid}
                  >
                    Record payment
                  </button>
                </div>
              </form>
            )}
          </section>
        </>
      )}

      {isVoidModalOpen && (
        <div className="invoice-modal" role="dialog" aria-modal="true">
          <div className="invoice-modal__overlay" onClick={closeVoidModal} />
          <div className="invoice-modal__panel" ref={modalPanelRef} tabIndex={-1}>
            <div className="invoice-modal__header">
              <div>
                <h2>Void invoice {invoiceNumber}</h2>
                <p className="invoice-subtitle">Provide a reason for voiding this invoice.</p>
              </div>
              <button className="invoice-button" onClick={closeVoidModal}>
                Close
              </button>
            </div>
            <form className="invoice-form" onSubmit={handleVoidSubmit}>
              <label className="invoice-field">
                Reason
                <textarea
                  className="invoice-input invoice-textarea"
                  rows={4}
                  value={voidReason}
                  onChange={(event) => setVoidReason(event.target.value)}
                  required
                />
              </label>
              <div className="invoice-actions">
                <button className="invoice-button" type="button" onClick={closeVoidModal}>
                  Cancel
                </button>
                <button className="invoice-button invoice-button--danger" type="submit">
                  Void invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
