import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useFacility } from "@/contexts/FacilityContext";
import { usePermissions } from "@/hooks/usePermissions";
import {
  invoiceAPI,
  invoiceItemAPI,
  type Invoice,
  type InvoiceItem,
  type InvoiceStatus,
  type PaymentMethod,
  type InvoiceItemPayload
} from "@/services/billing";
import "@/pages/billing/InvoiceListPage.css";
import "@/pages/billing/InvoiceDetailPage.css";

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
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

function getTenantName(invoice: Invoice | null): string {
  if (!invoice) return "—";
  if (invoice.tenant_name) return invoice.tenant_name;
  if (typeof invoice.tenant === "object" && invoice.tenant?.name) return invoice.tenant.name;
  return "—";
}

type InvoiceEditForm = {
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
};

type ItemForm = {
  description: string;
  quantity: string;
  unit_price: string;
};

type PaymentForm = {
  amount: string;
  method: PaymentMethod;
  transaction_id: string;
};

type VoidForm = {
  void_reason: string;
};

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  const { selectedFacilityId } = useFacility();
  const { hasPermission } = usePermissions();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InvoiceItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const modalPanelRef = useRef<HTMLDivElement | null>(null);

  const canView = hasPermission("billing.view_invoice");
  const canChange = hasPermission("billing.change_invoice");
  const canDelete = hasPermission("billing.delete_invoice");
  const canRecordPayment = hasPermission("billing.record_payment");
  const canViewItems = hasPermission("billing.view_invoiceitem");
  const canAddItems = hasPermission("billing.add_invoiceitem");
  const canChangeItems = hasPermission("billing.change_invoiceitem");
  const canDeleteItems = hasPermission("billing.delete_invoiceitem");

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEditForm,
    formState: { errors: editErrors }
  } = useForm<InvoiceEditForm>();

  const {
    register: registerItem,
    handleSubmit: handleSubmitItem,
    reset: resetItemForm,
    formState: { errors: itemErrors }
  } = useForm<ItemForm>();

  const {
    register: registerPayment,
    handleSubmit: handleSubmitPayment,
    reset: resetPaymentForm,
    formState: { errors: paymentErrors }
  } = useForm<PaymentForm>({
    defaultValues: {
      amount: "",
      method: "CASH",
      transaction_id: ""
    }
  });

  const {
    register: registerVoid,
    handleSubmit: handleSubmitVoid,
    reset: resetVoidForm,
    formState: { errors: voidErrors }
  } = useForm<VoidForm>();

  const totalAmount = useMemo(() => {
    if (!items.length) return 0;
    return items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unit_price) || 0;
      return sum + qty * price;
    }, 0);
  }, [items]);

  const fetchInvoice = useCallback(async () => {
    if (!selectedFacilityId || !invoiceId || !canView) return;

    setIsLoading(true);
    setLoadError(null);

    try {
      const data = await invoiceAPI.get(selectedFacilityId, invoiceId);
      setInvoice(data);
      setItems(data.items || []);
    } catch {
      setLoadError("Unable to load invoice.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedFacilityId, invoiceId, canView]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  useEffect(() => {
    if (!isEditModalOpen && !isVoidModalOpen && !isPaymentModalOpen && !isItemModalOpen) return;

    modalPanelRef.current?.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeEditModal();
        closeVoidModal();
        closePaymentModal();
        closeItemModal();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [isEditModalOpen, isVoidModalOpen, isPaymentModalOpen, isItemModalOpen]);

  const openEditModal = () => {
    if (!invoice) return;
    resetEditForm({
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      status: invoice.status
    });
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    resetEditForm();
  };

  const openVoidModal = () => {
    resetVoidForm();
    setIsVoidModalOpen(true);
  };

  const closeVoidModal = () => {
    setIsVoidModalOpen(false);
    resetVoidForm();
  };

  const openPaymentModal = () => {
    resetPaymentForm({
      amount: invoice?.total_amount || "",
      method: "CASH",
      transaction_id: ""
    });
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsPaymentModalOpen(false);
    resetPaymentForm();
  };

  const openAddItemModal = () => {
    setEditingItem(null);
    resetItemForm({ description: "", quantity: "1", unit_price: "" });
    setIsItemModalOpen(true);
  };

  const openEditItemModal = (item: InvoiceItem) => {
    setEditingItem(item);
    resetItemForm({
      description: item.description,
      quantity: String(item.quantity),
      unit_price: String(item.unit_price)
    });
    setIsItemModalOpen(true);
  };

  const closeItemModal = () => {
    setIsItemModalOpen(false);
    setEditingItem(null);
    resetItemForm();
  };

  const onEditSubmit = async (data: InvoiceEditForm) => {
    if (!selectedFacilityId || !invoiceId || !canChange) return;

    setIsSaving(true);
    setLoadError(null);

    try {
      await invoiceAPI.partialUpdate(selectedFacilityId, invoiceId, {
        issue_date: data.issue_date,
        due_date: data.due_date,
        status: data.status
      });
      setPageSuccess("Invoice updated.");
      closeEditModal();
      await fetchInvoice();
    } catch {
      setLoadError("Unable to update invoice.");
    } finally {
      setIsSaving(false);
    }
  };

  const onVoidSubmit = async (data: VoidForm) => {
    if (!selectedFacilityId || !invoiceId || !canChange) return;

    setIsSaving(true);
    setLoadError(null);

    try {
      await invoiceAPI.void(selectedFacilityId, invoiceId, data.void_reason);
      setPageSuccess("Invoice voided.");
      closeVoidModal();
      await fetchInvoice();
    } catch {
      setLoadError("Unable to void invoice.");
    } finally {
      setIsSaving(false);
    }
  };

  const onPaymentSubmit = async (data: PaymentForm) => {
    if (!selectedFacilityId || !invoiceId || !canRecordPayment) return;

    setIsSaving(true);
    setLoadError(null);

    try {
      await invoiceAPI.recordPayment(selectedFacilityId, {
        invoice: Number(invoiceId),
        amount: data.amount,
        method: data.method,
        transaction_id: data.transaction_id || undefined
      });
      setPageSuccess("Payment recorded.");
      closePaymentModal();
      await fetchInvoice();
    } catch {
      setLoadError("Unable to record payment.");
    } finally {
      setIsSaving(false);
    }
  };

  const onItemSubmit = async (data: ItemForm) => {
    if (!selectedFacilityId || !invoiceId) return;

    setIsSaving(true);
    setLoadError(null);

    const payload: InvoiceItemPayload = {
      description: data.description,
      quantity: Number(data.quantity),
      unit_price: data.unit_price
    };

    try {
      if (editingItem) {
        if (!canChangeItems) return;
        await invoiceItemAPI.update(selectedFacilityId, invoiceId, editingItem.id, payload);
        setPageSuccess("Item updated.");
      } else {
        if (!canAddItems) return;
        await invoiceItemAPI.create(selectedFacilityId, invoiceId, payload);
        setPageSuccess("Item added.");
      }
      closeItemModal();
      await fetchInvoice();
    } catch {
      setLoadError("Unable to save item.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (item: InvoiceItem) => {
    if (!selectedFacilityId || !invoiceId || !canDeleteItems) return;
    if (!window.confirm(`Delete item "${item.description}"?`)) return;

    try {
      await invoiceItemAPI.delete(selectedFacilityId, invoiceId, item.id);
      setPageSuccess("Item deleted.");
      await fetchInvoice();
    } catch {
      setLoadError("Unable to delete item.");
    }
  };

  const handleDeleteInvoice = async () => {
    if (!selectedFacilityId || !invoiceId || !canDelete) return;
    if (!window.confirm("Delete this invoice? This cannot be undone.")) return;

    try {
      await invoiceAPI.delete(selectedFacilityId, invoiceId);
      navigate("/invoices");
    } catch {
      setLoadError("Unable to delete invoice.");
    }
  };

  const handleDownloadPdf = () => {
    if (!selectedFacilityId || !invoiceId) return;
    const url = invoiceAPI.getPdfUrl(selectedFacilityId, invoiceId);
    window.open(url, "_blank");
  };

  if (!selectedFacilityId) {
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
          <h1>Invoice #{invoice?.id || invoiceId}</h1>
          <p className="invoice-subtitle">{getTenantName(invoice)}</p>
          <div className="invoice-header-meta">
            <span>Issued {formatDate(invoice?.issue_date)}</span>
            <span>Due {formatDate(invoice?.due_date)}</span>
            {invoice && (
              <span className={`invoice-status invoice-status--${invoice.status.toLowerCase()}`}>
                {invoice.status}
              </span>
            )}
            <span>Total {formatCurrency(invoice?.total_amount)}</span>
          </div>
        </div>
        <div className="invoice-actions">
          <button className="invoice-button invoice-button--primary" onClick={handleDownloadPdf}>
            Download PDF
          </button>
          {canChange && invoice?.status !== "VOID" && invoice?.status !== "PAID" && (
            <button className="invoice-button" onClick={openEditModal}>
              Edit
            </button>
          )}
          {canChange && invoice?.status !== "VOID" && invoice?.status !== "PAID" && (
            <button className="invoice-button invoice-button--danger" onClick={openVoidModal}>
              Void
            </button>
          )}
          {canDelete && invoice?.status === "DRAFT" && (
            <button className="invoice-button invoice-button--danger" onClick={handleDeleteInvoice}>
              Delete
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
                  <span className="invoice-detail-value">{invoice?.id}</span>
                </div>
                <div className="invoice-detail-row">
                  <span className="invoice-detail-label">Contract</span>
                  <span className="invoice-detail-value">{invoice?.contract}</span>
                </div>
                <div className="invoice-detail-row">
                  <span className="invoice-detail-label">Tenant</span>
                  <span className="invoice-detail-value">{getTenantName(invoice)}</span>
                </div>
                <div className="invoice-detail-row">
                  <span className="invoice-detail-label">Status</span>
                  <span className="invoice-detail-value">
                    {invoice && (
                      <span className={`invoice-status invoice-status--${invoice.status.toLowerCase()}`}>
                        {invoice.status}
                      </span>
                    )}
                  </span>
                </div>
                <div className="invoice-detail-row">
                  <span className="invoice-detail-label">Issue Date</span>
                  <span className="invoice-detail-value">{formatDate(invoice?.issue_date)}</span>
                </div>
                <div className="invoice-detail-row">
                  <span className="invoice-detail-label">Due Date</span>
                  <span className="invoice-detail-value">{formatDate(invoice?.due_date)}</span>
                </div>
              </div>
            </div>

            <div className="invoice-card invoice-card--highlight">
              <h2>Amount</h2>
              <div className="invoice-detail-list">
                <div className="invoice-detail-row">
                  <span className="invoice-detail-label">Total Amount</span>
                  <span className="invoice-detail-value">{formatCurrency(invoice?.total_amount)}</span>
                </div>
                {invoice?.void_reason && (
                  <div className="invoice-detail-row">
                    <span className="invoice-detail-label">Void Reason</span>
                    <span className="invoice-detail-value">{invoice.void_reason}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="invoice-section">
            <div className="invoice-section__header">
              <h2>Invoice Items</h2>
              <div className="invoice-inline-meta">
                <span>{items.length} items</span>
                <span>Calculated: {formatCurrency(totalAmount)}</span>
              </div>
              {canAddItems && invoice?.status !== "VOID" && invoice?.status !== "PAID" && (
                <button className="invoice-button" onClick={openAddItemModal}>
                  Add Item
                </button>
              )}
            </div>

            {canViewItems && (
              <div className="invoice-table-wrapper">
                <table className="invoice-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                      {(canChangeItems || canDeleteItems) && invoice?.status !== "VOID" && invoice?.status !== "PAID" && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="invoice-empty">
                          No items.
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id}>
                          <td>{item.description}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.unit_price)}</td>
                          <td>{formatCurrency(Number(item.quantity) * Number(item.unit_price))}</td>
                          {(canChangeItems || canDeleteItems) && invoice?.status !== "VOID" && invoice?.status !== "PAID" && (
                            <td>
                              <div className="invoice-actions">
                                {canChangeItems && (
                                  <button className="invoice-button" onClick={() => openEditItemModal(item)}>
                                    Edit
                                  </button>
                                )}
                                {canDeleteItems && (
                                  <button
                                    className="invoice-button invoice-button--danger"
                                    onClick={() => handleDeleteItem(item)}
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {canRecordPayment && invoice?.status !== "VOID" && invoice?.status !== "PAID" && (
            <section className="invoice-section">
              <div className="invoice-section__header">
                <h2>Record Payment</h2>
              </div>
              <button className="invoice-button invoice-button--primary" onClick={openPaymentModal}>
                Record Payment
              </button>
            </section>
          )}
        </>
      )}

      {isEditModalOpen && invoice && (
        <div className="invoice-modal" role="dialog" aria-modal="true">
          <div className="invoice-modal__overlay" onClick={closeEditModal} />
          <div className="invoice-modal__panel" ref={modalPanelRef} tabIndex={-1}>
            <div className="invoice-modal__header">
              <div>
                <h2>Edit Invoice</h2>
              </div>
              <button className="invoice-button" onClick={closeEditModal}>
                Close
              </button>
            </div>
            <form className="invoice-form" onSubmit={handleSubmitEdit(onEditSubmit)}>
              <div className="invoice-form-grid">
                <label className="invoice-field">
                  Issue Date *
                  <input
                    type="date"
                    className={`invoice-input ${editErrors.issue_date ? "invoice-input--error" : ""}`}
                    {...registerEdit("issue_date", { required: "Issue date is required" })}
                  />
                  {editErrors.issue_date && (
                    <span className="invoice-error">{editErrors.issue_date.message}</span>
                  )}
                </label>
                <label className="invoice-field">
                  Due Date *
                  <input
                    type="date"
                    className={`invoice-input ${editErrors.due_date ? "invoice-input--error" : ""}`}
                    {...registerEdit("due_date", { required: "Due date is required" })}
                  />
                  {editErrors.due_date && (
                    <span className="invoice-error">{editErrors.due_date.message}</span>
                  )}
                </label>
                <label className="invoice-field">
                  Status
                  <select className="invoice-input" {...registerEdit("status")}>
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="invoice-actions">
                <button type="button" className="invoice-button" onClick={closeEditModal}>
                  Cancel
                </button>
                <button type="submit" className="invoice-button invoice-button--primary" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isVoidModalOpen && (
        <div className="invoice-modal" role="dialog" aria-modal="true">
          <div className="invoice-modal__overlay" onClick={closeVoidModal} />
          <div className="invoice-modal__panel" ref={modalPanelRef} tabIndex={-1}>
            <div className="invoice-modal__header">
              <div>
                <h2>Void Invoice</h2>
                <p className="invoice-subtitle">This action cannot be undone.</p>
              </div>
              <button className="invoice-button" onClick={closeVoidModal}>
                Close
              </button>
            </div>
            <form className="invoice-form" onSubmit={handleSubmitVoid(onVoidSubmit)}>
              <label className="invoice-field">
                Reason *
                <textarea
                  className={`invoice-input invoice-textarea ${voidErrors.void_reason ? "invoice-input--error" : ""}`}
                  rows={3}
                  {...registerVoid("void_reason", { required: "Reason is required" })}
                />
                {voidErrors.void_reason && (
                  <span className="invoice-error">{voidErrors.void_reason.message}</span>
                )}
              </label>
              <div className="invoice-actions">
                <button type="button" className="invoice-button" onClick={closeVoidModal}>
                  Cancel
                </button>
                <button type="submit" className="invoice-button invoice-button--danger" disabled={isSaving}>
                  {isSaving ? "Voiding..." : "Void Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPaymentModalOpen && (
        <div className="invoice-modal" role="dialog" aria-modal="true">
          <div className="invoice-modal__overlay" onClick={closePaymentModal} />
          <div className="invoice-modal__panel" ref={modalPanelRef} tabIndex={-1}>
            <div className="invoice-modal__header">
              <div>
                <h2>Record Payment</h2>
                <p className="invoice-subtitle">Invoice #{invoiceId}</p>
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
                <button type="submit" className="invoice-button invoice-button--primary" disabled={isSaving}>
                  {isSaving ? "Recording..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isItemModalOpen && (
        <div className="invoice-modal" role="dialog" aria-modal="true">
          <div className="invoice-modal__overlay" onClick={closeItemModal} />
          <div className="invoice-modal__panel" ref={modalPanelRef} tabIndex={-1}>
            <div className="invoice-modal__header">
              <div>
                <h2>{editingItem ? "Edit Item" : "Add Item"}</h2>
              </div>
              <button className="invoice-button" onClick={closeItemModal}>
                Close
              </button>
            </div>
            <form className="invoice-form" onSubmit={handleSubmitItem(onItemSubmit)}>
              <label className="invoice-field">
                Description *
                <input
                  type="text"
                  className={`invoice-input ${itemErrors.description ? "invoice-input--error" : ""}`}
                  {...registerItem("description", { required: "Description is required" })}
                />
                {itemErrors.description && (
                  <span className="invoice-error">{itemErrors.description.message}</span>
                )}
              </label>
              <div className="invoice-form-grid">
                <label className="invoice-field">
                  Quantity *
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className={`invoice-input ${itemErrors.quantity ? "invoice-input--error" : ""}`}
                    {...registerItem("quantity", { required: "Quantity is required", min: 1 })}
                  />
                  {itemErrors.quantity && (
                    <span className="invoice-error">{itemErrors.quantity.message}</span>
                  )}
                </label>
                <label className="invoice-field">
                  Unit Price *
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={`invoice-input ${itemErrors.unit_price ? "invoice-input--error" : ""}`}
                    {...registerItem("unit_price", { required: "Unit price is required" })}
                  />
                  {itemErrors.unit_price && (
                    <span className="invoice-error">{itemErrors.unit_price.message}</span>
                  )}
                </label>
              </div>
              <div className="invoice-actions">
                <button type="button" className="invoice-button" onClick={closeItemModal}>
                  Cancel
                </button>
                <button type="submit" className="invoice-button invoice-button--primary" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingItem ? "Update" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}