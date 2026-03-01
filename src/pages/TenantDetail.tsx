import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { tenantsApi } from "@/api/tenants";
import type { Tenant } from "@/api/tenants";
import "@/pages/TenantDetail.css";

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
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<Tenant | null>(null);
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
  } = useForm<TenantFormValues>();

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!id) {
        setLoadError("Tenant ID is required.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const tenantData = await tenantsApi.get(parseInt(id, 10));

        if (!isMounted) {
          return;
        }

        setTenant(tenantData);

        reset({
          first_name: tenantData.first_name,
          last_name: tenantData.last_name,
          email: tenantData.email ?? "",
          phone_primary: tenantData.phone_primary ?? "",
          phone_secondary: tenantData.phone_secondary ?? "",
          document: tenantData.document ?? "",
          category: tenantData.category ?? "PF",
          address: tenantData.address ?? ""
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setLoadError("Tenant not found.");
        } else {
          setLoadError("Unable to load tenant details. Please try again.");
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

  const onSubmit = async (values: TenantFormValues) => {
    if (!tenant) return;

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
      await tenantsApi.update(tenant.id, payload);
      const updatedTenant = await tenantsApi.get(tenant.id);
      setTenant(updatedTenant);
      reset(values);
      setPageSuccess("Tenant updated successfully.");
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

  const handleDelete = async () => {
    if (!tenant) return;

    setIsDeleting(true);
    setFormError(null);

    try {
      await tenantsApi.delete(tenant.id);
      navigate("/tenants");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        navigate("/tenants");
        return;
      }
      setFormError("Unable to delete tenant. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleView360 = () => {
    if (!tenant) return;
    navigate(`/tenants/${tenant.id}/360`);
  };

  const handleBack = () => {
    navigate("/tenants");
  };

  if (isLoading) {
    return (
      <main className="tenant-detail-page">
        <div className="tenant-detail-loading">Loading tenant details...</div>
      </main>
    );
  }

  if (loadError && !tenant) {
    return (
      <main className="tenant-detail-page">
        <div className="tenant-detail-error-state">
          <p>{loadError}</p>
          <button type="button" className="tenant-detail-button" onClick={handleBack}>
            Back to Tenants
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="tenant-detail-page">
      <header className="tenant-detail-header">
        <div className="tenant-detail-header__left">
          <button type="button" className="tenant-detail-back" onClick={handleBack}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
          <div>
            <h1>
              {tenant?.first_name} {tenant?.last_name}
            </h1>
            <div className="tenant-detail-meta">
              <span
                className="tenant-detail-status"
                style={{
                  backgroundColor: `${getCategoryColor(tenant?.category ?? null)}15`,
                  color: getCategoryColor(tenant?.category ?? null)
                }}
              >
                {getCategoryLabel(tenant?.category ?? null)}
              </span>
            </div>
          </div>
        </div>
        <div className="tenant-detail-header__actions">
          <button type="button" className="tenant-detail-secondary" onClick={handleView360}>
            View 360
          </button>
        </div>
      </header>

      {pageSuccess && (
        <div className="tenant-detail-alert tenant-detail-alert--success">{pageSuccess}</div>
      )}
      {formError && (
        <div className="tenant-detail-alert tenant-detail-alert--error">{formError}</div>
      )}

      <div className="tenant-detail-content">
        <form className="tenant-detail-form" onSubmit={handleSubmit(onSubmit)}>
          <section className="tenant-detail-section">
            <h2>Contact Information</h2>
            <div className="tenant-detail-grid">
              <label className="tenant-detail-field">
                <span>First Name *</span>
                <input
                  type="text"
                  {...register("first_name", { required: "First name is required." })}
                  className={
                    errors.first_name
                      ? "tenant-detail-input tenant-detail-input--error"
                      : "tenant-detail-input"
                  }
                />
                {errors.first_name && (
                  <span className="tenant-detail-error">{errors.first_name.message}</span>
                )}
              </label>

              <label className="tenant-detail-field">
                <span>Last Name *</span>
                <input
                  type="text"
                  {...register("last_name", { required: "Last name is required." })}
                  className={
                    errors.last_name
                      ? "tenant-detail-input tenant-detail-input--error"
                      : "tenant-detail-input"
                  }
                />
                {errors.last_name && (
                  <span className="tenant-detail-error">{errors.last_name.message}</span>
                )}
              </label>

              <label className="tenant-detail-field">
                <span>Email</span>
                <input type="email" {...register("email")} className="tenant-detail-input" />
              </label>

              <label className="tenant-detail-field">
                <span>Primary Phone</span>
                <input type="tel" {...register("phone_primary")} className="tenant-detail-input" />
              </label>

              <label className="tenant-detail-field">
                <span>Secondary Phone</span>
                <input
                  type="tel"
                  {...register("phone_secondary")}
                  className="tenant-detail-input"
                />
              </label>

              <label className="tenant-detail-field">
                <span>Address</span>
                <input type="text" {...register("address")} className="tenant-detail-input" />
              </label>
            </div>
          </section>

          <section className="tenant-detail-section">
            <h2>Document Information</h2>
            <div className="tenant-detail-grid">
              <label className="tenant-detail-field">
                <span>Document</span>
                <input type="text" {...register("document")} className="tenant-detail-input" />
              </label>

              <label className="tenant-detail-field">
                <span>Category</span>
                <select {...register("category")} className="tenant-detail-input">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="tenant-detail-section tenant-detail-section--meta">
            <h2>Metadata</h2>
            <div className="tenant-detail-meta-grid">
              <div className="tenant-detail-meta-item">
                <span className="tenant-detail-meta-label">Created</span>
                <span className="tenant-detail-meta-value">
                  {formatDate(tenant?.created_at ?? null)}
                </span>
              </div>
            </div>
          </section>

          <div className="tenant-detail-actions">
            <button
              type="button"
              className="tenant-detail-button tenant-detail-button--danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete Tenant
            </button>
            <div className="tenant-detail-actions__right">
              <button type="button" className="tenant-detail-button" onClick={handleBack}>
                Cancel
              </button>
              <button
                type="submit"
                className="tenant-detail-primary"
                disabled={isSaving || !isDirty}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {showDeleteConfirm && (
        <div className="tenant-detail-modal" role="dialog" aria-modal="true">
          <div
            className="tenant-detail-modal__overlay"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="tenant-detail-modal__panel" ref={modalPanelRef}>
            <h2>Delete Tenant</h2>
            <p>
              Are you sure you want to delete the tenant{" "}
              <strong>
                {tenant?.first_name} {tenant?.last_name}
              </strong>
              ? This action cannot be undone.
            </p>
            <div className="tenant-detail-modal__actions">
              <button
                type="button"
                className="tenant-detail-button"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tenant-detail-button tenant-detail-button--danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Tenant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
