import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "@/api/client";
import "@/pages/LeadDetail.css";

const STAGE_OPTIONS = [
  { value: "NEW", label: "New", color: "#3b82f6" },
  { value: "CONTACTED", label: "Contacted", color: "#8b5cf6" },
  { value: "QUALIFIED", label: "Qualified", color: "#f59e0b" },
  { value: "PROPOSAL", label: "Proposal", color: "#06b6d4" },
  { value: "WON", label: "Won", color: "#10b981" },
  { value: "LOST", label: "Lost", color: "#ef4444" }
];

const SOURCE_OPTIONS = [
  { value: "WEBSITE", label: "Website" },
  { value: "REFERRAL", label: "Referral" },
  { value: "PHONE", label: "Phone" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "CAMPAIGN", label: "Campaign" },
  { value: "OTHER", label: "Other" }
];

type Lead = {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_primary: string | null;
  phone_secondary: string | null;
  source: string | null;
  stage: string;
  owner_id: number | null;
  owner?: { id: number; name: string; email: string } | null;
  converted_tenant: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Owner = {
  id: number;
  name: string;
  email: string;
};

type LeadFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  phone_primary: string;
  phone_secondary: string;
  source: string;
  stage: string;
  owner_id: string;
  notes: string;
};

function getStageLabel(stage: string): string {
  return STAGE_OPTIONS.find((s) => s.value === stage)?.label ?? stage;
}

function getStageColor(stage: string): string {
  return STAGE_OPTIONS.find((s) => s.value === stage)?.color ?? "#64748b";
}

