import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFacility } from "@/contexts/FacilityContext";
import { usePermissions } from "@/hooks/usePermissions";
import { invoiceAPI } from "@/services/billing";
import "@/pages/billing/InvoiceListPage.css";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "past_due", label: "Past Due" },
  { value: "paid", label: "Paid" },
  { value: "void", label: "Void" }
];

const PAGE_SIZE = 10;

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

function getTenantName(invoice) {
  if (invoice.tenant_name) {
    return invoice.tenant_name;
  }
  if (invoice.tenant?.name) {
    return invoice.tenant.name;
  }
  return "—";
}

function getInvoiceTotal(invoice) {
  return invoice.total ?? invoice.amount_total ?? "—";
}

function getInvoiceStatus(invoice) {
  return invoice.status ?? invoice.state ?? "unknown";
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
    .replace(/\\s+/g, "_");
}

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const { selectedFacilityId } = useFacility();
  const { hasPermission } = usePermissions();

  const [statusFilter, setStatusFilter] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({
    count: 0,
    page: 1,
    pageSize: PAGE_SIZE,
    next: null,
    previous: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [pageSuccess, setPageSuccess] = useState(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paidOn: new Date().toISOString().slice(0, 10),
    note: ""
  });
  const modalPanelRef = useRef(null);

  const canView = hasPermission("billing.view_invoice") || hasPermission("billing.view_invoices");
  const canRecordPayment = hasPermission("billing.record_payment");
  const canVoid = hasPermission("billing.void_invoice");

  const totalPages = useMemo(() => {
    if (!pagination.count || !pagination.pageSize) {
      return 1;
    }
    return Math.max(1, Math.ceil(pagination.count / pagination.pageSize));
  }, [pagination.count, pagination.pageSize]);

  const visiblePages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const start = Math.max(1, Math.min(pagination.page - 2, totalPages - 4));
    return Array.from({ length: 5 }, (_, index) => start + index);
  }, [pagination.page, totalPages]);

  const showingFrom = pagination.count === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const showingTo =
    pagination.count === 0 ? 0 : Math.min(pagination.page * pagination.pageSize, pagination.count);

  const fetchInvoices = async ({ page = 1 } = {}) => {
    if (!selectedFacilityId || !canView) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    setPageSuccess(null);

    try {
      const response = await invoiceAPI.list(selectedFacilityId, {
        status: statusFilter || undefined,
        tenant_id: tenantFilter || undefined,
        date_from: startDate || undefined,
        date_to: endDate || undefined,
        page,
        page_size: PAGE_SIZE
      });

      setInvoices(response.results);
      setPagination({
        count: response.count,
        page: response.page,
        pageSize: response.pageSize || PAGE_SIZE,
        next: response.next,
        previous: response.previous
      });
    } catch {
      setLoadError("Unable to load invoices. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices({ page: 1 });
  }, [selectedFacilityId, statusFilter, tenantFilter, startDate, endDate, canView]);

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setActiveInvoice(null);
    setPaymentForm({
      amount: "",
      paidOn: new Date().toISOString().slice(0, 10),
      note: ""
    });
  };

  useEffect(() => {
    if (!isPaymentModalOpen) {
      return;
    }

    modalPanelRef.current?.focus();

    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePaymentModal();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [isPaymentModalOpen]);

  const openPaymentModal = (invoice) => {
    setActiveInvoice(invoice);
    setIsPaymentModalOpen(true);
  };

  const handlePageChange = (nextPage) => {
    const targetPage = Math.min(Math.max(1, nextPage), totalPages);
    fetchInvoices({ page: targetPage });
  };

  const handleView = (invoice) => {
    if (!selectedFacilityId) {
      return;
    }
    navigate(`/admin/facilities/${selectedFacilityId}/invoices/${invoice.id}`);
  };

  const handleVoid = async (invoice) => {
    if (!selectedFacilityId || !canVoid) {
      return;
    }

    if (!window.confirm(`Void invoice ${invoice.id}?`)) {
      return;
    }

    try {
      await invoiceAPI.voidInvoice(selectedFacilityId, invoice.id);
      setPageSuccess(`Invoice ${invoice.id} voided.`);
      await fetchInvoices({ page: pagination.page });
    } catch {
      setLoadError("Unable to void invoice. Please try again.");
    }
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();

    if (!selectedFacilityId || !activeInvoice) {
      return;
    }

    try {
      await invoiceAPI.recordPayment(selectedFacilityId, activeInvoice.id, {
        amount: paymentForm.amount,
        paid_on: paymentForm.paidOn,
        note: paymentForm.note
      });
      setPageSuccess(`Payment recorded for invoice ${activeInvoice.id}.`);
      closePaymentModal();
      await fetchInvoices({ page: pagination.page });
    } catch {
      setLoadError("Unable to record payment. Please try again.");
    }
  };

  if (!selectedFacilityId) {
    return (
      <div className="invoice-page">
        <div className="invoice-header">
          <div>
            <h1>Invoices</h1>
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
            <h1>Invoices</h1>
            <p className="invoice-subtitle">You do not have billing access.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="invoice-page">
      <div className="invoice-header">
        <div>
          <h1>Invoices</h1>
          <p className="invoice-subtitle">Track invoices, payments, and statuses.</p>
        </div>
      </div>

      <div className="invoice-filters">
        <label className="invoice-field">
          Status
          <select
            className="invoice-input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="invoice-field">
          Tenant search
          <input
            className="invoice-input"
            type="text"
            placeholder="Tenant name or ID"
            value={tenantFilter}
            onChange={(event) => setTenantFilter(event.target.value)}
          />
        </label>
        <label className="invoice-field">
          Issue date from
          <input
            className="invoice-input"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>
        <label className="invoice-field">
          Issue date to
          <input
            className="invoice-input"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>
      </div>

      {loadError && <div className="invoice-alert invoice-alert--error">{loadError}</div>}
      {pageSuccess && <div className="invoice-alert invoice-alert--success">{pageSuccess}</div>}

      <div className="invoice-table-wrapper">
        <table className="invoice-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tenant</th>
              <th>Issue Date</th>
              <th>Due Date</th>
              <th>Total</th>
              <th>Status</th>
              <th className="invoice-actions-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="invoice-empty">
                  Loading invoices...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="invoice-empty">
                  No invoices match the current filters.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.id}</td>
                  <td>{getTenantName(invoice)}</td>
                  <td>{formatDate(invoice.issue_date)}</td>
                  <td>{formatDate(invoice.due_date)}</td>
                  <td>{formatCurrency(getInvoiceTotal(invoice))}</td>
                  <td>
                    <span
                      className={`invoice-status invoice-status--${formatStatusClass(
                        getInvoiceStatus(invoice)
                      )}`}
                    >
                      {formatStatusLabel(getInvoiceStatus(invoice))}
                    </span>
                  </td>
                  <td>
                    <div className="invoice-actions">
                      <button
                        className="invoice-icon-button"
                        onClick={() => handleView(invoice)}
                        aria-label={`View invoice ${invoice.id}`}
                        title="View"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button
                        className="invoice-icon-button"
                        onClick={() => openPaymentModal(invoice)}
                        disabled={!canRecordPayment}
                        aria-label={`Record payment for invoice ${invoice.id}`}
                        title="Record payment"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <line x1="12" y1="1" x2="12" y2="23" />
                          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      </button>
                      {canVoid && (
                        <button
                          className="invoice-icon-button invoice-icon-button--danger"
                          onClick={() => handleVoid(invoice)}
                          aria-label={`Void invoice ${invoice.id}`}
                          title="Void"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="invoice-pagination">
          <span>
            Showing {showingFrom} to {showingTo} of {pagination.count} entries
          </span>
          <div className="invoice-pagination__controls">
            <button
              className="invoice-pagination__page"
              onClick={() => handlePageChange(1)}
              disabled={pagination.page <= 1}
              aria-label="First page"
            >
              {"<<"}
            </button>
            <button
              className="invoice-pagination__page"
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
                    ? "invoice-pagination__page invoice-pagination__page--active"
                    : "invoice-pagination__page"
                }
                onClick={() => handlePageChange(pageNumber)}
                aria-label={`Page ${pageNumber}`}
              >
                {pageNumber}
              </button>
            ))}
            <button
              className="invoice-pagination__page"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages && !pagination.next}
              aria-label="Next page"
            >
              {">"}
            </button>
            <button
              className="invoice-pagination__page"
              onClick={() => handlePageChange(totalPages)}
              disabled={pagination.page >= totalPages && !pagination.next}
              aria-label="Last page"
            >
              {">>"}
            </button>
          </div>
        </div>
      </div>

      {isPaymentModalOpen && (
        <div className="invoice-modal" role="dialog" aria-modal="true">
          <div className="invoice-modal__overlay" onClick={closePaymentModal} />
          <div className="invoice-modal__panel" ref={modalPanelRef} tabIndex={-1}>
            <div className="invoice-modal__header">
              <div>
                <h2>Record Payment</h2>
                <p className="invoice-subtitle">
                  Invoice {activeInvoice?.id} for {getTenantName(activeInvoice || {})}
                </p>
              </div>
              <button className="invoice-button" onClick={closePaymentModal}>
                Close
              </button>
            </div>
            <form className="invoice-form" onSubmit={handlePaymentSubmit}>
              <label className="invoice-field">
                Amount
                <input
                  className="invoice-input"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="invoice-field">
                Paid on
                <input
                  className="invoice-input"
                  type="date"
                  value={paymentForm.paidOn}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({ ...prev, paidOn: event.target.value }))
                  }
                  required
                />
              </label>
              <label className="invoice-field">
                Note
                <textarea
                  className="invoice-input invoice-textarea"
                  value={paymentForm.note}
                  onChange={(event) =>
                    setPaymentForm((prev) => ({ ...prev, note: event.target.value }))
                  }
                  rows={3}
                />
              </label>
              <div className="invoice-actions">
                <button className="invoice-button" type="button" onClick={closePaymentModal}>
                  Cancel
                </button>
                <button className="invoice-button invoice-button--primary" type="submit">
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

