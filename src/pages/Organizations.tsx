import { useCallback, useEffect, useRef, useState } from "react";
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
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
        <div>
          <h1>Organizations</h1>
          <p className="orgs-subtitle">Manage organizations in the system.</p>
        </div>
        <button type="button" className="orgs-primary" onClick={openCreateModal}>
          Add organization
        </button>
      </header>

      {loadError && <div className="orgs-alert orgs-alert--error">{loadError}</div>}
      {pageSuccess && <div className="orgs-alert orgs-alert--success">{pageSuccess}</div>}

      {isLoading ? (
        <div className="orgs-empty">Loading organizations...</div>
      ) : organizations.length === 0 ? (
        <div className="orgs-empty">No organizations found. Create the first organization.</div>
      ) : (
        <div className="orgs-table-wrapper">
          <table className="orgs-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Tax ID</th>
                <th>Timezone</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id}>
                  <td>{org.name}</td>
                  <td>{org.tax_id || "-"}</td>
                  <td>{org.timezone || "-"}</td>
                  <td>
                    <div className="orgs-actions">
                      <button
                        type="button"
                        className="orgs-button"
                        onClick={() => openEditModal(org)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="orgs-button orgs-button--danger"
                        onClick={() => handleDelete(org)}
                        disabled={deletingIds.has(org.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              <div>
                <h2 id="orgs-modal-title">
                  {editingOrg ? "Edit organization" : "Add organization"}
                </h2>
                <p className="orgs-subtitle">Set organization details.</p>
              </div>
              <button type="button" className="orgs-button" onClick={closeModal}>
                Close
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
                <input type="text" {...register("tax_id")} className="orgs-input" />
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
