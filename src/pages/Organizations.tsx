import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useForm } from "react-hook-form";
import { organizationsApi } from "@/api/organizations";
import type { Organization, OrganizationPayload } from "@/api/organizations";
import "@/pages/Organizations.css";

type OrgFormValues = {
  name: string;
  tax_id: string;
  timezone: string;
};

const DEFAULT_FORM_VALUES: OrgFormValues = {
  name: "",
  tax_id: "",
  timezone: ""
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [timezoneFilter, setTimezoneFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const modalPanelRef = useRef<HTMLDivElement | null>(null);
  const modalFirstInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<OrgFormValues>({
    defaultValues: DEFAULT_FORM_VALUES
  });

  const nameRegister = register("name", { required: "Name is required." });

  const timezoneOptions = useMemo(() => {
    const unique = new Set(
      organizations
        .map((organization) => organization.timezone?.trim())
        .filter((timezone): timezone is string => Boolean(timezone))
    );

    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [organizations]);

  const filteredOrganizations = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return organizations.filter((organization) => {
      const matchesTimezone = !timezoneFilter || organization.timezone === timezoneFilter;

      if (!normalizedQuery) {
        return matchesTimezone;
      }

      const searchable = [
        organization.name,
        organization.tax_id ?? "",
        organization.timezone ?? ""
      ]
        .join(" ")
        .toLowerCase();

      return matchesTimezone && searchable.includes(normalizedQuery);
    });
  }, [organizations, searchTerm, timezoneFilter]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const list = await organizationsApi.list();
        if (isMounted) {
          setOrganizations(list);
        }
      } catch {
        if (isMounted) {
          setLoadError("Unable to load organizations. Please try again.");
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
  }, []);

  const openCreateModal = () => {
    setEditingOrg(null);
    reset(DEFAULT_FORM_VALUES);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (org: Organization) => {
    setEditingOrg(org);
    reset({
      name: org.name,
      tax_id: org.tax_id,
      timezone: org.timezone
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingOrg(null);
    reset(DEFAULT_FORM_VALUES);
  }, [reset]);

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    modalFirstInputRef.current?.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
    };
  }, [closeModal, isModalOpen]);

  const refreshList = async () => {
    const list = await organizationsApi.list();
    setOrganizations(list);
  };

  const onSubmit = async (values: OrgFormValues) => {
    setFormError(null);
    setPageSuccess(null);
    setIsSaving(true);

    const payload: OrganizationPayload = {
      name: values.name,
      tax_id: values.tax_id,
      timezone: values.timezone
    };

    try {
      const successMessage = editingOrg
        ? "Organization updated successfully."
        : "Organization created successfully.";

      if (editingOrg) {
        await organizationsApi.update(editingOrg.id, payload);
      } else {
        await organizationsApi.create(payload);
      }

      await refreshList();
      setPageSuccess(successMessage);
      closeModal();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setFormError("Unable to save organization. Please check the form and try again.");
      } else {
        setFormError("Unexpected error while saving organization.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (org: Organization) => {
    if (deletingIds.has(org.id)) {
      return;
    }

    if (!window.confirm(`Delete "${org.name}"?`)) {
      return;
    }

    try {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.add(org.id);
        return next;
      });
      await organizationsApi.delete(org.id);
      await refreshList();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        await refreshList();
        return;
      }
      setLoadError("Unable to delete organization. Please try again.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(org.id);
        return next;
      });
    }
  };

  return (
    <main className="orgs-page">
      <header className="orgs-header">
        <div className="orgs-header__left">
          <div className="orgs-header__title-row">
            <Link to="/dashboard" className="orgs-header__home" title="Go to Dashboard">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="orgs-header__path">Workspace</span>
            </Link>
            <span className="orgs-header__path-divider">/</span>
            <span className="orgs-header__current">Organizations</span>
          </div>
          <p className="orgs-subtitle">Manage organizations in the system.</p>
        </div>
        <button type="button" className="orgs-primary" onClick={openCreateModal}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add organization
        </button>
      </header>

      {loadError && <div className="orgs-alert orgs-alert--error">{loadError}</div>}
      {pageSuccess && <div className="orgs-alert orgs-alert--success">{pageSuccess}</div>}

      {isLoading ? (
        <div className="orgs-loading">
          <div className="orgs-loading__spinner" />
          Loading organizations...
        </div>
      ) : organizations.length === 0 ? (
        <div className="orgs-empty">
          <div className="orgs-empty__icon">🏛️</div>
          <p>No organizations found. Create the first organization to get started.</p>
        </div>
      ) : (
        <>
          <div className="orgs-stats">
            <div className="orgs-stat">
              <div className="orgs-stat__icon orgs-stat__icon--total">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-4" />
                  <path d="M9 9v.01" />
                  <path d="M9 12v.01" />
                  <path d="M9 15v.01" />
                  <path d="M9 18v.01" />
                </svg>
              </div>
              <div className="orgs-stat__info">
                <span className="orgs-stat__label">Total Organizations</span>
                <span className="orgs-stat__value">{organizations.length}</span>
              </div>
            </div>
          </div>

          <div className="orgs-table-wrapper">
            <div className="orgs-table-toolbar">
              <span className="orgs-table-title">Organizations</span>
              <div className="orgs-table-actions">
                <select
                  className="orgs-table-filter"
                  value={timezoneFilter}
                  onChange={(event) => setTimezoneFilter(event.target.value)}
                >
                  <option value="">All timezones</option>
                  {timezoneOptions.map((timezoneOption) => (
                    <option key={timezoneOption} value={timezoneOption}>
                      {timezoneOption}
                    </option>
                  ))}
                </select>
                <label className="orgs-search">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="16.65" y1="16.65" x2="21" y2="21" />
                  </svg>
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search"
                    aria-label="Search organizations"
                  />
                </label>
              </div>
            </div>
            <table className="orgs-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Tax ID</th>
                  <th>Timezone</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrganizations.map((org) => (
                  <tr key={org.id}>
                    <td>
                      <strong>{org.name}</strong>
                    </td>
                    <td>
                      {org.tax_id ? <code>{org.tax_id}</code> : "-"}
                    </td>
                    <td>{org.timezone || "-"}</td>
                    <td>
                      <div className="orgs-actions">
                        <button
                          type="button"
                          className="orgs-icon-button"
                          onClick={() => openEditModal(org)}
                          aria-label="Edit organization"
                          title="Edit"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 21h6l12-12a2.1 2.1 0 0 0-3-3L6 18l-3 3z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="orgs-icon-button orgs-icon-button--danger"
                          onClick={() => handleDelete(org)}
                          disabled={deletingIds.has(org.id)}
                          aria-label="Delete organization"
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
                ))}
              </tbody>
            </table>
            <div className="orgs-table-footer">
              Showing {filteredOrganizations.length === 0 ? 0 : 1} to{" "}
              {filteredOrganizations.length} of {organizations.length} entries
            </div>
          </div>
        </>
      )}

      {isModalOpen && (
        <div
          className="orgs-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="orgs-modal-title"
        >
          <div className="orgs-modal__overlay" onClick={closeModal} />
          <div className="orgs-modal__panel" ref={modalPanelRef}>
            <div className="orgs-modal__header">
              <h2 id="orgs-modal-title">
                {editingOrg ? "Edit organization" : "Add organization"}
              </h2>
              <button type="button" className="orgs-modal__close" onClick={closeModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form className="orgs-form" onSubmit={handleSubmit(onSubmit)}>
              <label className="orgs-field">
                <span>Name</span>
                <input
                  type="text"
                  {...nameRegister}
                  className={errors.name ? "orgs-input orgs-input--error" : "orgs-input"}
                  ref={(node) => {
                    nameRegister.ref(node);
                    modalFirstInputRef.current = node;
                  }}
                />
                {errors.name && <span className="orgs-error">{errors.name.message}</span>}
              </label>

              <label className="orgs-field">
                <span>Tax ID</span>
                <input
                  type="text"
                  {...register("tax_id")}
                  className="orgs-input"
                  placeholder="e.g. 12.345.678/0001-90"
                />
              </label>

              <label className="orgs-field">
                <span>Timezone</span>
                <input
                  type="text"
                  {...register("timezone")}
                  className="orgs-input"
                  placeholder="e.g. America/Sao_Paulo"
                />
              </label>

              {formError && <div className="orgs-alert orgs-alert--error">{formError}</div>}

              <div className="orgs-form__actions">
                <button type="button" className="orgs-button" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="orgs-primary" disabled={isSaving}>
                  {isSaving
                    ? "Saving..."
                    : editingOrg
                      ? "Update organization"
                      : "Create organization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
