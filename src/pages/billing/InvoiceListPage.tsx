import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useFacility } from "@/contexts/FacilityContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  invoiceAPI,
  type Invoice,
  type InvoiceStatus,
  type InvoiceCreatePayload,
  type PaymentMethod
} from "@/services/billing";
import "@/pages/billing/InvoiceListPage.css";

const STATUS_OPTIONS: { value: InvoiceStatus | ""; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "ISSUED", label: "Issued" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "VOID", label: "Void" }
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "CASH", label: "Cash" },
  { value: "CARD", label: "Card" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "OTHER", label: "Other" }
];

const PAGE_SIZE = 10;

function formatDate(value: string | undefined | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatCurrency(value: string | number | undefined | null): string {
  const num = typeof value === "string" ? Number(value) : value;
  if (num == null || Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(num);
}

function getTenantName(invoice: Invoice): string {
  if (invoice.tenant_name) return invoice.tenant_name;
  if (typeof invoice.tenant === "object" && invoice.tenant?.name) return invoice.tenant.name;
  return "—";
}

type InvoiceFormValues = {
  contract: string;
  tenant: string;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
};

type ItemFormValues = {
  description: string;
  quantity: string;
  unit_price: string;
};

type PaymentFormValues = {
  invoice: string;
  amount: string;
  method: PaymentMethod;
  transaction_id: string;
};

const DEFAULT_INVOICE_FORM: InvoiceFormValues = {
  contract: "",
  tenant: "",
  issue_date: new Date().toISOString().slice(0, 10),
  due_date: "",
  status: "DRAFT"
};

const DEFAULT_ITEM_FORM: ItemFormValues = {
  description: "",
  quantity: "1",
  unit_price: ""
};

const DEFAULT_PAYMENT_FORM: PaymentFormValues = {
  invoice: "",
  amount: "",
  method: "CASH",
  transaction_id: ""
};

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const { selectedFacilityId } = useFacility();
  const { hasPermission } = usePermissions();

  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "">("");
  const [tenantFilter, setTenantFilter] = useState("");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pagination, setPagination] = useState({
    count: 0,
    page: 1,
    next: null as string | null,
    previous: null as string | null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState<ItemFormValues[]>([]);
  const modalPanelRef = useRef<HTMLDivElement | null>(null);

  const canView = hasPermission("billing.view_invoice");
  const canCreate = hasPermission("billing.add_invoice");
  const canChange = hasPermission("billing.change_invoice");
  const canDelete = hasPermission("billing.delete_invoice");
  const canRecordPayment = hasPermission("billing.record_payment");

  const {
    register: registerInvoice,
    handleSubmit: handleSubmitInvoice,
    reset: resetInvoiceForm,
    formState: { errors: invoiceErrors }
  } = useForm<InvoiceFormValues>({ defaultValues: DEFAULT_INVOICE_FORM });

  const {
    register: registerItem,
    handleSubmit: handleSubmitItem,
    reset: resetItemForm,
    formState: { errors: itemErrors }
  } = useForm<ItemFormValues>({ defaultValues: DEFAULT_ITEM_FORM });

  const {
    register: registerPayment,
    handleSubmit: handleSubmitPayment,
    reset: resetPaymentForm,
    formState: { errors: paymentErrors }
  } = useForm<PaymentFormValues>({ defaultValues: DEFAULT_PAYMENT_FORM });

  const totalPages = useMemo(() => {
    if (!pagination.count) return 1;
    return Math.max(1, Math.ceil(pagination.count / PAGE_SIZE));
  }, [pagination.count]);

  const fetchInvoices = useCallback(
    async (page = 1) => {
      if (!selectedFacilityId || !canView) return;

      setIsLoading(true);
      setLoadError(null);
      setPageSuccess(null);

      try {
        const response = await invoiceAPI.list(selectedFacilityId, {
          status: statusFilter || undefined,
          tenant_id: tenantFilter || undefined,
          page,
          page_size: PAGE_SIZE
        });

        setInvoices(response.results);
        setPagination({
          count: response.count,
          page,
          next: response.next,
          previous: response.previous
        });
      } catch {
        setLoadError("Unable to load invoices. Please try again.");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedFacilityId, statusFilter, tenantFilter, canView]
  );

  useEffect(() => {
    fetchInvoices(1);
  }, [fetchInvoices]);

  useEffect(() => {
    if (!isCreateModalOpen && !isDeleteModalOpen && !isPaymentModalOpen) return;

    modalPanelRef.current?.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCreateModal();
        closeDeleteModal();
        closePaymentModal();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [isCreateModalOpen, isDeleteModalOpen, isPaymentModalOpen]);

  const openCreateModal = () => {
    resetInvoiceForm(DEFAULT_INVOICE_FORM);
    setItems([]);
    setLoadError(null);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    resetInvoiceForm(DEFAULT_INVOICE_FORM);
    setItems([]);
  };

  const openDeleteModal = (invoice: Invoice) => {
    setActiveInvoice(invoice);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setActiveInvoice(null);
  };

  const openPaymentModal = (invoice: Invoice) => {
    setActiveInvoice(invoice);
    resetPaymentForm({
      ...DEFAULT_PAYMENT_FORM,
      invoice: String(invoice.id),
      amount: invoice.total_amount
    });
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setActiveInvoice(null);
    resetPaymentForm(DEFAULT_PAYMENT_FORM);
  };

  const handleAddItem = (data: ItemFormValues) => {
    setItems((prev) => [...prev, data]);
    resetItemForm(DEFAULT_ITEM_FORM);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const onCreateSubmit = async (data: InvoiceFormValues) => {
    if (!selectedFacilityId || !canCreate || items.length === 0) return;

    setIsSaving(true);
    setLoadError(null);

    const payload: InvoiceCreatePayload = {
      contract: Number(data.contract),
      tenant: Number(data.tenant),
      issue_date: data.issue_date,
      due_date: data.due_date,
      status: data.status,
      items: items.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: item.unit_price
      }))
    };

    try {
      await invoiceAPI.create(selectedFacilityId, payload);
      setPageSuccess("Invoice created successfully.");
      closeCreateModal();
      await fetchInvoices(pagination.page);
    } catch {
      setLoadError("Unable to create invoice. Please check the form and try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const onDeleteConfirm = async () => {
    if (!selectedFacilityId || !activeInvoice || !canDelete) return;

    setIsSaving(true);
    setLoadError(null);

    try {
      await invoiceAPI.delete(selectedFacilityId, activeInvoice.id);
      setPageSuccess(`Invoice ${activeInvoice.id} deleted.`);
      closeDeleteModal();
      await fetchInvoices(pagination.page);
    } catch {
      setLoadError("Unable to delete invoice. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const onPaymentSubmit = async (data: PaymentFormValues) => {
    if (!selectedFacilityId || !canRecordPayment) return;

    setIsSaving(true);
    setLoadError(null);

    try {
      await invoiceAPI.recordPayment(selectedFacilityId, {
        invoice: Number(data.invoice),
        amount: data.amount,
        method: data.method,
        transaction_id: data.transaction_id || undefined
      });
      setPageSuccess("Payment recorded successfully.");
      closePaymentModal();
      await fetchInvoices(pagination.page);
    } catch {
      setLoadError("Unable to record payment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleView = (invoice: Invoice) => {
    if (!selectedFacilityId) return;
    navigate(`/invoices/${invoice.id}`);
  };

  const handlePageChange = (newPage: number) => {
    const targetPage = Math.min(Math.max(1, newPage), totalPages);
    fetchInvoices(targetPage);
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
            <p className="invoice-subtitle">You do not have permission to view invoices.</p>
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
          <p className="invoice-subtitle">Manage invoices, payments, and billing.</p>
        </div>
        {canCreate && (
          <button className="invoice-button invoice-button--primary" onClick={openCreateModal}>
            Create Invoice
          </button>
        )}
      </div>

      <div className="invoice-filters">
        <label className="invoice-field">
          Status
          <select
            className="invoice-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | "")}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="invoice-field">
          Tenant ID
          <input
            className="invoice-input"
            type="text"
            placeholder="Filter by tenant ID"
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
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
                  No invoices found.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>{invoice.id}</td>
                  <td>{getTenantName(invoice)}</td>
                  <td>{formatDate(invoice.issue_date)}</td>
                  <td>{formatDate(invoice.due_date)}</td>
                  <td>{formatCurrency(invoice.total_amount)}</td>
                  <td>
                    <span className={`invoice-status invoice-status--${invoice.status.toLowerCase()}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td>
                    <div className="invoice-actions">
                      <button className="invoice-button" onClick={() => handleView(invoice)}>
                        View
                      </button>
                      {canRecordPayment && invoice.status !== "PAID" && invoice.status !== "VOID" && (
                        <button className="invoice-button" onClick={() => openPaymentModal(invoice)}>
                          Record Payment
                        </button>
                      )}
                      {canDelete && invoice.status === "DRAFT" && (
                        <button
                          className="invoice-button invoice-button--danger"
                          onClick={() => openDeleteModal(invoice)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="invoice-pagination">
        <span>
          Page {pagination.page} of {totalPages} ({pagination.count} total)
        </span>
        <div className="invoice-pagination__controls">
          <button
            className="invoice-button"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            Previous
          </button>
          <button
            className="invoice-button"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>

      {isCreateModalOpen && (
        <div className="invoice-modal" role="dialog" aria-modal="true">
          <div className="invoice-modal__overlay" onClick={closeCreateModal} />
          <div className="invoice-modal__panel" ref={modalPanelRef} tabIndex={-1}>
            <div className="invoice-modal__header">
              <div>
                <h2>Create Invoice</h2>
                <p className="invoice-subtitle">Fill in the invoice details and add items.</p>
              </div>
              <button className="invoice-button" onClick={closeCreateModal}>
                Close
              </button>
            </div>

            <form className="invoice-form" onSubmit={handleSubmitInvoice(onCreateSubmit)}>
              <div className="invoice-form-grid">
                <label className="invoice-field">
                  Contract ID *
                  <input
                    type="number"
                    className={`invoice-input ${invoiceErrors.contract ? "invoice-input--error" : ""}`}
                    {...registerInvoice("contract", { required: "Contract is required" })}
                  />
                  {invoiceErrors.contract && (
                    <span className="invoice-error">{invoiceErrors.contract.message}</span>
                  )}
                </label>

                <label className="invoice-field">
                  Tenant ID *
                  <input
                    type="number"
                    className={`invoice-input ${invoiceErrors.tenant ? "invoice-input--error" : ""}`}
                    {...registerInvoice("tenant", { required: "Tenant is required" })}
                  />
                  {invoiceErrors.tenant && (
                    <span className="invoice-error">{invoiceErrors.tenant.message}</span>
                  )}
                </label>

                <label className="invoice-field">
                  Issue Date *
                  <input
                    type="date"
                    className={`invoice-input ${invoiceErrors.issue_date ? "invoice-input--error" : ""}`}
                    {...registerInvoice("issue_date", { required: "Issue date is required" })}
                  />
                  {invoiceErrors.issue_date && (
                    <span className="invoice-error">{invoiceErrors.issue_date.message}</span>
                  )}
                </label>

                <label className="invoice-field">
                  Due Date *
                  <input
                    type="date"
                    className={`invoice-input ${invoiceErrors.due_date ? "invoice-input--error" : ""}`}
                    {...registerInvoice("due_date", { required: "Due date is required" })}
                  />
                  {invoiceErrors.due_date && (
                    <span className="invoice-error">{invoiceErrors.due_date.message}</span>
                  )}
                </label>

                <label className="invoice-field">
                  Status
                  <select className="invoice-input" {...registerInvoice("status")}>
                    <option value="DRAFT">Draft</option>
                    <option value="ISSUED">Issued</option>
                  </select>
                </label>
              </div>

              <div className="invoice-section">
                <h3>Items</h3>
                {items.length > 0 && (
                  <table className="invoice-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.description}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.unit_price)}</td>
                          <td>{formatCurrency(Number(item.quantity) * Number(item.unit_price))}</td>
                          <td>
                            <button
                              type="button"
                              className="invoice-button invoice-button--danger"
                              onClick={() => handleRemoveItem(index)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div className="invoice-item-form">
                  <input
                    type="text"
                    placeholder="Description"
                    className={`invoice-input ${itemErrors.description ? "invoice-input--error" : ""}`}
                    {...registerItem("description", { required: "Description is required" })}
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    min="1"
                    step="1"
                    className={`invoice-input ${itemErrors.quantity ? "invoice-input--error" : ""}`}
                    {...registerItem("quantity", { required: "Quantity is required", min: 1 })}
                  />
                  <input
                    type="number"
                    placeholder="Unit Price"
                    min="0"
                    step="0.01"
                    className={`invoice-input ${itemErrors.unit_price ? "invoice-input--error" : ""}`}
                    {...registerItem("unit_price", { required: "Unit price is required" })}
                  />
                  <button
                    type="button"
                    className="invoice-button"
                    onClick={handleSubmitItem(handleAddItem)}
                  >
                    Add Item
                  </button>
                </div>
              </div>

              <div className="invoice-actions">
                <button type="button" className="invoice-button" onClick={closeCreateModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="invoice-button invoice-button--primary"
                  disabled={isSaving || items.length === 0}
                >
                  {isSaving ? "Creating..." : "Create Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDeleteModalOpen && activeInvoice && (
        <div className="invoice-modal" role="dialog" aria-modal="true">
          <div className="invoice-modal__overlay" onClick={closeDeleteModal} />
          <div className="invoice-modal__panel" ref={modalPanelRef} tabIndex={-1}>
            <div className="invoice-modal__header">
              <div>
                <h2>Delete Invoice</h2>
                <p className="invoice-subtitle">
                  Are you sure you want to delete invoice #{activeInvoice.id}?
                </p>
              </div>
              <button className="invoice-button" onClick={closeDeleteModal}>
                Close
              </button>
            </div>
            <div className="invoice-actions">
              <button className="invoice-button" onClick={closeDeleteModal}>
                Cancel
              </button>
              <button
                className="invoice-button invoice-button--danger"
                onClick={onDeleteConfirm}
                disabled={isSaving}
              >
                {isSaving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPaymentModalOpen && activeInvoice && (
        <div className="invoice-modal" role="dialog" aria-modal="true">
          <div className="invoice-modal__overlay" onClick={closePaymentModal} />
          <div className="invoice-modal__panel" ref={modalPanelRef} tabIndex={-1}>
            <div className="invoice-modal__header">
              <div>
                <h2>Record Payment</h2>
                <p className="invoice-subtitle">
                  Invoice #{activeInvoice.id} - {getTenantName(activeInvoice)}
                </p>
              </div>
              <button className="invoice-button" onClick={closePaymentModal}>
                Close
              </button>
            </div>
            <form className="invoice-form" onSubmit={handleSubmitPayment(onPaymentSubmit)}>
              <div className="invoice-form-grid">
                <label className="invoice-field">
                  Amount *
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={`invoice-input ${paymentErrors.amount ? "invoice-input--error" : ""}`}
                    {...registerPayment("amount", { required: "Amount is required" })}
                  />
                  {paymentErrors.amount && (
                    <span className="invoice-error">{paymentErrors.amount.message}</span>
                  )}
                </label>

                <label className="invoice-field">
                  Method *
                  <select className="invoice-input" {...registerPayment("method")}>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="invoice-field">
                  Transaction ID
                  <input
                    type="text"
                    className="invoice-input"
                    placeholder="Optional"
                    {...registerPayment("transaction_id")}
                  />
                </label>
              </div>
              <div className="invoice-actions">
                <button type="button" className="invoice-button" onClick={closePaymentModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="invoice-button invoice-button--primary"
                  disabled={isSaving}
                >
                  {isSaving ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}