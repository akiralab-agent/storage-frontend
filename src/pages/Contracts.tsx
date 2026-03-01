import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { contractsApi } from "@/api/contracts";
import type { Contract, ContractStatus, ContractPayload } from "@/api/contracts";
import { tenantsApi } from "@/api/tenants";
import type { Tenant } from "@/api/tenants";
import { unitsApi } from "@/api/units";
import type { UnitRecord } from "@/api/units";
import "@/pages/Contracts.css";

const STATUS_OPTIONS: { value: ContractStatus; label: string; color: string }[] = [
  { value: "DRAFT", label: "Draft", color: "#64748b" },
  { value: "ACTIVE", label: "Active", color: "#22c55e" },
  { value: "CLOSED", label: "Closed", color: "#3b82f6" },
  { value: "CANCELED", label: "Canceled", color: "#ef4444" }
];

const WRITE_ROLES = ["admin", "admin_corporativo", "gerente"];

type ContractFormValues = {
  tenant: string;
  unit: string;
  move_in: string;
  move_out: string;
  terms: string;
  status: ContractStatus;
  audit_reference_id: string;
  billing_reference_id: string;
};

const DEFAULT_FORM_VALUES: ContractFormValues = {
  tenant: "",
  unit: "",
  move_in: "",
  move_out: "",
  terms: "",
  status: "DRAFT",
  audit_reference_id: "",
  billing_reference_id: ""
};

function getStatusLabel(status: ContractStatus): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

function getStatusColor(status: ContractStatus): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "#64748b";
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

