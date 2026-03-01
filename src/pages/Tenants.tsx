import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { tenantsApi } from "@/api/tenants";
import type { Tenant } from "@/api/tenants";
import "@/pages/Tenants.css";

const CATEGORY_OPTIONS = [
  { value: "PF", label: "Pessoa Física", color: "#3b82f6" },
  { value: "PJ", label: "Pessoa Jurídica", color: "#8b5cf6" }
];

type TenantFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  phone_primary: string;
  phone_secondary: string;
  document: string;
  category: string;
  address: string;
};

const DEFAULT_FORM_VALUES: TenantFormValues = {
  first_name: "",
  last_name: "",
  email: "",
  phone_primary: "",
  phone_secondary: "",
  document: "",
  category: "PF",
  address: ""
};

function getCategoryLabel(category: string | null): string {
  if (!category) return "-";
  return CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? category;
}

function getCategoryColor(category: string | null): string {
  return CATEGORY_OPTIONS.find((c) => c.value === category)?.color ?? "#64748b";
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

export default function TenantsPage() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const modalPanelRef = useRef<HTMLDivElement | null>(null);
  const modalFirstInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<TenantFormValues>({
    defaultValues: DEFAULT_FORM_VALUES
  });

  const filteredTenants = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return tenants.filter((tenant) => {
      const fullName = `${tenant.first_name} ${tenant.last_name}`.toLowerCase();
      const email = (tenant.email ?? "").toLowerCase();
      const phone = (tenant.phone_primary ?? "").toLowerCase();

      const matchesCategory = !categoryFilter || tenant.category === categoryFilter;

      if (!normalizedQuery) {
        return matchesCategory;
      }

      const searchable = [fullName, email, phone].join(" ");
      return matchesCategory && searchable.includes(normalizedQuery);
    });
  }, [tenants, searchTerm, categoryFilter]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const tenantList = await tenantsApi.list();

        if (!isMounted) {
          return;
        }

        setTenants(tenantList);
      } catch {
        if (!isMounted) {
          return;
        }

        setLoadError("Unable to load tenants. Please try again.");
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

  const refreshTenants = async () => {
    const tenantList = await tenantsApi.list();
    setTenants(tenantList);
  };

  const openCreateModal = () => {
    setEditingTenant(null);
    reset(DEFAULT_FORM_VALUES);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant);
    reset({
      first_name: tenant.first_name,
      last_name: tenant.last_name,
      email: tenant.email ?? "",
      phone_primary: tenant.phone_primary ?? "",
      phone_secondary: tenant.phone_secondary ?? "",
      document: tenant.document ?? "",
      category: tenant.category ?? "PF",
      address: tenant.address ?? ""
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingTenant(null);
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

  const onSubmit = async (values: TenantFormValues) => {
    setFormError(null);
    setPageSuccess(null);

    const payload = {
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email || null,
      phone_primary: values.phone_primary || null,
      phone_secondary: values.phone_secondary || null,
      document: values.document || null,
      category: values.category || null,
      address: values.address || null
    };

    setIsSaving(true);

    try {
      const successMessage = editingTenant
        ? "Tenant updated successfully."
        : "Tenant created successfully.";

      if (editingTenant) {
        await tenantsApi.update(editingTenant.id, payload);
      } else {
        await tenantsApi.create(payload);
      }

      await refreshTenants();
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
          setFormError(messages || "Unable to save tenant. Please check the form and try again.");
        } else {
          setFormError("Unable to save tenant. Please check the form and try again.");
        }
      } else {
        setFormError("Unexpected error while saving tenant.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (tenant: Tenant) => {
    if (deletingIds.has(tenant.id)) {
      return;
    }

    const fullName = `${tenant.first_name} ${tenant.last_name}`;

    if (!window.confirm(`Delete tenant "${fullName}"?`)) {
      return;
    }

    try {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.add(tenant.id);
        return next;
      });
      await tenantsApi.delete(tenant.id);
      await refreshTenants();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        await refreshTenants();
        return;
      }

      setLoadError("Unable to delete tenant. Please try again.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(tenant.id);
        return next;
      });
    }
  };

  const handleViewDetail = (tenant: Tenant) => {
    navigate(`/tenants/${tenant.id}`);
  };

  const handleView360 = (tenant: Tenant) => {
    navigate(`/tenants/${tenant.id}/360`);
  };

  return (
    <main className="tenants-page">
      <header className="tenants-header">
        <div>
          <h1>Inquilinos</h1>
          <p className="tenants-subtitle">Manage tenants and their information.</p>
        </div>
        <button type="button" className="tenants-primary" onClick={openCreateModal}>
          New Tenant
        </button>
      </header>

      {loadError && <div className="tenants-alert tenants-alert--error">{loadError}</div>}
      {pageSuccess && <div className="tenants-alert tenants-alert--success">{pageSuccess}</div>}

      {isLoading ? (
        <div className="tenants-empty">Loading tenants...</div>
      ) : tenants.length === 0 ? (
        <div className="tenants-empty">
          No tenants found. Create the first tenant to get started.
        </div>
      ) : (
        <div className="tenants-table-wrapper">
          <div className="tenants-table-toolbar">
            <select
              className="tenants-table-filter"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="">All categories</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <label className="tenants-search">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.65" y1="16.65" x2="21" y2="21" />
              </svg>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search tenants..."
                aria-label="Search tenants"
              />
            </label>
          </div>
          <table className="tenants-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Category</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td>
                    <button
                      type="button"
                      className="tenants-name-link"
                      onClick={() => handleViewDetail(tenant)}
                    >
                      {tenant.first_name} {tenant.last_name}
                    </button>
                  </td>
                  <td>{tenant.email || "-"}</td>
                  <td>{tenant.phone_primary || "-"}</td>
                  <td>
                    <span
                      className="tenants-status-badge"
                      style={{
                        backgroundColor: `${getCategoryColor(tenant.category)}15`,
                        color: getCategoryColor(tenant.category)
                      }}
                    >
                      {getCategoryLabel(tenant.category)}
                    </span>
                  </td>
                  <td>{formatDate(tenant.created_at)}</td>
                  <td>
                    <div className="tenants-actions">
                      <button
                        type="button"
                        className="tenants-icon-button"
                        onClick={() => openEditModal(tenant)}
                        aria-label="Edit tenant"
                        title="Edit"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M3 21h6l12-12a2.1 2.1 0 0 0-3-3L6 18l-3 3z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="tenants-icon-button tenants-icon-button--info"
                        onClick={() => handleView360(tenant)}
                        aria-label="View 360"
                        title="View 360"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="tenants-icon-button tenants-icon-button--danger"
                        onClick={() => handleDelete(tenant)}
                        disabled={deletingIds.has(tenant.id)}
                        aria-label="Delete tenant"
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
          <div className="tenants-table-footer">
            Showing {filteredTenants.length === 0 ? 0 : 1} to {filteredTenants.length} of{" "}
            {tenants.length} entries
          </div>
        </div>
      )}

      {isModalOpen && (
        <div
          className="tenants-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tenants-modal-title"
        >
          <div className="tenants-modal__overlay" onClick={closeModal} />
          <div className="tenants-modal__panel" ref={modalPanelRef}>
            <div className="tenants-modal__header">
              <div>
                <h2 id="tenants-modal-title">{editingTenant ? "Edit Tenant" : "New Tenant"}</h2>
                <p className="tenants-subtitle">
                  {editingTenant ? "Update tenant information." : "Create a new tenant."}
                </p>
              </div>
              <button type="button" className="tenants-button" onClick={closeModal}>
                Close
              </button>
            </div>

            <form className="tenants-form" onSubmit={handleSubmit(onSubmit)}>
              <div className="tenants-form-grid">
                <label className="tenants-field">
                  <span>First Name *</span>
                  <input
                    type="text"
                    {...register("first_name", { required: "First name is required." })}
                    className={
                      errors.first_name ? "tenants-input tenants-input--error" : "tenants-input"
                    }
                    ref={(node) => {
                      if (!editingTenant) {
                        modalFirstInputRef.current = node;
                      }
                    }}
                  />
                  {errors.first_name && (
                    <span className="tenants-error">{errors.first_name.message}</span>
                  )}
                </label>

                <label className="tenants-field">
                  <span>Last Name *</span>
                  <input
                    type="text"
                    {...register("last_name", { required: "Last name is required." })}
                    className={
                      errors.last_name ? "tenants-input tenants-input--error" : "tenants-input"
                    }
                  />
                  {errors.last_name && (
                    <span className="tenants-error">{errors.last_name.message}</span>
                  )}
                </label>
              </div>

              <div className="tenants-form-grid">
                <label className="tenants-field">
                  <span>Email</span>
                  <input type="email" {...register("email")} className="tenants-input" />
                </label>

                <label className="tenants-field">
                  <span>Primary Phone</span>
                  <input type="tel" {...register("phone_primary")} className="tenants-input" />
                </label>
              </div>

              <div className="tenants-form-grid">
                <label className="tenants-field">
                  <span>Secondary Phone</span>
                  <input type="tel" {...register("phone_secondary")} className="tenants-input" />
                </label>

                <label className="tenants-field">
                  <span>Category</span>
                  <select {...register("category")} className="tenants-input">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="tenants-form-grid">
                <label className="tenants-field">
                  <span>Document</span>
                  <input type="text" {...register("document")} className="tenants-input" />
                </label>

                <label className="tenants-field">
                  <span>Address</span>
                  <input type="text" {...register("address")} className="tenants-input" />
                </label>
              </div>

              {formError && <div className="tenants-alert tenants-alert--error">{formError}</div>}

              <div className="tenants-form__actions">
                <button type="button" className="tenants-button" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="tenants-primary" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingTenant ? "Update Tenant" : "Create Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
