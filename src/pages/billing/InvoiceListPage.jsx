import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFacility } from "@/contexts/FacilityContext";
import { usePermissions } from "@/hooks/usePermissions";
import { invoiceAPI } from "@/services/billing";
import "@/pages/billing/InvoiceListPage.css";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "DRAFT", label: "Rascunho" },
  { value: "ISSUED", label: "Emitida" },
  { value: "PAID", label: "Paga" },
  { value: "OVERDUE", label: "Vencida" },
  { value: "VOID", label: "Anulada" }
];

const STATUS_LABELS = {
  DRAFT: "Rascunho",
  ISSUED: "Emitida",
  PAID: "Paga",
  OVERDUE: "Vencida",
  VOID: "Anulada"
};

const PAYMENT_METHODS = [
  { value: "CASH", label: "Dinheiro" },
  { value: "CARD", label: "Cartão" },
  { value: "TRANSFER", label: "Transferência" },
  { value: "OTHER", label: "Outro" }
];

const PAGE_SIZE = 10;

const EMPTY_INVOICE_FORM = {
  tenant: "",
  contract: "",
  issue_date: new Date().toISOString().slice(0, 10),
  due_date: "",
  status: "DRAFT"
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
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

function getTenantName(invoice) {
  if (invoice.tenant_name) return invoice.tenant_name;
  if (invoice.tenant?.name) return invoice.tenant.name;
  return "—";
}

function getInvoiceTotal(invoice) {
  return invoice.total_amount ?? invoice.total ?? invoice.amount_total ?? "—";
}

function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? String(status ?? "").replace(/_/g, " ");
}

