import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/api/client";
import "@/pages/Leads.css";

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

const DEFAULT_FORM_VALUES: LeadFormValues = {
  first_name: "",
  last_name: "",
  email: "",
  phone_primary: "",
  phone_secondary: "",
  source: "",
  stage: "NEW",
  owner_id: "",
  notes: ""
};

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: T[] }).results;
    if (Array.isArray(results)) {
      return results;
    }
  }

  return [];
}

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

export default function LeadsPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const modalPanelRef = useRef<HTMLDivElement | null>(null);
  const modalFirstInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<LeadFormValues>({
    defaultValues: DEFAULT_FORM_VALUES
  });

  const stageLabelMap = useMemo(() => {
    return new Map(STAGE_OPTIONS.map((stage) => [stage.value, stage.label]));
  }, []);

  const filteredLeads = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return leads.filter((lead) => {
      const fullName = `${lead.first_name} ${lead.last_name}`.toLowerCase();
      const email = (lead.email ?? "").toLowerCase();
      const phone = (lead.phone_primary ?? "").toLowerCase();
      const stageLabel = stageLabelMap.get(lead.stage) ?? lead.stage;

      const matchesStage = !stageFilter || lead.stage === stageFilter;
      const matchesOwner = !ownerFilter || String(lead.owner_id) === ownerFilter;

      if (!normalizedQuery) {
        return matchesStage && matchesOwner;
      }

      const searchable = [fullName, email, phone, stageLabel].join(" ");
      return matchesStage && matchesOwner && searchable.includes(normalizedQuery);
    });
  }, [leads, searchTerm, stageFilter, ownerFilter, stageLabelMap]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [leadsResponse, ownersResponse] = await Promise.all([
          apiClient.get("/api/v1/leads/"),
          apiClient.get("/api/v1/users/")
        ]);

        if (!isMounted) {
          return;
        }

        const leadList = normalizeList<Lead>(leadsResponse.data);
        const ownerList = normalizeList<Owner>(ownersResponse.data);
        setLeads(leadList);
        setOwners(ownerList);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError("Unable to load leads. Please try again.");
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
  }, []);

  const refreshLeads = async () => {
    const response = await apiClient.get("/api/v1/leads/");
    const leadList = normalizeList<Lead>(response.data);
    setLeads(leadList);
  };

  const openCreateModal = () => {
    setEditingLead(null);
    reset(DEFAULT_FORM_VALUES);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    reset({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email ?? "",
      phone_primary: lead.phone_primary ?? "",
      phone_secondary: lead.phone_secondary ?? "",
      source: lead.source ?? "",
      stage: lead.stage,
      owner_id: lead.owner_id ? String(lead.owner_id) : "",
      notes: lead.notes ?? ""
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingLead(null);
    reset(DEFAULT_FORM_VALUES);
  }, [reset]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

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

      if (event.key !== "Tab") {
        return;
      }

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

    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [closeModal, isModalOpen]);

  const onSubmit = async (values: LeadFormValues) => {
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
      const successMessage = editingLead ? "Lead updated successfully." : "Lead created successfully.";

      if (editingLead) {
        await apiClient.patch(`/api/v1/leads/${editingLead.id}/`, payload);
      } else {
        await apiClient.post("/api/v1/leads/", payload);
      }

      await refreshLeads();
      setPageSuccess(successMessage);
      closeModal();
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

  const handleDelete = async (lead: Lead) => {
    if (deletingIds.has(lead.id)) {
      return;
    }

    const fullName = `${lead.first_name} ${lead.last_name}`;

    if (!window.confirm(`Delete lead "${fullName}"?`)) {
      return;
    }

    try {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.add(lead.id);
        return next;
      });
      await apiClient.delete(`/api/v1/leads/${lead.id}/`);
      await refreshLeads();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        await refreshLeads();
        return;
      }

      setLoadError("Unable to delete lead. Please try again.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
    }
  };

  const handleConvert = (lead: Lead) => {
    navigate(`/leads/${lead.id}/convert`);
  };

  const handleViewDetail = (lead: Lead) => {
    navigate(`/leads/${lead.id}`);
  };

  return (
    <main className="leads-page">
      <header className="leads-header">
        <div>
          <h1>Leads</h1>
          <p className="leads-subtitle">Manage your sales pipeline and track opportunities.</p>
        </div>
        <button type="button" className="leads-primary" onClick={openCreateModal}>
          New Lead
        </button>
      </header>

      {loadError && <div className="leads-alert leads-alert--error">{loadError}</div>}
      {pageSuccess && <div className="leads-alert leads-alert--success">{pageSuccess}</div>}

      {isLoading ? (
        <div className="leads-empty">Loading leads...</div>
      ) : leads.length === 0 ? (
        <div className="leads-empty">No leads found. Create the first lead to get started.</div>
      ) : (
        <div className="leads-table-wrapper">
          <div className="leads-table-toolbar">
            <select
              className="leads-table-filter"
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value)}
            >
              <option value="">All stages</option>
              {STAGE_OPTIONS.map((stageOption) => (
                <option key={stageOption.value} value={stageOption.value}>
                  {stageOption.label}
                </option>
              ))}
            </select>
            <select
              className="leads-table-filter"
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value)}
            >
              <option value="">All owners</option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name || owner.email}
                </option>
              ))}
            </select>
            <label className="leads-search">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.65" y1="16.65" x2="21" y2="21" />
              </svg>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search leads..."
                aria-label="Search leads"
              />
            </label>
          </div>
          <table className="leads-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Source</th>
                <th>Stage</th>
                <th>Owner</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
                const ownerName = lead.owner?.name || lead.owner?.email || "-";
                const isWon = lead.stage === "WON";
                const isConverted = lead.converted_tenant !== null;

                return (
                  <tr key={lead.id}>
                    <td>
                      <button
                        type="button"
                        className="leads-name-link"
                        onClick={() => handleViewDetail(lead)}
                      >
                        {lead.first_name} {lead.last_name}
                      </button>
                    </td>
                    <td>{lead.email || "-"}</td>
                    <td>{lead.phone_primary || "-"}</td>
                    <td>{getSourceLabel(lead.source)}</td>
                    <td>
                      <span
                        className="leads-stage-badge"
                        style={{
                          backgroundColor: `${getStageColor(lead.stage)}15`,
                          color: getStageColor(lead.stage)
                        }}
                      >
                        {getStageLabel(lead.stage)}
                      </span>
                    </td>
                    <td>{ownerName}</td>
                    <td>
                      <div className="leads-actions">
                        <button
                          type="button"
                          className="leads-icon-button"
                          onClick={() => openEditModal(lead)}
                          aria-label="Edit lead"
                          title="Edit"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 21h6l12-12a2.1 2.1 0 0 0-3-3L6 18l-3 3z" />
                          </svg>
                        </button>
                        {isWon && !isConverted && (
                          <button
                            type="button"
                            className="leads-icon-button leads-icon-button--success"
                            onClick={() => handleConvert(lead)}
                            aria-label="Convert to tenant"
                            title="Convert to tenant"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                            </svg>
                          </button>
                        )}
                        {isConverted && (
                          <button
                            type="button"
                            className="leads-icon-button leads-icon-button--info"
                            onClick={() => navigate(`/tenants/${lead.converted_tenant}`)}
                            aria-label="View tenant"
                            title="View tenant"
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          className="leads-icon-button leads-icon-button--danger"
                          onClick={() => handleDelete(lead)}
                          disabled={deletingIds.has(lead.id)}
                          aria-label="Delete lead"
                          title="Delete"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="leads-table-footer">
            Showing {filteredLeads.length === 0 ? 0 : 1} to {filteredLeads.length} of{" "}
            {leads.length} entries
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          className="leads-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leads-modal-title"
        >
          <div className="leads-modal__overlay" onClick={closeModal} />
          <div className="leads-modal__panel" ref={modalPanelRef}>
            <div className="leads-modal__header">
              <div>
                <h2 id="leads-modal-title">{editingLead ? "Edit Lead" : "New Lead"}</h2>
                <p className="leads-subtitle">
                  {editingLead ? "Update lead information." : "Create a new sales opportunity."}
                </p>
              </div>
              <button type="button" className="leads-button" onClick={closeModal}>
                Close
              </button>
            </div>

            <form className="leads-form" onSubmit={handleSubmit(onSubmit)}>
              <div className="leads-form-grid">
                <label className="leads-field">
                  <span>First Name *</span>
                  <input
                    type="text"
                    {...register("first_name", { required: "First name is required." })}
                    className={errors.first_name ? "leads-input leads-input--error" : "leads-input"}
                    ref={(node) => {
                      if (!editingLead) {
                        modalFirstInputRef.current = node;
                      }
                    }}
                  />
                  {errors.first_name && (
                    <span className="leads-error">{errors.first_name.message}</span>
                  )}
                </label>

                <label className="leads-field">
                  <span>Last Name *</span>
                  <input
                    type="text"
                    {...register("last_name", { required: "Last name is required." })}
                    className={errors.last_name ? "leads-input leads-input--error" : "leads-input"}
                  />
                  {errors.last_name && (
                    <span className="leads-error">{errors.last_name.message}</span>
                  )}
                </label>
              </div>

              <div className="leads-form-grid">
                <label className="leads-field">
                  <span>Email</span>
                  <input
                    type="email"
                    {...register("email")}
                    className="leads-input"
                  />
                </label>

                <label className="leads-field">
                  <span>Primary Phone</span>
                  <input
                    type="tel"
                    {...register("phone_primary")}
                    className="leads-input"
                  />
                </label>
              </div>

              <div className="leads-form-grid">
                <label className="leads-field">
                  <span>Secondary Phone</span>
                  <input
                    type="tel"
                    {...register("phone_secondary")}
                    className="leads-input"
                  />
                </label>

                <label className="leads-field">
                  <span>Source</span>
                  <select {...register("source")} className="leads-input">
                    <option value="">Select source</option>
                    {SOURCE_OPTIONS.map((sourceOption) => (
                      <option key={sourceOption.value} value={sourceOption.value}>
                        {sourceOption.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="leads-form-grid">
                <label className="leads-field">
                  <span>Stage *</span>
                  <select
                    {...register("stage", { required: "Stage is required." })}
                    className={errors.stage ? "leads-input leads-input--error" : "leads-input"}
                  >
                    {STAGE_OPTIONS.map((stageOption) => (
                      <option key={stageOption.value} value={stageOption.value}>
                        {stageOption.label}
                      </option>
                    ))}
                  </select>
                  {errors.stage && <span className="leads-error">{errors.stage.message}</span>}
                </label>

                <label className="leads-field">
                  <span>Owner</span>
                  <select {...register("owner_id")} className="leads-input">
                    <option value="">Select owner</option>
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.name || owner.email}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="leads-field">
                <span>Notes</span>
                <textarea
                  {...register("notes")}
                  className="leads-input leads-textarea"
                  rows={3}
                />
              </label>

              {formError && <div className="leads-alert leads-alert--error">{formError}</div>}

              <div className="leads-form__actions">
                <button type="button" className="leads-button" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="leads-primary" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingLead ? "Update Lead" : "Create Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}