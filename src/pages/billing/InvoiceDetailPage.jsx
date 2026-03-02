import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFacility } from "@/contexts/FacilityContext";
import { usePermissions } from "@/hooks/usePermissions";
import { invoiceAPI, invoiceItemsAPI } from "@/services/billing";
import { STATUS_OPTIONS, STATUS_LABELS, PAYMENT_METHODS } from "@/pages/billing/billingConstants";
import "@/pages/billing/InvoiceListPage.css";
import "@/pages/billing/InvoiceDetailPage.css";

const EMPTY_ITEM_FORM = { description: "", quantity: "1", unit_price: "" };

function formatDate(value) {
  if (!value) return "—";
  let date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    const [year, month, day] = String(value).split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

function formatCurrency(value) {
  const num = typeof value === "string" ? Number(value) : value;
  if (num == null || Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num);
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? String(status ?? "").replace(/_/g, " ");
}

function getStatusClass(status) {
  return String(status || "unknown").toLowerCase();
}

function getTenantName(invoice) {
  if (!invoice) return "—";
  if (invoice.tenant_name) return invoice.tenant_name;
  if (invoice.tenant?.name) return invoice.tenant.name;
  return "—";
}

function getTotal(invoice) {
  return invoice?.total_amount ?? invoice?.total ?? invoice?.amount_total ?? null;
}

export default function InvoiceDetailPage() {
  const { id: invoiceParam } = useParams();
  const navigate = useNavigate();
  const { selectedFacilityId } = useFacility();
  const { hasPermission } = usePermissions();

  const facilityId = selectedFacilityId;
  const invoiceId = invoiceParam;

  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [pageSuccess, setPageSuccess] = useState(null);

  // Edit invoice modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    tenant: "",
    contract: "",
    issue_date: "",
    due_date: "",
    status: "DRAFT"
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);
  const editModalRef = useRef(null);

  // Void modal
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [isVoiding, setIsVoiding] = useState(false);
  const voidModalRef = useRef(null);

  // Record payment form (inline)
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "CASH",
    transaction_id: ""
  });
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);

  // Invoice items
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [itemError, setItemError] = useState(null);
  const itemModalRef = useRef(null);

  const [editingItem, setEditingItem] = useState(null); // item being edited
  const [editItemForm, setEditItemForm] = useState(EMPTY_ITEM_FORM);
  const [isSavingEditItem, setIsSavingEditItem] = useState(false);
  const [editItemError, setEditItemError] = useState(null);
  const editItemModalRef = useRef(null);

  const canView = hasPermission("billing.view_invoice");
  const canChange = hasPermission("billing.change_invoice");
  const canDelete = hasPermission("billing.delete_invoice");
  const canRecordPayment = hasPermission("billing.record_payment");
  const canAddItem = hasPermission("billing.add_invoiceitem");
  const canChangeItem = hasPermission("billing.change_invoiceitem");
  const canDeleteItem = hasPermission("billing.delete_invoiceitem");

  const isFinalPaymentState =
    String(invoice?.status ?? "").toUpperCase() === "VOID" ||
    String(invoice?.status ?? "").toUpperCase() === "PAID";

  const normalizedItems = useMemo(() => {
    const raw = items.length > 0 ? items : (invoice?.items ?? []);
    return raw.map((item, i) => ({
      id: item.id ?? i,
      description: item.description ?? `Item ${i + 1}`,
      quantity: item.quantity ?? 1,
      unit_price: item.unit_price ?? 0,
      total_amount:
        item.total_amount ?? String(Number(item.quantity ?? 1) * Number(item.unit_price ?? 0))
    }));
  }, [items, invoice]);

  const fetchInvoice = async () => {
    if (!facilityId || !invoiceId || !canView) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await invoiceAPI.get(facilityId, invoiceId);
      setInvoice(data);
      if (Array.isArray(data.items)) {
        setItems(data.items);
      } else {
        const itemList = await invoiceItemsAPI.list(facilityId, invoiceId);
        setItems(itemList);
      }
    } catch {
      setLoadError("Não foi possível carregar a fatura.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [facilityId, invoiceId, canView]);

  useEffect(() => {
    if (invoice && !paymentForm.amount) {
      const total = getTotal(invoice);
      if (total != null) {
        setPaymentForm((prev) => ({ ...prev, amount: String(total) }));
      }
    }
  }, [invoice]);

  // ── Edit modal ────────────────────────────────────────────────────────

  const openEdit = () => {
    if (!invoice) return;
    setEditForm({
      tenant:
        typeof invoice.tenant === "object"
          ? String(invoice.tenant?.id ?? "")
          : String(invoice.tenant ?? ""),
      contract: invoice.contract ? String(invoice.contract) : "",
      issue_date: invoice.issue_date ?? "",
      due_date: invoice.due_date ?? "",
      status: invoice.status ?? "DRAFT"
    });
    setEditError(null);
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
    setEditError(null);
  };

  useEffect(() => {
    if (!isEditOpen) return;
    editModalRef.current?.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeEdit();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isEditOpen]);

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!facilityId || !invoiceId || !canChange) return;
    setIsSavingEdit(true);
    setEditError(null);
    try {
      const payload = {
        issue_date: editForm.issue_date,
        due_date: editForm.due_date,
        status: editForm.status
      };
      if (editForm.tenant) payload.tenant = Number(editForm.tenant);
      if (editForm.contract) payload.contract = Number(editForm.contract);
      await invoiceAPI.update(facilityId, invoiceId, payload);
      setPageSuccess("Fatura atualizada.");
      closeEdit();
      await fetchInvoice();
    } catch (err) {
      const msg = err?.response?.data
        ? Object.values(err.response.data).flat().join(" ")
        : "Erro ao atualizar fatura.";
      setEditError(msg);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // ── Void modal ────────────────────────────────────────────────────────

  const openVoid = () => {
    setVoidReason("");
    setIsVoidOpen(true);
  };
  const closeVoid = () => setIsVoidOpen(false);

  useEffect(() => {
    if (!isVoidOpen) return;
    voidModalRef.current?.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeVoid();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isVoidOpen]);

  const handleVoidSubmit = async (e) => {
    e.preventDefault();
    if (!facilityId || !invoiceId || !canChange || isVoiding) return;
    const trimmedReason = voidReason.trim();
    if (!trimmedReason) {
      setLoadError("Motivo da anulação é obrigatório.");
      setIsVoiding(false);
      return;
    }
    setIsVoiding(true);
    setLoadError(null);
    try {
      await invoiceAPI.voidInvoice(facilityId, invoiceId, { void_reason: trimmedReason });
      setPageSuccess(`Fatura #${invoiceId} anulada.`);
      closeVoid();
      await fetchInvoice();
    } catch {
      setLoadError("Não foi possível anular a fatura.");
    } finally {
      setIsVoiding(false);
    }
  };

  // ── Delete invoice ────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!facilityId || !invoiceId || !canDelete) return;
    if (!window.confirm(`Excluir fatura #${invoiceId}? Esta ação não pode ser desfeita.`)) return;
    try {
      await invoiceAPI.delete(facilityId, invoiceId);
      navigate("/invoices");
    } catch {
      setLoadError("Não foi possível excluir a fatura.");
    }
  };

  // ── Record payment ────────────────────────────────────────────────────

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!facilityId || !invoiceId || !canRecordPayment || isPaymentSubmitting) return;
    setIsPaymentSubmitting(true);
    setLoadError(null);
    setPageSuccess(null);
    try {
      await invoiceAPI.recordPayment(facilityId, {
        invoice: Number(invoiceId),
        amount: paymentForm.amount,
        method: paymentForm.method,
        transaction_id: paymentForm.transaction_id || undefined
      });
      setPageSuccess("Pagamento registrado.");
      setPaymentForm({ amount: "", method: "CASH", transaction_id: "" });
      await fetchInvoice();
    } catch {
      setLoadError("Não foi possível registrar o pagamento.");
    } finally {
      setIsPaymentSubmitting(false);
    }
  };

  // ── Add item modal ────────────────────────────────────────────────────

  const openAddItem = () => {
    setItemForm(EMPTY_ITEM_FORM);
    setItemError(null);
    setIsAddItemOpen(true);
  };

  const closeAddItem = () => {
    setIsAddItemOpen(false);
    setItemError(null);
  };

  useEffect(() => {
    if (!isAddItemOpen) return;
    itemModalRef.current?.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeAddItem();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isAddItemOpen]);

  const handleAddItemSubmit = async (e) => {
    e.preventDefault();
    if (!facilityId || !invoiceId || !canAddItem) return;
    setIsSavingItem(true);
    setItemError(null);
    try {
      await invoiceItemsAPI.create(facilityId, invoiceId, {
        description: itemForm.description,
        quantity: Number(itemForm.quantity),
        unit_price: itemForm.unit_price
      });
      setPageSuccess("Item adicionado.");
      closeAddItem();
      await fetchInvoice();
    } catch (err) {
      const msg = err?.response?.data
        ? Object.values(err.response.data).flat().join(" ")
        : "Erro ao adicionar item.";
      setItemError(msg);
    } finally {
      setIsSavingItem(false);
    }
  };

  // ── Edit item modal ───────────────────────────────────────────────────

  const openEditItem = (item) => {
    setEditingItem(item);
    setEditItemForm({
      description: item.description,
      quantity: String(item.quantity),
      unit_price: String(item.unit_price)
    });
    setEditItemError(null);
  };

  const closeEditItem = () => {
    setEditingItem(null);
    setEditItemError(null);
  };

  useEffect(() => {
    if (!editingItem) return;
    editItemModalRef.current?.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeEditItem();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [editingItem]);

  const handleEditItemSubmit = async (e) => {
    e.preventDefault();
    if (!facilityId || !invoiceId || !editingItem || !canChangeItem) return;
    setIsSavingEditItem(true);
    setEditItemError(null);
    try {
      await invoiceItemsAPI.update(facilityId, invoiceId, editingItem.id, {
        description: editItemForm.description,
        quantity: Number(editItemForm.quantity),
        unit_price: editItemForm.unit_price
      });
      setPageSuccess("Item atualizado.");
      closeEditItem();
      await fetchInvoice();
    } catch (err) {
      const msg = err?.response?.data
        ? Object.values(err.response.data).flat().join(" ")
        : "Erro ao atualizar item.";
      setEditItemError(msg);
    } finally {
      setIsSavingEditItem(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!facilityId || !invoiceId || !canDeleteItem) return;
    if (!window.confirm(`Remover item "${item.description}"?`)) return;
    try {
      await invoiceItemsAPI.delete(facilityId, invoiceId, item.id);
      setPageSuccess("Item removido.");
      await fetchInvoice();
    } catch {
      setLoadError("Não foi possível remover o item.");
    }
  };

  // ── Download PDF ──────────────────────────────────────────────────────

  const handleDownloadPdf = async () => {
    if (!facilityId || !invoiceId || isPdfDownloading) return;
    setIsPdfDownloading(true);
    try {
      const objectUrl = await invoiceAPI.fetchInvoicePdf(facilityId, invoiceId);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `fatura-${invoiceId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);
    } catch {
      setLoadError("Não foi possível baixar o PDF.");
    } finally {
      setIsPdfDownloading(false);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────

  if (!facilityId) {
    return (
      <div className="invoice-page">
        <div className="invoice-header">
          <h1>Detalhe da Fatura</h1>
          <p className="invoice-subtitle">Selecione uma filial.</p>
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="invoice-page">
        <div className="invoice-header">
          <h1>Detalhe da Fatura</h1>
          <p className="invoice-subtitle">Acesso negado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="invoice-page">
      {/* ── Header ── */}
      <div className="invoice-header">
        <div>
          <button
            className="invoice-button"
            style={{ marginBottom: "0.75rem" }}
            onClick={() => navigate("/invoices")}
          >
            ← Voltar
          </button>
          <h1>Fatura #{invoice?.id ?? invoiceId}</h1>
          <p className="invoice-subtitle">{getTenantName(invoice)}</p>
          {invoice && (
            <div className="invoice-header-meta">
              <span>Emissão: {formatDate(invoice.issue_date)}</span>
              <span>Vencimento: {formatDate(invoice.due_date)}</span>
              <span className={`invoice-status invoice-status--${getStatusClass(invoice.status)}`}>
                {getStatusLabel(invoice.status)}
              </span>
              <span>Total: {formatCurrency(getTotal(invoice))}</span>
            </div>
          )}
        </div>
        <div className="invoice-actions">
          <button
            className="invoice-button invoice-button--primary"
            onClick={handleDownloadPdf}
            disabled={isPdfDownloading}
          >
            {isPdfDownloading ? "Baixando…" : "Baixar PDF"}
          </button>
          {canChange && !isFinalPaymentState && (
            <button className="invoice-button" onClick={openEdit}>
              Editar
            </button>
          )}
          {canChange && !isFinalPaymentState && (
            <button className="invoice-button invoice-button--warning" onClick={openVoid}>
              Anular
            </button>
          )}
          {canDelete && (
            <button className="invoice-button invoice-button--danger" onClick={handleDelete}>
              Excluir
            </button>
          )}
        </div>
      </div>

      {loadError && <div className="invoice-alert invoice-alert--error">{loadError}</div>}
      {pageSuccess && <div className="invoice-alert invoice-alert--success">{pageSuccess}</div>}

      {isLoading ? (
        <div className="invoice-empty">Carregando fatura…</div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <section className="invoice-detail-grid">
            <div className="invoice-card">
              <h2>Resumo</h2>
              <div className="invoice-detail-list">
                <div className="invoice-detail-row">
                  <span className="invoice-detail-label">Fatura #</span>
                  <span className="invoice-detail-value">{invoice?.id ?? invoiceId}</span>
                </div>
                <div className="invoice-detail-row">
                  <span className="invoice-detail-label">Status</span>
                  <span
                    className={`invoice-status invoice-status--${getStatusClass(invoice?.status)}`}
                  >
                    {getStatusLabel(invoice?.status)}
                  </span>
                </div>
                <div className="invoice-detail-row">
                  <span className="invoice-detail-label">Emissão</span>
                  <span className="invoice-detail-value">{formatDate(invoice?.issue_date)}</span>
                </div>
                <div className="invoice-detail-row">
                  <span className="invoice-detail-label">Vencimento</span>
                  <span className="invoice-detail-value">{formatDate(invoice?.due_date)}</span>
                </div>
              </div>
            </div>
            <div className="invoice-card invoice-card--highlight">
              <h2>Valores</h2>
              <div className="invoice-detail-list">
                <div className="invoice-detail-row">
                  <span className="invoice-detail-label">Total</span>
                  <span className="invoice-detail-value">{formatCurrency(getTotal(invoice))}</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Items ── */}
          <section className="invoice-section">
            <div className="invoice-section__header">
              <h2>Itens da Fatura</h2>
              {canAddItem && !isFinalPaymentState && (
                <button className="invoice-button invoice-button--primary" onClick={openAddItem}>
                  + Adicionar Item
                </button>
              )}
            </div>
            <div className="invoice-table-wrapper">
              <table className="invoice-table">
                <thead>
                  <tr>
                    <th>Descrição</th>
                    <th>Qtd</th>
                    <th>Preço Unitário</th>
                    <th>Total</th>
                    {(canChangeItem || canDeleteItem) && (
                      <th className="invoice-actions-header">Ações</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {normalizedItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canChangeItem || canDeleteItem ? 5 : 4}
                        className="invoice-empty"
                      >
                        Nenhum item cadastrado.
                      </td>
                    </tr>
                  ) : (
                    normalizedItems.map((item) => (
                      <tr key={item.id}>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unit_price)}</td>
                        <td>{formatCurrency(item.total_amount)}</td>
                        {(canChangeItem || canDeleteItem) && (
                          <td>
                            <div className="invoice-actions">
                              {canChangeItem && !isFinalPaymentState && (
                                <button
                                  className="invoice-icon-button"
                                  onClick={() => openEditItem(item)}
                                  title="Editar item"
                                >
                                  <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                              )}
                              {canDeleteItem && !isFinalPaymentState && (
                                <button
                                  className="invoice-icon-button invoice-icon-button--danger"
                                  onClick={() => handleDeleteItem(item)}
                                  title="Remover item"
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
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Record payment ── */}
          <section className="invoice-section">
            <div className="invoice-section__header">
              <h2>Registrar Pagamento</h2>
              {!canRecordPayment && (
                <span className="invoice-subtitle">Sem permissão para registrar pagamento.</span>
              )}
            </div>
            {canRecordPayment && (
              <form className="invoice-form" onSubmit={handlePaymentSubmit}>
                <div className="invoice-form-grid">
                  <label className="invoice-field">
                    Valor *
                    <input
                      className="invoice-input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={(e) =>
                        setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))
                      }
                      disabled={isPaymentSubmitting}
                      required
                    />
                  </label>
                  <label className="invoice-field">
                    Método *
                    <select
                      className="invoice-input"
                      value={paymentForm.method}
                      onChange={(e) =>
                        setPaymentForm((prev) => ({ ...prev, method: e.target.value }))
                      }
                      disabled={isPaymentSubmitting}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="invoice-field">
                    ID da Transação
                    <input
                      className="invoice-input"
                      type="text"
                      placeholder="Opcional"
                      value={paymentForm.transaction_id}
                      onChange={(e) =>
                        setPaymentForm((prev) => ({ ...prev, transaction_id: e.target.value }))
                      }
                      disabled={isPaymentSubmitting}
                    />
                  </label>
                </div>
                <div className="invoice-actions invoice-actions--left">
                  <button
                    className="invoice-button invoice-button--primary"
                    type="submit"
                    disabled={isFinalPaymentState || isPaymentSubmitting}
                  >
                    {isPaymentSubmitting ? "Salvando…" : "Registrar Pagamento"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </>
      )}

      {/* ── Edit Invoice Modal ── */}
      {isEditOpen && (
        <div className="invoice-modal" role="dialog" aria-modal="true" aria-label="Editar fatura">
          <div className="invoice-modal__overlay" onClick={closeEdit} />
          <div className="invoice-modal__panel" ref={editModalRef} tabIndex={-1}>
            <div className="invoice-modal__header">
              <div>
                <h2>Editar Fatura #{invoiceId}</h2>
              </div>
              <button className="invoice-button" onClick={closeEdit}>
                Fechar
              </button>
            </div>
            {editError && <div className="invoice-alert invoice-alert--error">{editError}</div>}
            <form className="invoice-form" onSubmit={handleEditSubmit}>
              <div className="invoice-form-grid">
                <label className="invoice-field">
                  ID do Inquilino
                  <input
                    className="invoice-input"
                    type="number"
                    min="1"
                    value={editForm.tenant}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, tenant: e.target.value }))}
                  />
                </label>
                <label className="invoice-field">
                  ID do Contrato
                  <input
                    className="invoice-input"
                    type="number"
                    min="1"
                    value={editForm.contract}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, contract: e.target.value }))}
                    placeholder="Opcional"
                  />
                </label>
                <label className="invoice-field">
                  Data de Emissão *
                  <input
                    className="invoice-input"
                    type="date"
                    value={editForm.issue_date}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, issue_date: e.target.value }))
                    }
                    required
                  />
                </label>
                <label className="invoice-field">
                  Data de Vencimento *
                  <input
                    className="invoice-input"
                    type="date"
                    value={editForm.due_date}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, due_date: e.target.value }))}
                    required
                  />
                </label>
                <label className="invoice-field">
                  Status
                  <select
                    className="invoice-input"
                    value={editForm.status}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="invoice-actions">
                <button className="invoice-button" type="button" onClick={closeEdit}>
                  Cancelar
                </button>
                <button
                  className="invoice-button invoice-button--primary"
                  type="submit"
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Void Modal ── */}
      {isVoidOpen && (
        <div className="invoice-modal" role="dialog" aria-modal="true" aria-label="Anular fatura">
          <div className="invoice-modal__overlay" onClick={closeVoid} />
          <div className="invoice-modal__panel" ref={voidModalRef} tabIndex={-1}>
            <div className="invoice-modal__header">
              <div>
                <h2>Anular Fatura #{invoiceId}</h2>
                <p className="invoice-subtitle">Informe o motivo da anulação.</p>
              </div>
              <button className="invoice-button" onClick={closeVoid}>
                Fechar
              </button>
            </div>
            <form className="invoice-form" onSubmit={handleVoidSubmit}>
              <label className="invoice-field">
                Motivo *
                <textarea
                  className="invoice-input invoice-textarea"
                  rows={4}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  required
                />
              </label>
              <div className="invoice-actions">
                <button className="invoice-button" type="button" onClick={closeVoid}>
                  Cancelar
                </button>
                <button
                  className="invoice-button invoice-button--danger"
                  type="submit"
                  disabled={isVoiding}
                >
                  {isVoiding ? "Anulando…" : "Anular Fatura"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Item Modal ── */}
      {isAddItemOpen && (
        <div className="invoice-modal" role="dialog" aria-modal="true" aria-label="Adicionar item">
          <div className="invoice-modal__overlay" onClick={closeAddItem} />
          <div className="invoice-modal__panel" ref={itemModalRef} tabIndex={-1}>
            <div className="invoice-modal__header">
              <div>
                <h2>Adicionar Item</h2>
              </div>
              <button className="invoice-button" onClick={closeAddItem}>
                Fechar
              </button>
            </div>
            {itemError && <div className="invoice-alert invoice-alert--error">{itemError}</div>}
            <form className="invoice-form" onSubmit={handleAddItemSubmit}>
              <label className="invoice-field">
                Descrição *
                <input
                  className="invoice-input"
                  type="text"
                  value={itemForm.description}
                  onChange={(e) =>
                    setItemForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  required
                  placeholder="Ex: Aluguel – Janeiro"
                />
              </label>
              <div className="invoice-form-grid">
                <label className="invoice-field">
                  Quantidade *
                  <input
                    className="invoice-input"
                    type="number"
                    min="1"
                    step="1"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm((prev) => ({ ...prev, quantity: e.target.value }))}
                    required
                  />
                </label>
                <label className="invoice-field">
                  Preço Unitário *
                  <input
                    className="invoice-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={itemForm.unit_price}
                    onChange={(e) =>
                      setItemForm((prev) => ({ ...prev, unit_price: e.target.value }))
                    }
                    required
                    placeholder="0.00"
                  />
                </label>
              </div>
              <div className="invoice-actions">
                <button className="invoice-button" type="button" onClick={closeAddItem}>
                  Cancelar
                </button>
                <button
                  className="invoice-button invoice-button--primary"
                  type="submit"
                  disabled={isSavingItem}
                >
                  {isSavingItem ? "Salvando…" : "Adicionar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Item Modal ── */}
      {editingItem && (
        <div className="invoice-modal" role="dialog" aria-modal="true" aria-label="Editar item">
          <div className="invoice-modal__overlay" onClick={closeEditItem} />
          <div className="invoice-modal__panel" ref={editItemModalRef} tabIndex={-1}>
            <div className="invoice-modal__header">
              <div>
                <h2>Editar Item</h2>
              </div>
              <button className="invoice-button" onClick={closeEditItem}>
                Fechar
              </button>
            </div>
            {editItemError && (
              <div className="invoice-alert invoice-alert--error">{editItemError}</div>
            )}
            <form className="invoice-form" onSubmit={handleEditItemSubmit}>
              <label className="invoice-field">
                Descrição *
                <input
                  className="invoice-input"
                  type="text"
                  value={editItemForm.description}
                  onChange={(e) =>
                    setEditItemForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  required
                />
              </label>
              <div className="invoice-form-grid">
                <label className="invoice-field">
                  Quantidade *
                  <input
                    className="invoice-input"
                    type="number"
                    min="1"
                    step="1"
                    value={editItemForm.quantity}
                    onChange={(e) =>
                      setEditItemForm((prev) => ({ ...prev, quantity: e.target.value }))
                    }
                    required
                  />
                </label>
                <label className="invoice-field">
                  Preço Unitário *
                  <input
                    className="invoice-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={editItemForm.unit_price}
                    onChange={(e) =>
                      setEditItemForm((prev) => ({ ...prev, unit_price: e.target.value }))
                    }
                    required
                  />
                </label>
              </div>
              <div className="invoice-actions">
                <button className="invoice-button" type="button" onClick={closeEditItem}>
                  Cancelar
                </button>
                <button
                  className="invoice-button invoice-button--primary"
                  type="submit"
                  disabled={isSavingEditItem}
                >
                  {isSavingEditItem ? "Salvando…" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