function getStatusClass(status) {
  return String(status || "unknown").toLowerCase();
}

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const { selectedFacilityId } = useFacility();
  const { hasPermission } = usePermissions();

  const [statusFilter, setStatusFilter] = useState("");
  const [tenantFilter, setTenantFilter] = useState("");

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

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState(EMPTY_INVOICE_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const createModalRef = useRef(null);

  // Record payment modal
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "CASH",
    transaction_id: ""
  });
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const paymentModalRef = useRef(null);

  const canView = hasPermission("billing.view_invoice");
  const canAdd = hasPermission("billing.add_invoice");
  const canDelete = hasPermission("billing.delete_invoice");
  const canRecordPayment = hasPermission("billing.record_payment");
  const canVoid = hasPermission("billing.change_invoice");

  const totalPages = useMemo(() => {
    if (!pagination.count || !pagination.pageSize) return 1;
    return Math.max(1, Math.ceil(pagination.count / pagination.pageSize));
  }, [pagination.count, pagination.pageSize]);

  const visiblePages = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, Math.min(pagination.page - 2, totalPages - 4));
    return Array.from({ length: 5 }, (_, i) => start + i);
  }, [pagination.page, totalPages]);

  const showingFrom =
    pagination.count === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const showingTo =
    pagination.count === 0 ? 0 : Math.min(pagination.page * pagination.pageSize, pagination.count);

  const fetchInvoices = async ({ page = 1 } = {}) => {
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
        page: response.page,
        pageSize: response.pageSize || PAGE_SIZE,
        next: response.next,
        previous: response.previous
      });
    } catch {
      setLoadError("Não foi possível carregar as faturas. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices({ page: 1 });
  }, [selectedFacilityId, statusFilter, tenantFilter, canView]);

  // ── Create modal ──────────────────────────────────────────────────────

  const openCreate = () => {
    setInvoiceForm(EMPTY_INVOICE_FORM);
    setFormError(null);
    setIsCreateOpen(true);
  };

  const closeCreate = () => {
    setIsCreateOpen(false);
    setFormError(null);
  };

  useEffect(() => {
    if (!isCreateOpen) return;
    createModalRef.current?.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeCreate();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isCreateOpen]);

  const handleInvoiceFormChange = (field) => (e) => {
    setInvoiceForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFacilityId || !canAdd) return;
    setIsSaving(true);
    setFormError(null);
    try {
      const payload = {
        tenant: Number(invoiceForm.tenant),
        issue_date: invoiceForm.issue_date,
        due_date: invoiceForm.due_date,
        status: invoiceForm.status
      };
      if (invoiceForm.contract) {
        payload.contract = Number(invoiceForm.contract);
      }
      await invoiceAPI.create(selectedFacilityId, payload);
      setPageSuccess("Fatura criada com sucesso.");
      closeCreate();
      await fetchInvoices({ page: 1 });
    } catch (err) {
      const msg = err?.response?.data
        ? Object.values(err.response.data).flat().join(" ")
        : "Erro ao criar fatura.";
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Payment modal ─────────────────────────────────────────────────────

  const openPayment = (invoice) => {
    setActiveInvoice(invoice);
    setPaymentForm({
      amount: String(getInvoiceTotal(invoice) !== "—" ? getInvoiceTotal(invoice) : ""),
      method: "CASH",
      transaction_id: ""
    });
    setIsPaymentOpen(true);
  };

  const closePayment = () => {
    setIsPaymentOpen(false);
    setActiveInvoice(null);
  };

  useEffect(() => {
    if (!isPaymentOpen) return;
    paymentModalRef.current?.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePayment();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isPaymentOpen]);

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFacilityId || !activeInvoice) return;
    setIsSubmittingPayment(true);
    try {
      await invoiceAPI.recordPayment(selectedFacilityId, {
        invoice: activeInvoice.id,
        amount: paymentForm.amount,
        method: paymentForm.method,
        transaction_id: paymentForm.transaction_id || undefined
      });
      setPageSuccess(`Pagamento registrado para fatura #${activeInvoice.id}.`);
      closePayment();
      await fetchInvoices({ page: pagination.page });
    } catch {
      setLoadError("Não foi possível registrar o pagamento.");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────

  const handleView = (invoice) => {
    navigate(`/invoices/${invoice.id}`);
  };

  const handleVoid = async (invoice) => {
    if (!selectedFacilityId || !canVoid) return;
    if (!window.confirm(`Anular fatura #${invoice.id}?`)) return;
    const reason = window.prompt("Motivo da anulação (obrigatório):") ?? "";
    if (!reason.trim()) return;
    try {
      await invoiceAPI.voidInvoice(selectedFacilityId, invoice.id, { void_reason: reason });
      setPageSuccess(`Fatura #${invoice.id} anulada.`);
      await fetchInvoices({ page: pagination.page });
    } catch {
      setLoadError("Não foi possível anular a fatura.");
    }
  };

  const handleDelete = async (invoice) => {
    if (!selectedFacilityId || !canDelete) return;
    if (!window.confirm(`Excluir fatura #${invoice.id}? Esta ação não pode ser desfeita.`)) return;
    try {
      await invoiceAPI.delete(selectedFacilityId, invoice.id);
      setPageSuccess(`Fatura #${invoice.id} excluída.`);
      await fetchInvoices({ page: pagination.page });
    } catch {
      setLoadError("Não foi possível excluir a fatura.");
    }
  };

  const handlePageChange = (nextPage) => {
    const target = Math.min(Math.max(1, nextPage), totalPages);
    fetchInvoices({ page: target });
  };

  // ── Guards ────────────────────────────────────────────────────────────

  if (!selectedFacilityId) {
    return (
      <div className="invoice-page">
        <div className="invoice-header">
          <div>
            <h1>Faturas</h1>
            <p className="invoice-subtitle">Selecione uma filial para ver as faturas.</p>
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
            <h1>Faturas</h1>
            <p className="invoice-subtitle">Você não tem permissão de acesso ao faturamento.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="invoice-page">
      <div className="invoice-header">
        <div>
          <h1>Faturas</h1>
          <p className="invoice-subtitle">Gerencie faturas, pagamentos e status.</p>
        </div>
        {canAdd && (
          <button className="invoice-button invoice-button--primary" onClick={openCreate}>
            + Nova Fatura
          </button>
        )}
      </div>

      <div className="invoice-filters">
        <label className="invoice-field">
          Status
          <select
            className="invoice-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="invoice-field">
          Inquilino
          <input
            className="invoice-input"
            type="text"
            placeholder="Nome ou ID"
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
              <th>#</th>
              <th>Inquilino</th>
              <th>Emissão</th>
              <th>Vencimento</th>
              <th>Total</th>
              <th>Status</th>
              <th className="invoice-actions-header">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="invoice-empty">
                  Carregando faturas…
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="invoice-empty">
                  Nenhuma fatura encontrada.
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
                      className={`invoice-status invoice-status--${getStatusClass(invoice.status)}`}
                    >
                      {getStatusLabel(invoice.status)}
                    </span>
                  </td>
                  <td>
                    <div className="invoice-actions">
                      {/* View */}
                      <button
                        className="invoice-icon-button"
                        onClick={() => handleView(invoice)}
                        title="Ver detalhe"
                        aria-label={`Ver fatura ${invoice.id}`}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      {/* Record payment */}
                      {canRecordPayment && (
                        <button
                          className="invoice-icon-button"
                          onClick={() => openPayment(invoice)}
                          title="Registrar pagamento"
                          aria-label={`Registrar pagamento da fatura ${invoice.id}`}
                          disabled={invoice.status === "VOID" || invoice.status === "PAID"}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <line x1="12" y1="1" x2="12" y2="23" />
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14.5a3.5 3.5 0 0 1 0 7H6" />
                          </svg>
                        </button>
                      )}
                      {/* Void */}
                      {canVoid && invoice.status !== "VOID" && (
                        <button
                          className="invoice-icon-button invoice-icon-button--warning"
                          onClick={() => handleVoid(invoice)}
                          title="Anular fatura"
                          aria-label={`Anular fatura ${invoice.id}`}
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                          </svg>
                        </button>
                      )}
                      {/* Delete */}
                      {canDelete && (
                        <button
                          className="invoice-icon-button invoice-icon-button--danger"
                          onClick={() => handleDelete(invoice)}
                          title="Excluir fatura"
                          aria-label={`Excluir fatura ${invoice.id}`}
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
            Exibindo {showingFrom}–{showingTo} de {pagination.count}
          </span>
          <div className="invoice-pagination__controls">
            <button
              className="invoice-pagination__page"
              onClick={() => handlePageChange(1)}
              disabled={pagination.page <= 1}
              aria-label="Primeira página"
            >
              {"<<"}
            </button>
            <button
              className="invoice-pagination__page"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              aria-label="Página anterior"
            >
              {"<"}
            </button>
            {visiblePages.map((p) => (
              <button
                key={p}
                className={`invoice-pagination__page${p === pagination.page ? " invoice-pagination__page--active" : ""}`}
                onClick={() => handlePageChange(p)}
                aria-label={`Página ${p}`}
              >
                {p}
              </button>
            ))}
            <button
              className="invoice-pagination__page"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages && !pagination.next}
              aria-label="Próxima página"
            >
              {">"}
            </button>
            <button
              className="invoice-pagination__page"
              onClick={() => handlePageChange(totalPages)}
              disabled={pagination.page >= totalPages && !pagination.next}
              aria-label="Última página"
            >
              {">>"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Create Invoice Modal ── */}
      {isCreateOpen && (
        <div className="invoice-modal" role="dialog" aria-modal="true" aria-label="Nova fatura">
          <div className="invoice-modal__overlay" onClick={closeCreate} />
          <div className="invoice-modal__panel" ref={createModalRef} tabIndex={-1}>
            <div className="invoice-modal__header">
              <div>
                <h2>Nova Fatura</h2>
                <p className="invoice-subtitle">Preencha os dados para criar uma fatura.</p>
              </div>
              <button className="invoice-button" onClick={closeCreate}>
                Fechar
              </button>
            </div>
            {formError && <div className="invoice-alert invoice-alert--error">{formError}</div>}
            <form className="invoice-form" onSubmit={handleCreateSubmit}>
              <div className="invoice-form-grid">
                <label className="invoice-field">
                  ID do Inquilino *
                  <input
                    className="invoice-input"
                    type="number"
                    min="1"
                    value={invoiceForm.tenant}
                    onChange={handleInvoiceFormChange("tenant")}
                    required
                    placeholder="Ex: 1"
                  />
                </label>
                <label className="invoice-field">
                  ID do Contrato
                  <input
                    className="invoice-input"
                    type="number"
                    min="1"
                    value={invoiceForm.contract}
                    onChange={handleInvoiceFormChange("contract")}
                    placeholder="Opcional"
                  />
                </label>
                <label className="invoice-field">
                  Data de Emissão *
                  <input
                    className="invoice-input"
                    type="date"
                    value={invoiceForm.issue_date}
                    onChange={handleInvoiceFormChange("issue_date")}
                    required
                  />
                </label>
                <label className="invoice-field">
                  Data de Vencimento *
                  <input
                    className="invoice-input"
                    type="date"
                    value={invoiceForm.due_date}
                    onChange={handleInvoiceFormChange("due_date")}
                    required
                  />
                </label>
                <label className="invoice-field">
                  Status
                  <select
                    className="invoice-input"
                    value={invoiceForm.status}
                    onChange={handleInvoiceFormChange("status")}
                  >
                    {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="invoice-subtitle" style={{ fontSize: "0.85rem" }}>
                Para adicionar itens à fatura, acesse o detalhe após criá-la.
              </p>
              <div className="invoice-actions">
                <button className="invoice-button" type="button" onClick={closeCreate}>
                  Cancelar
                </button>
                <button
                  className="invoice-button invoice-button--primary"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? "Salvando…" : "Criar Fatura"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Record Payment Modal ── */}
      {isPaymentOpen && (
        <div
          className="invoice-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Registrar pagamento"
        >
          <div className="invoice-modal__overlay" onClick={closePayment} />
          <div className="invoice-modal__panel" ref={paymentModalRef} tabIndex={-1}>
            <div className="invoice-modal__header">
              <div>
                <h2>Registrar Pagamento</h2>
                <p className="invoice-subtitle">
                  Fatura #{activeInvoice?.id} — {getTenantName(activeInvoice ?? {})}
                </p>
              </div>
              <button className="invoice-button" onClick={closePayment}>
                Fechar
              </button>
            </div>
            <form className="invoice-form" onSubmit={handlePaymentSubmit}>
              <div className="invoice-form-grid">
                <label className="invoice-field">
                  Valor *
                  <input
                    className="invoice-input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))
                    }
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
                  />
                </label>
              </div>
              <div className="invoice-actions">
                <button className="invoice-button" type="button" onClick={closePayment}>
                  Cancelar
                </button>
                <button
                  className="invoice-button invoice-button--primary"
                  type="submit"
                  disabled={isSubmittingPayment}
                >
                  {isSubmittingPayment ? "Salvando…" : "Registrar Pagamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
