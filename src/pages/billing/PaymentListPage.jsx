import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFacility } from "@/contexts/FacilityContext";
import { usePermissions } from "@/hooks/usePermissions";
import { paymentsAPI } from "@/services/billing";
import { PAYMENT_METHODS } from "@/pages/billing/billingConstants";
import "@/pages/billing/PaymentListPage.css";
import Breadcrumb from "@/components/Breadcrumb";

const FILTER_METHOD_OPTIONS = [{ value: "", label: "Todos os métodos" }, ...PAYMENT_METHODS];

const PAGE_SIZE = 10;

const METHOD_LABELS = {
  CASH: "Dinheiro",
  CARD: "Cartão",
  TRANSFER: "Transferência",
  OTHER: "Outro"
};

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

function getMethodLabel(method) {
  return METHOD_LABELS[method] ?? String(method ?? "").replace(/_/g, " ");
}

function getMethodClass(method) {
  return String(method || "unknown").toLowerCase();
}

export default function PaymentListPage() {
  const navigate = useNavigate();
  const { selectedFacilityId } = useFacility();
  const { hasPermission } = usePermissions();

  const [methodFilter, setMethodFilter] = useState("");

  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({
    count: 0,
    page: 1,
    pageSize: PAGE_SIZE,
    next: null,
    previous: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [deletingIds, setDeletingIds] = useState(new Set());

  const canView = hasPermission("billing.view_invoice");
  const canDelete = hasPermission("billing.delete_invoice");

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
    pagination.count === 0
      ? 0
      : Math.min(pagination.page * pagination.pageSize, pagination.count);

  const fetchPayments = async ({ page = 1 } = {}) => {
    if (!selectedFacilityId || !canView) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await paymentsAPI.list(selectedFacilityId, {
        method: methodFilter || undefined,
        page,
        page_size: PAGE_SIZE
      });
      setPayments(response.results);
      setPagination({
        count: response.count,
        page: response.page,
        pageSize: response.pageSize || PAGE_SIZE,
        next: response.next,
        previous: response.previous
      });
    } catch {
      setLoadError("Não foi possível carregar os pagamentos. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments({ page: 1 });
  }, [selectedFacilityId, methodFilter, canView]);

  const handleDelete = async (payment) => {
    if (!canDelete || deletingIds.has(payment.id)) return;
    if (!window.confirm(`Excluir pagamento #${payment.id}?`)) return;

    setDeletingIds((prev) => new Set(prev).add(payment.id));
    try {
      await paymentsAPI.delete(selectedFacilityId, payment.id);
      await fetchPayments({ page: pagination.page });
    } catch {
      setLoadError("Não foi possível excluir o pagamento. Tente novamente.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(payment.id);
        return next;
      });
    }
  };

  const handleViewInvoice = (invoiceId) => {
    navigate(`/invoices/${invoiceId}`);
  };

  if (!canView) {
    return (
      <main className="payments-page">
        <header className="payments-header">
          <div>
            <Breadcrumb items={[{ label: "Pagamentos" }]} />
            <p className="payments-subtitle">Você não tem permissão de acesso aos pagamentos.</p>
          </div>
        </header>
      </main>
    );
  }

  return (
    <main className="payments-page">
      <header className="payments-header">
        <div>
          <Breadcrumb items={[{ label: "Pagamentos" }]} />
          <p className="payments-subtitle">Histórico de pagamentos registrados.</p>
        </div>
      </header>

      {loadError && <div className="payments-alert payments-alert--error">{loadError}</div>}

      <div className="payments-table-wrapper">
        <div className="payments-table-toolbar">
          <span className="payments-table-title">Pagamentos</span>
          <div className="payments-table-actions">
            <select
              className="payments-table-filter"
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            >
              {FILTER_METHOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <table className="payments-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Fatura</th>
              <th>Valor</th>
              <th>Método</th>
              <th>ID Transação</th>
              <th>Data</th>
              <th className="payments-actions-header">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="payments-empty">
                  Carregando pagamentos…
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="payments-empty">
                  Nenhum pagamento encontrado.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{payment.id}</td>
                  <td>
                    <button
                      className="payments-link-button"
                      onClick={() => handleViewInvoice(payment.invoice)}
                      title="Ver fatura"
                    >
                      #{payment.invoice}
                    </button>
                  </td>
                  <td>{formatCurrency(payment.amount)}</td>
                  <td>
                    <span
                      className={`payments-method payments-method--${getMethodClass(payment.method)}`}
                    >
                      {getMethodLabel(payment.method)}
                    </span>
                  </td>
                  <td>{payment.transaction_id || "—"}</td>
                  <td>{formatDate(payment.payment_date ?? payment.created_at)}</td>
                  <td>
                    <div className="payments-actions">
                      <button
                        className="payments-icon-button"
                        onClick={() => handleViewInvoice(payment.invoice)}
                        title="Ver fatura"
                        aria-label={`Ver fatura #${payment.invoice}`}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      {canDelete && (
                        <button
                          className="payments-icon-button payments-icon-button--danger"
                          onClick={() => handleDelete(payment)}
                          disabled={deletingIds.has(payment.id)}
                          title="Excluir"
                          aria-label={`Excluir pagamento #${payment.id}`}
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

        <div className="payments-table-footer">
          <span>
            {pagination.count === 0
              ? "Nenhum registro"
              : `Exibindo ${showingFrom}–${showingTo} de ${pagination.count}`}
          </span>

          {totalPages > 1 && (
            <div className="payments-pagination">
              <button
                className="payments-page-btn"
                onClick={() => fetchPayments({ page: pagination.page - 1 })}
                disabled={!pagination.previous || isLoading}
                aria-label="Página anterior"
              >
                ‹
              </button>
              {visiblePages.map((p) => (
                <button
                  key={p}
                  className={`payments-page-btn ${p === pagination.page ? "payments-page-btn--active" : ""}`}
                  onClick={() => fetchPayments({ page: p })}
                  disabled={isLoading}
                >
                  {p}
                </button>
              ))}
              <button
                className="payments-page-btn"
                onClick={() => fetchPayments({ page: pagination.page + 1 })}
                disabled={!pagination.next || isLoading}
                aria-label="Próxima página"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