function getSourceLabel(source: string | null): string {
  if (!source) return "-";
  return SOURCE_OPTIONS.find((s) => s.value === source)?.label ?? source;
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

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
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
  } = useForm<LeadFormValues>();

  const isWon = useMemo(() => lead?.stage === "WON", [lead?.stage]);
  const isConverted = useMemo(() => lead?.converted_tenant !== null, [lead?.converted_tenant]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!id) {
        setLoadError("Lead ID is required.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const [leadResponse, ownersResponse] = await Promise.all([
          apiClient.get(`/api/v1/leads/${id}/`),
          apiClient.get("/api/v1/users/")
        ]);

        if (!isMounted) {
          return;
        }

        const leadData = leadResponse.data as Lead;
        const ownerList = ownersResponse.data?.results ?? ownersResponse.data ?? [];

        setLead(leadData);
        setOwners(Array.isArray(ownerList) ? ownerList : []);

        reset({
          first_name: leadData.first_name,
          last_name: leadData.last_name,
          email: leadData.email ?? "",
          phone_primary: leadData.phone_primary ?? "",
          phone_secondary: leadData.phone_secondary ?? "",
          source: leadData.source ?? "",
          stage: leadData.stage,
          owner_id: leadData.owner_id ? String(leadData.owner_id) : "",
          notes: leadData.notes ?? ""
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setLoadError("Lead not found.");
        } else {
          setLoadError("Unable to load lead details. Please try again.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [id, reset]);

  useEffect(() => {
    if (!showDeleteConfirm) {
      return;
    }

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setShowDeleteConfirm(false);
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [showDeleteConfirm]);

  const onSubmit = async (values: LeadFormValues) => {
    if (!lead) return;

    setFormError(null);
    setPageSuccess(null);

    const payload = {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email || null,
      phone_primary: values.phone_primary || null,
      phone_secondary: values.phone_secondary || null,
      source: values.source || null,
      stage: values.stage,
      owner_id: values.owner_id ? parseInt(values.owner_id, 10) : null,
      notes: values.notes || null
    };

    setIsSaving(true);

    try {
      await apiClient.patch(`/api/v1/leads/${lead.id}/`, payload);
      const response = await apiClient.get(`/api/v1/leads/${lead.id}/`);
      setLead(response.data);
      reset(values);
      setPageSuccess("Lead updated successfully.");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        if (errorData && typeof errorData === "object") {
          const messages = Object.entries(errorData)
            .map(([field, errors]) => {
              if (Array.isArray(errors)) {
                return `${field}: ${errors.join(", ")}`;
              }
              return `${field}: ${errors}`;
            })
            .join("; ");
          setFormError(messages || "Unable to save lead. Please check the form and try again.");
        } else {
          setFormError("Unable to save lead. Please check the form and try again.");
        }
      } else {
        setFormError("Unexpected error while saving lead.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!lead) return;

    setIsDeleting(true);
    setFormError(null);

    try {
      await apiClient.delete(`/api/v1/leads/${lead.id}/`);
      navigate("/leads");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        navigate("/leads");
        return;
      }
      setFormError("Unable to delete lead. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleConvert = () => {
    if (!lead) return;
    navigate(`/leads/${lead.id}/convert`);
  };

  const handleViewTenant = () => {
    if (!lead?.converted_tenant) return;
    navigate(`/tenants/${lead.converted_tenant}`);
  };

  const handleBack = () => {
    navigate("/leads");
  };

  if (isLoading) {
    return (
      <main className="lead-detail-page">
        <div className="lead-detail-loading">Loading lead details...</div>
      </main>
    );
  }

  if (loadError && !lead) {
    return (
      <main className="lead-detail-page">
        <div className="lead-detail-error">
          <p>{loadError}</p>
          <button type="button" className="lead-detail-button" onClick={handleBack}>
            Back to Leads
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="lead-detail-page">
      <header className="lead-detail-header">
        <div className="lead-detail-header__left">
          <button type="button" className="lead-detail-back" onClick={handleBack}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
          <div>
            <h1>
              {lead?.first_name} {lead?.last_name}
            </h1>
            <div className="lead-detail-meta">
              <span
                className="lead-detail-stage"
                style={{
                  backgroundColor: `${getStageColor(lead?.stage ?? "")}15`,
                  color: getStageColor(lead?.stage ?? "")
                }}
              >
                {getStageLabel(lead?.stage ?? "")}
              </span>
              {isConverted && (
                <span className="lead-detail-converted">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Converted to Tenant
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="lead-detail-header__actions">
          {isWon && !isConverted && (
            <button type="button" className="lead-detail-primary" onClick={handleConvert}>
              Convert to Tenant
            </button>
          )}
          {isConverted && lead?.converted_tenant && (
            <button type="button" className="lead-detail-secondary" onClick={handleViewTenant}>
              View Tenant
            </button>
          )}
        </div>
      </header>

      {pageSuccess && <div className="lead-detail-alert lead-detail-alert--success">{pageSuccess}</div>}
      {formError && <div className="lead-detail-alert lead-detail-alert--error">{formError}</div>}

      <div className="lead-detail-content">
        <form className="lead-detail-form" onSubmit={handleSubmit(onSubmit)}>
          <section className="lead-detail-section">
            <h2>Contact Information</h2>
            <div className="lead-detail-grid">
              <label className="lead-detail-field">
                <span>First Name *</span>
                <input
                  type="text"
                  {...register("first_name", { required: "First name is required." })}
                  className={errors.first_name ? "lead-detail-input lead-detail-input--error" : "lead-detail-input"}
                />
                {errors.first_name && (
                  <span className="lead-detail-error">{errors.first_name.message}</span>
                )}
              </label>

              <label className="lead-detail-field">
                <span>Last Name *</span>
                <input
                  type="text"
                  {...register("last_name", { required: "Last name is required." })}
                  className={errors.last_name ? "lead-detail-input lead-detail-input--error" : "lead-detail-input"}
                />
                {errors.last_name && (
                  <span className="lead-detail-error">{errors.last_name.message}</span>
                )}
              </label>

              <label className="lead-detail-field">
                <span>Email</span>
                <input
                  type="email"
                  {...register("email")}
                  className="lead-detail-input"
                />
              </label>

              <label className="lead-detail-field">
                <span>Primary Phone</span>
                <input
                  type="tel"
                  {...register("phone_primary")}
                  className="lead-detail-input"
                />
              </label>

              <label className="lead-detail-field">
                <span>Secondary Phone</span>
                <input
                  type="tel"
                  {...register("phone_secondary")}
                  className="lead-detail-input"
                />
              </label>
            </div>
          </section>

          <section className="lead-detail-section">
            <h2>Sales Information</h2>
            <div className="lead-detail-grid">
              <label className="lead-detail-field">
                <span>Source</span>
                <select {...register("source")} className="lead-detail-input">
                  <option value="">Select source</option>
                  {SOURCE_OPTIONS.map((sourceOption) => (
                    <option key={sourceOption.value} value={sourceOption.value}>
                      {sourceOption.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="lead-detail-field">
                <span>Stage *</span>
                <select
                  {...register("stage", { required: "Stage is required." })}
                  className={errors.stage ? "lead-detail-input lead-detail-input--error" : "lead-detail-input"}
                >
                  {STAGE_OPTIONS.map((stageOption) => (
                    <option key={stageOption.value} value={stageOption.value}>
                      {stageOption.label}
                    </option>
                  ))}
                </select>
                {errors.stage && (
                  <span className="lead-detail-error">{errors.stage.message}</span>
                )}
              </label>

              <label className="lead-detail-field">
                <span>Owner</span>
                <select {...register("owner_id")} className="lead-detail-input">
                  <option value="">Select owner</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.name || owner.email}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="lead-detail-section">
            <h2>Notes</h2>
            <label className="lead-detail-field">
              <textarea
                {...register("notes")}
                className="lead-detail-input lead-detail-textarea"
                rows={4}
                placeholder="Add notes about this lead..."
              />
            </label>
          </section>

          <section className="lead-detail-section lead-detail-section--meta">
            <h2>Metadata</h2>
            <div className="lead-detail-meta-grid">
              <div className="lead-detail-meta-item">
                <span className="lead-detail-meta-label">Created</span>
                <span className="lead-detail-meta-value">{formatDate(lead?.created_at ?? null)}</span>
              </div>
              <div className="lead-detail-meta-item">
                <span className="lead-detail-meta-label">Last Updated</span>
                <span className="lead-detail-meta-value">{formatDate(lead?.updated_at ?? null)}</span>
              </div>
            </div>
          </section>

          <div className="lead-detail-actions">
            <button
              type="button"
              className="lead-detail-button lead-detail-button--danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Lead
            </button>
            <div className="lead-detail-actions__right">
              <button type="button" className="lead-detail-button" onClick={handleBack}>
                Cancel
              </button>
              <button
                type="submit"
                className="lead-detail-primary"
                disabled={isSaving || !isDirty}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {showDeleteConfirm && (
        <div className="lead-detail-modal" role="dialog" aria-modal="true">
          <div className="lead-detail-modal__overlay" onClick={() => setShowDeleteConfirm(false)} />
          <div className="lead-detail-modal__panel" ref={modalPanelRef}>
            <h2>Delete Lead</h2>
            <p>
              Are you sure you want to delete the lead <strong>{lead?.first_name} {lead?.last_name}</strong>?
              This action cannot be undone.
            </p>
            <div className="lead-detail-modal__actions">
              <button
                type="button"
                className="lead-detail-button"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="lead-detail-button lead-detail-button--danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Lead"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}