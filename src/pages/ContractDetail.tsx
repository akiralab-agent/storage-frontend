import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { contractsApi } from "@/api/contracts";
import type { Contract, ContractStatus, ContractPayload } from "@/api/contracts";
import { tenantsApi } from "@/api/tenants";
import type { Tenant } from "@/api/tenants";
import { unitsApi } from "@/api/units";
import type { UnitRecord } from "@/api/units";
import "@/pages/ContractDetail.css";

const STATUS_OPTIONS: { value: ContractStatus; label: string; color: string }[] = [
  { value: "DRAFT", label: "Draft", color: "#64748b" },
  { value: "ACTIVE", label: "Active", color: "#22c55e" },
  { value: "CLOSED", label: "Closed", color: "#3b82f6" },
  { value: "CANCELED", label: "Canceled", color: "#ef4444" }
];

const WRITE_ROLES = ["admin", "admin_corporativo", "gerente"];

type ContractFormValues = {
  move_in: string;
  move_out: string;
  terms: string;
  status: ContractStatus;
  audit_reference_id: string;
  billing_reference_id: string;
};

function getStatusLabel(status: ContractStatus): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
}

function getStatusColor(status: ContractStatus): string {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color ?? "#64748b";
}

function formatDateTime(dateString: string | null): string {
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

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const userRoles = useUserRoles();
  const canWrite = userRoles.some((role) => WRITE_ROLES.includes(role));

  const [contract, setContract] = useState<Contract | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [unit, setUnit] = useState<UnitRecord | null>(null);
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
  } = useForm<ContractFormValues>();

  const canTransitionToStatus = (newStatus: ContractStatus): boolean => {
    if (!contract) return true;
    const current = contract.status;
    if (current === "CLOSED" || current === "CANCELED") return false;
    if (current === "DRAFT" && newStatus === "ACTIVE") return true;
    if (current === "ACTIVE" && (newStatus === "CLOSED" || newStatus === "CANCELED")) return true;
    if (current === newStatus) return true;
    return false;
  };

  const isTerminalStatus = contract?.status === "CLOSED" || contract?.status === "CANCELED";

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!id) {
        setLoadError("Contract ID is required.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const contractData = await contractsApi.get(parseInt(id, 10));

        if (!isMounted) return;

        setContract(contractData);

        reset({
          move_in: contractData.move_in,
          move_out: contractData.move_out || "",
          terms: contractData.terms || "",
          status: contractData.status,
          audit_reference_id: contractData.audit_reference_id || "",
          billing_reference_id: contractData.billing_reference_id || ""
        });

        try {
          const [tenantData, unitData] = await Promise.all([
            tenantsApi.get(contractData.tenant),
            unitsApi.list()
          ]);
          
          if (!isMounted) return;
          
          setTenant(tenantData);
          const unitRecord = unitData.find((u) => u.id === contractData.unit);
          setUnit(unitRecord || null);
        } catch {
          // Silently fail - tenant/unit info is optional
        }
      } catch (error) {
        if (!isMounted) return;

        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setLoadError("Contract not found.");
        } else {
          setLoadError("Unable to load contract details. Please try again.");
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

  const onSubmit = async (values: ContractFormValues) => {
    if (!contract) return;

    if (!canTransitionToStatus(values.status)) {
      setFormError(`Invalid status transition from ${contract.status} to ${values.status}.`);
      return;
    }

    setFormError(null);
    setPageSuccess(null);

    const payload: Partial<ContractPayload> = {
      move_in: values.move_in,
      move_out: values.move_out || null,
      terms: values.terms || null,
      status: values.status,
      audit_reference_id: values.audit_reference_id || undefined,
      billing_reference_id: values.billing_reference_id || undefined
    };

    setIsSaving(true);

    try {
      await contractsApi.update(contract.id, payload);
      const updatedContract = await contractsApi.get(contract.id);
      setContract(updatedContract);
      reset(values);
      setPageSuccess("Contract updated successfully.");
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

  const handleDelete = async () => {
    if (!contract) return;

    setIsDeleting(true);
    setFormError(null);

    try {
      await contractsApi.delete(contract.id);
      navigate("/contracts");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        navigate("/contracts");
        return;
      }
      setFormError("Unable to delete contract. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleBack = () => {
    navigate("/contracts");
  };

  const handleViewTenant = () => {
    if (contract) {
      navigate(`/tenants/${contract.tenant}`);
    }
  };

  if (isLoading) {
    return (
      <main className="contract-detail-page">
        <div className="contract-detail-loading">Loading contract details...</div>
      </main>
    );
  }

  if (loadError && !contract) {
    return (
      <main className="contract-detail-page">
        <div className="contract-detail-error-state">
          <p>{loadError}</p>
          <button type="button" className="contract-detail-button" onClick={handleBack}>
            Back to Contracts
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="contract-detail-page">
      <header className="contract-detail-header">
        <div className="contract-detail-header__left">
          <button type="button" className="contract-detail-back" onClick={handleBack}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
          <div>
            <h1>Contract #{contract?.id}</h1>
            <div className="contract-detail-meta">
              <span
                className="contract-detail-status"
                style={{
                  backgroundColor: `${getStatusColor(contract?.status ?? "DRAFT")}15`,
                  color: getStatusColor(contract?.status ?? "DRAFT")
                }}
              >
                {getStatusLabel(contract?.status ?? "DRAFT")}
              </span>
            </div>
          </div>
        </div>
        <div className="contract-detail-header__actions">
          {tenant && (
            <button type="button" className="contract-detail-secondary" onClick={handleViewTenant}>
              View Tenant
            </button>
          )}
        </div>
      </header>

      {pageSuccess && (
        <div className="contract-detail-alert contract-detail-alert--success">{pageSuccess}</div>
      )}
      {formError && (
        <div className="contract-detail-alert contract-detail-alert--error">{formError}</div>
      )}

      <div className="contract-detail-content">
        <form className="contract-detail-form" onSubmit={handleSubmit(onSubmit)}>
          <section className="contract-detail-section">
            <h2>Parties</h2>
            <div className="contract-detail-grid">
              <div className="contract-detail-field contract-detail-field--readonly">
                <span>Tenant</span>
                <div className="contract-detail-readonly-value">
                  {tenant ? `${tenant.first_name} ${tenant.last_name}` : `Tenant #${contract?.tenant}`}
                </div>
              </div>

              <div className="contract-detail-field contract-detail-field--readonly">
                <span>Unit</span>
                <div className="contract-detail-readonly-value">
                  {unit ? unit.unit_number : `Unit #${contract?.unit}`}
                </div>
              </div>
            </div>
          </section>

          <section className="contract-detail-section">
            <h2>Dates</h2>
            <div className="contract-detail-grid">
              <label className="contract-detail-field">
                <span>Move In *</span>
                <input
                  type="date"
                  {...register("move_in", { required: "Move in date is required." })}
                  className={
                    errors.move_in
                      ? "contract-detail-input contract-detail-input--error"
                      : "contract-detail-input"
                  }
                  disabled={!canWrite || isTerminalStatus}
                />
                {errors.move_in && (
                  <span className="contract-detail-error">{errors.move_in.message}</span>
                )}
              </label>

              <label className="contract-detail-field">
                <span>Move Out</span>
                <input
                  type="date"
                  {...register("move_out")}
                  className="contract-detail-input"
                  disabled={!canWrite || isTerminalStatus}
                />
              </label>
            </div>
          </section>

          <section className="contract-detail-section">
            <h2>Contract Details</h2>
            <label className="contract-detail-field">
              <span>Terms</span>
              <textarea
                {...register("terms")}
                className="contract-detail-input contract-detail-textarea"
                rows={4}
                disabled={!canWrite || isTerminalStatus}
              />
            </label>

            <label className="contract-detail-field">
              <span>Status *</span>
              <select
                {...register("status", { required: "Status is required." })}
                className={
                  errors.status
                    ? "contract-detail-input contract-detail-input--error"
                    : "contract-detail-input"
                }
                disabled={!canWrite || isTerminalStatus}
              >
                {STATUS_OPTIONS.map((opt) => {
                  const disabled = !canTransitionToStatus(opt.value);
                  return (
                    <option key={opt.value} value={opt.value} disabled={disabled}>
                      {opt.label}
                      {disabled && contract && opt.value !== contract.status
                        ? ` (not allowed from ${contract.status})`
                        : ""}
                    </option>
                  );
                })}
              </select>
              {isTerminalStatus && (
                <span className="contract-detail-hint">
                  Terminal status - no further transitions allowed.
                </span>
              )}
              {errors.status && (
                <span className="contract-detail-error">{errors.status.message}</span>
              )}
            </label>
          </section>

          <section className="contract-detail-section">
            <h2>References</h2>
            <div className="contract-detail-grid">
              <label className="contract-detail-field">
                <span>Audit Reference ID</span>
                <input
                  type="text"
                  {...register("audit_reference_id")}
                  className="contract-detail-input"
                  disabled={!canWrite || isTerminalStatus}
                />
              </label>

              <label className="contract-detail-field">
                <span>Billing Reference ID</span>
                <input
                  type="text"
                  {...register("billing_reference_id")}
                  className="contract-detail-input"
                  disabled={!canWrite || isTerminalStatus}
                />
              </label>
            </div>
          </section>

          <section className="contract-detail-section contract-detail-section--meta">
            <h2>Metadata</h2>
            <div className="contract-detail-meta-grid">
              <div className="contract-detail-meta-item">
                <span className="contract-detail-meta-label">Facility</span>
                <span className="contract-detail-meta-value">{contract?.facility}</span>
              </div>
              <div className="contract-detail-meta-item">
                <span className="contract-detail-meta-label">Created</span>
                <span className="contract-detail-meta-value">
                  {formatDateTime(contract?.created_at ?? null)}
                </span>
              </div>
              <div className="contract-detail-meta-item">
                <span className="contract-detail-meta-label">Updated</span>
                <span className="contract-detail-meta-value">
                  {formatDateTime(contract?.updated_at ?? null)}
                </span>
              </div>
              <div className="contract-detail-meta-item">
                <span className="contract-detail-meta-label">Signed At</span>
                <span className="contract-detail-meta-value">
                  {formatDateTime(contract?.signed_at ?? null)}
                </span>
              </div>
            </div>
          </section>

          {canWrite && (
            <div className="contract-detail-actions">
              <button
                type="button"
                className="contract-detail-button contract-detail-button--danger"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isTerminalStatus}
              >
                Delete Contract
              </button>
              <div className="contract-detail-actions__right">
                <button type="button" className="contract-detail-button" onClick={handleBack}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="contract-detail-primary"
                  disabled={isSaving || !isDirty || isTerminalStatus}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {showDeleteConfirm && (
        <div className="contract-detail-modal" role="dialog" aria-modal="true">
          <div
            className="contract-detail-modal__overlay"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="contract-detail-modal__panel" ref={modalPanelRef}>
            <h2>Delete Contract</h2>
            <p>
              Are you sure you want to delete contract <strong>#{contract?.id}</strong>? This action
              cannot be undone.
            </p>
            <div className="contract-detail-modal__actions">
              <button
                type="button"
                className="contract-detail-button"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="contract-detail-button contract-detail-button--danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Contract"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}