function useUserRoles(): string[] {
  const stored = localStorage.getItem("user");
  if (stored) {
    try {
      const user = JSON.parse(stored);
      return user.roles || [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function ContractsPage() {
  const navigate = useNavigate();
  const userRoles = useUserRoles();
  const canWrite = userRoles.some((role) => WRITE_ROLES.includes(role));

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const modalPanelRef = useRef<HTMLDivElement | null>(null);
  const modalFirstInputRef = useRef<HTMLSelectElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ContractFormValues>({
    defaultValues: DEFAULT_FORM_VALUES
  });

  const currentContractStatus = editingContract?.status;

  const canTransitionToStatus = (newStatus: ContractStatus): boolean => {
    if (!editingContract) return true;
    const current = editingContract.status;
    if (current === "CLOSED" || current === "CANCELED") return false;
    if (current === "DRAFT" && newStatus === "ACTIVE") return true;
    if (current === "ACTIVE" && (newStatus === "CLOSED" || newStatus === "CANCELED")) return true;
    if (current === newStatus) return true;
    return false;
  };

  const filteredContracts = useMemo(() => {
    if (!statusFilter) return contracts;
    return contracts.filter((contract) => contract.status === statusFilter);
  }, [contracts, statusFilter]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [contractList, tenantList, unitList] = await Promise.all([
          contractsApi.list(),
          tenantsApi.list(),
          unitsApi.list()
        ]);

        if (!isMounted) return;

        setContracts(contractList);
        setTenants(tenantList);
        setUnits(unitList);
      } catch {
        if (!isMounted) return;
        setLoadError("Unable to load contracts. Please try again.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshContracts = async () => {
    const contractList = await contractsApi.list();
    setContracts(contractList);
  };

  const openCreateModal = () => {
    if (!canWrite) return;
    setEditingContract(null);
    reset(DEFAULT_FORM_VALUES);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (contract: Contract) => {
    if (!canWrite) return;
    setEditingContract(contract);
    reset({
      tenant: String(contract.tenant),
      unit: String(contract.unit),
      move_in: contract.move_in,
      move_out: contract.move_out || "",
      terms: contract.terms || "",
      status: contract.status,
      audit_reference_id: contract.audit_reference_id || "",
      billing_reference_id: contract.billing_reference_id || ""
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingContract(null);
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

  const onSubmit = async (values: ContractFormValues) => {
    setFormError(null);
    setPageSuccess(null);

    if (editingContract && !canTransitionToStatus(values.status)) {
      setFormError(`Invalid status transition from ${editingContract.status} to ${values.status}.`);
      return;
    }

    const payload: ContractPayload = {
      tenant: parseInt(values.tenant, 10),
      unit: parseInt(values.unit, 10),
      move_in: values.move_in,
      move_out: values.move_out || null,
      terms: values.terms || null,
      status: values.status,
      audit_reference_id: values.audit_reference_id || undefined,
      billing_reference_id: values.billing_reference_id || undefined
    };

    setIsSaving(true);

    try {
      const successMessage = editingContract
        ? "Contract updated successfully."
        : "Contract created successfully.";

      if (editingContract) {
        await contractsApi.update(editingContract.id, payload);
      } else {
        await contractsApi.create(payload);
      }

      await refreshContracts();
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
          setFormError(messages || "Unable to save contract. Please check the form and try again.");
        } else {
          setFormError("Unable to save contract. Please check the form and try again.");
        }
      } else {
        setFormError("Unexpected error while saving contract.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (contract: Contract) => {
    if (!canWrite || deletingIds.has(contract.id)) return;

    if (!window.confirm(`Delete contract #${contract.id}?`)) return;

    try {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.add(contract.id);
        return next;
      });
      await contractsApi.delete(contract.id);
      await refreshContracts();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        await refreshContracts();
        return;
      }
      setLoadError("Unable to delete contract. Please try again.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(contract.id);
        return next;
      });
    }
  };

  const handleViewDetail = (contract: Contract) => {
    navigate(`/contracts/${contract.id}`);
  };

  const getTenantName = (tenantId: number): string => {
    const tenant = tenants.find((t) => t.id === tenantId);
    return tenant ? `${tenant.first_name} ${tenant.last_name}` : `Tenant #${tenantId}`;
  };

  const getUnitNumber = (unitId: number): string => {
    const unit = units.find((u) => u.id === unitId);
    return unit ? unit.unit_number : `Unit #${unitId}`;
  };

  return (
    <main className="contracts-page">
      <header className="contracts-header">
        <div>
          <h1>Contracts</h1>
          <p className="contracts-subtitle">Manage lease contracts for the facility.</p>
        </div>
        {canWrite && (
          <button type="button" className="contracts-primary" onClick={openCreateModal}>
            New Contract
          </button>
        )}
      </header>

      {loadError && <div className="contracts-alert contracts-alert--error">{loadError}</div>}
      {pageSuccess && <div className="contracts-alert contracts-alert--success">{pageSuccess}</div>}

      {isLoading ? (
        <div className="contracts-empty">Loading contracts...</div>
      ) : contracts.length === 0 ? (
        <div className="contracts-empty">
          No contracts found. Create the first contract to get started.
        </div>
      ) : (
        <div className="contracts-table-wrapper">
          <div className="contracts-table-toolbar">
            <select
              className="contracts-table-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ContractStatus | "")}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <table className="contracts-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Tenant</th>
                <th>Unit</th>
                <th>Move In</th>
                <th>Move Out</th>
                <th>Status</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((contract) => (
                <tr key={contract.id}>
                  <td>
                    <button
                      type="button"
                      className="contracts-name-link"
                      onClick={() => handleViewDetail(contract)}
                    >
                      #{contract.id}
                    </button>
                  </td>
                  <td>{getTenantName(contract.tenant)}</td>
                  <td>{getUnitNumber(contract.unit)}</td>
                  <td>{formatDate(contract.move_in)}</td>
                  <td>{formatDate(contract.move_out)}</td>
                  <td>
                    <span
                      className="contracts-status-badge"
                      style={{
                        backgroundColor: `${getStatusColor(contract.status)}15`,
                        color: getStatusColor(contract.status)
                      }}
                    >
                      {getStatusLabel(contract.status)}
                    </span>
                  </td>
                  <td>{formatDate(contract.created_at)}</td>
                  <td>
                    <div className="contracts-actions">
                      {canWrite && (
                        <button
                          type="button"
                          className="contracts-icon-button"
                          onClick={() => openEditModal(contract)}
                          aria-label="Edit contract"
                          title="Edit"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 21h6l12-12a2.1 2.1 0 0 0-3-3L6 18l-3 3z" />
                          </svg>
                        </button>
                      )}
                      {canWrite && (
                        <button
                          type="button"
                          className="contracts-icon-button contracts-icon-button--danger"
                          onClick={() => handleDelete(contract)}
                          disabled={deletingIds.has(contract.id)}
                          aria-label="Delete contract"
                          title="Delete"
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
              ))}
            </tbody>
          </table>
          <div className="contracts-table-footer">
            Showing {filteredContracts.length === 0 ? 0 : 1} to {filteredContracts.length} of{" "}
            {contracts.length} entries
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          className="contracts-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="contracts-modal-title"
        >
          <div className="contracts-modal__overlay" onClick={closeModal} />
          <div className="contracts-modal__panel" ref={modalPanelRef}>
            <div className="contracts-modal__header">
              <div>
                <h2 id="contracts-modal-title">
                  {editingContract ? "Edit Contract" : "New Contract"}
                </h2>
                <p className="contracts-subtitle">
                  {editingContract
                    ? "Update contract information."
                    : "Create a new lease contract."}
                </p>
              </div>
              <button type="button" className="contracts-button" onClick={closeModal}>
                Close
              </button>
            </div>

            <form className="contracts-form" onSubmit={handleSubmit(onSubmit)}>
              <div className="contracts-form-grid">
                <label className="contracts-field">
                  <span>Tenant *</span>
                  <select
                    {...register("tenant", { required: "Tenant is required." })}
                    className={
                      errors.tenant ? "contracts-input contracts-input--error" : "contracts-input"
                    }
                    ref={(node) => {
                      if (!editingContract) {
                        modalFirstInputRef.current = node;
                      }
                    }}
                    disabled={!!editingContract}
                  >
                    <option value="">Select a tenant</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.first_name} {t.last_name}
                      </option>
                    ))}
                  </select>
                  {errors.tenant && (
                    <span className="contracts-error">{errors.tenant.message}</span>
                  )}
                </label>

                <label className="contracts-field">
                  <span>Unit *</span>
                  <select
                    {...register("unit", { required: "Unit is required." })}
                    className={
                      errors.unit ? "contracts-input contracts-input--error" : "contracts-input"
                    }
                    disabled={!!editingContract}
                  >
                    <option value="">Select a unit</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.unit_number}
                      </option>
                    ))}
                  </select>
                  {errors.unit && <span className="contracts-error">{errors.unit.message}</span>}
                </label>
              </div>

              <div className="contracts-form-grid">
                <label className="contracts-field">
                  <span>Move In *</span>
                  <input
                    type="date"
                    {...register("move_in", { required: "Move in date is required." })}
                    className={
                      errors.move_in ? "contracts-input contracts-input--error" : "contracts-input"
                    }
                  />
                  {errors.move_in && (
                    <span className="contracts-error">{errors.move_in.message}</span>
                  )}
                </label>

                <label className="contracts-field">
                  <span>Move Out</span>
                  <input type="date" {...register("move_out")} className="contracts-input" />
                </label>
              </div>

              <label className="contracts-field">
                <span>Terms</span>
                <textarea
                  {...register("terms")}
                  className="contracts-input contracts-textarea"
                  rows={3}
                />
              </label>

              <label className="contracts-field">
                <span>Status *</span>
                <select
                  {...register("status", { required: "Status is required." })}
                  className={
                    errors.status ? "contracts-input contracts-input--error" : "contracts-input"
                  }
                >
                  {STATUS_OPTIONS.map((opt) => {
                    const disabled = editingContract && !canTransitionToStatus(opt.value);
                    return (
                      <option key={opt.value} value={opt.value} disabled={disabled}>
                        {opt.label}
                        {disabled ? ` (not allowed from ${currentContractStatus})` : ""}
                      </option>
                    );
                  })}
                </select>
                {editingContract &&
                  (currentContractStatus === "CLOSED" || currentContractStatus === "CANCELED") && (
                    <span className="contracts-hint">
                      Terminal status - no transitions allowed.
                    </span>
                  )}
                {errors.status && <span className="contracts-error">{errors.status.message}</span>}
              </label>

              <div className="contracts-form-grid">
                <label className="contracts-field">
                  <span>Audit Reference ID</span>
                  <input
                    type="text"
                    {...register("audit_reference_id")}
                    className="contracts-input"
                  />
                </label>

                <label className="contracts-field">
                  <span>Billing Reference ID</span>
                  <input
                    type="text"
                    {...register("billing_reference_id")}
                    className="contracts-input"
                  />
                </label>
              </div>

              {formError && (
                <div className="contracts-alert contracts-alert--error">{formError}</div>
              )}

              <div className="contracts-form__actions">
                <button type="button" className="contracts-button" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="contracts-primary" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingContract ? "Update Contract" : "Create Contract"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
