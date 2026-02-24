import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { facilitiesApi } from "@/api/facilities";
import { organizationsApi } from "@/api/organizations";
import type { FacilityRecord, FacilityPayload } from "@/api/facilities";
import type { Organization } from "@/api/organizations";
import "@/pages/Facilities.css";

type FacFormValues = {
  name: string;
  address: string;
  organization: string;
  timezone: string;
};

const DEFAULT_FORM_VALUES: FacFormValues = {
  name: "",
  address: "",
  organization: "",
  timezone: ""
};

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFac, setEditingFac] = useState<FacilityRecord | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const modalPanelRef = useRef<HTMLDivElement | null>(null);
  const modalFirstInputRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<FacFormValues>({
    defaultValues: DEFAULT_FORM_VALUES
  });

  const nameRegister = register("name", { required: "Name is required." });

  const orgMap = useMemo(
    () => new Map(organizations.map((org) => [org.id, org.name])),
    [organizations]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [facList, orgList] = await Promise.all([
          facilitiesApi.list(),
          organizationsApi.list()
        ]);

        if (isMounted) {
          setFacilities(facList);
          setOrganizations(orgList);
        }
      } catch {
        if (isMounted) {
          setLoadError("Unable to load facilities. Please try again.");
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
    setEditingFac(null);
    reset(DEFAULT_FORM_VALUES);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (fac: FacilityRecord) => {
    setEditingFac(fac);
    reset({
      name: fac.name,
      address: fac.address,
      organization: fac.organization,
      timezone: fac.timezone
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingFac(null);
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
    const list = await facilitiesApi.list();
    setFacilities(list);
  };

  const onSubmit = async (values: FacFormValues) => {
    setFormError(null);
    setPageSuccess(null);
    setIsSaving(true);

    const payload: FacilityPayload = {
      name: values.name,
      address: values.address,
      organization: values.organization,
      timezone: values.timezone
    };

    try {
      const successMessage = editingFac
        ? "Facility updated successfully."
        : "Facility created successfully.";

      if (editingFac) {
        await facilitiesApi.update(editingFac.id, payload);
      } else {
        await facilitiesApi.create(payload);
      }

      await refreshList();
      setPageSuccess(successMessage);
      closeModal();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setFormError("Unable to save facility. Please check the form and try again.");
      } else {
        setFormError("Unexpected error while saving facility.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (fac: FacilityRecord) => {
    if (deletingIds.has(fac.id)) {
      return;
    }

    if (!window.confirm(`Delete "${fac.name}"?`)) {
      return;
    }

    try {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.add(fac.id);
        return next;
      });
      await facilitiesApi.delete(fac.id);
      await refreshList();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        await refreshList();
        return;
      }
      setLoadError("Unable to delete facility. Please try again.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(fac.id);
        return next;
      });
    }
  };

  return (
    <main className="fac-page">
      <header className="fac-header">
        <div>
          <h1>Facilities</h1>
          <p className="fac-subtitle">Manage facilities and their organization assignments.</p>
        </div>
        <button type="button" className="fac-primary" onClick={openCreateModal}>
          Add facility
        </button>
      </header>

      {loadError && <div className="fac-alert fac-alert--error">{loadError}</div>}
      {pageSuccess && <div className="fac-alert fac-alert--success">{pageSuccess}</div>}

      {isLoading ? (
        <div className="fac-empty">Loading facilities...</div>
      ) : facilities.length === 0 ? (
        <div className="fac-empty">No facilities found. Create the first facility.</div>
      ) : (
        <div className="fac-table-wrapper">
          <table className="fac-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Address</th>
                <th>Organization</th>
                <th>Timezone</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {facilities.map((fac) => (
                <tr key={fac.id}>
                  <td>{fac.name}</td>
                  <td>{fac.address || "-"}</td>
                  <td>{orgMap.get(fac.organization) ?? fac.organization ?? "-"}</td>
                  <td>{fac.timezone || "-"}</td>
                  <td>
                    <div className="fac-actions">
                      <button
                        type="button"
                        className="fac-button"
                        onClick={() => openEditModal(fac)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="fac-button fac-button--danger"
                        onClick={() => handleDelete(fac)}
                        disabled={deletingIds.has(fac.id)}
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
          className="fac-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fac-modal-title"
        >
          <div className="fac-modal__overlay" onClick={closeModal} />
          <div className="fac-modal__panel" ref={modalPanelRef}>
            <div className="fac-modal__header">
              <div>
                <h2 id="fac-modal-title">{editingFac ? "Edit facility" : "Add facility"}</h2>
                <p className="fac-subtitle">Set facility details.</p>
              </div>
              <button type="button" className="fac-button" onClick={closeModal}>
                Close
              </button>
            </div>

            <form className="fac-form" onSubmit={handleSubmit(onSubmit)}>
              <label className="fac-field">
                <span>Name</span>
                <input
                  type="text"
                  {...nameRegister}
                  className={errors.name ? "fac-input fac-input--error" : "fac-input"}
                  ref={(node) => {
                    nameRegister.ref(node);
                    modalFirstInputRef.current = node;
                  }}
                />
                {errors.name && <span className="fac-error">{errors.name.message}</span>}
              </label>

              <label className="fac-field">
                <span>Address</span>
                <input type="text" {...register("address")} className="fac-input" />
              </label>

              <label className="fac-field">
                <span>Organization</span>
                <select
                  {...register("organization", { required: "Organization is required." })}
                  className={errors.organization ? "fac-input fac-input--error" : "fac-input"}
                >
                  <option value="">Select an organization</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
                {errors.organization && (
                  <span className="fac-error">{errors.organization.message}</span>
                )}
              </label>

              <label className="fac-field">
                <span>Timezone</span>
                <input
                  type="text"
                  {...register("timezone")}
                  className="fac-input"
                  placeholder="e.g. America/Sao_Paulo"
                />
              </label>

              {formError && <div className="fac-alert fac-alert--error">{formError}</div>}

              <div className="fac-form__actions">
                <button type="button" className="fac-button" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="fac-primary" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingFac ? "Update facility" : "Create facility"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
