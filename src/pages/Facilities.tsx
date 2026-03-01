import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useForm } from "react-hook-form";
import { facilitiesApi } from "@/api/facilities";
import { organizationsApi } from "@/api/organizations";
import type { FacilityRecord, FacilityPayload } from "@/api/facilities";
import type { Organization } from "@/api/organizations";
import { useFacility } from "@/contexts/FacilityContext";
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
  const { selectedFacilityId } = useFacility();
  const [facilities, setFacilities] = useState<FacilityRecord[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [organizationFilter, setOrganizationFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFac, setEditingFac] = useState<FacilityRecord | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
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

  // Calculate stats
  const stats = useMemo(() => {
    const uniqueOrgs = new Set(facilities.map((f) => f.organization));
    return {
      total: facilities.length,
      orgsCount: uniqueOrgs.size
    };
  }, [facilities]);

  const filteredFacilities = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return facilities.filter((facility) => {
      const organizationName =
        orgMap.get(facility.organization) ?? String(facility.organization ?? "");
      const matchesOrganization =
        !organizationFilter || String(facility.organization) === organizationFilter;

      if (!normalizedQuery) {
        return matchesOrganization;
      }

      const searchable = [
        facility.name,
        facility.address ?? "",
        organizationName,
        facility.timezone ?? ""
      ]
        .join(" ")
        .toLowerCase();

      return matchesOrganization && searchable.includes(normalizedQuery);
    });
  }, [facilities, orgMap, organizationFilter, searchTerm]);

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
      organization: String(fac.organization),
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
      organization: Number(values.organization),
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
        <div className="fac-header__left">
          <div className="fac-header__title-row">
            <Link to="/dashboard" className="fac-header__home" title="Go to Dashboard">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="fac-header__path">Workspace</span>
            </Link>
            <span className="fac-header__path-divider">/</span>
            <span className="fac-header__current">Facilities</span>
          </div>
          <p className="fac-subtitle">Manage facilities and their organization assignments.</p>
        </div>
        <button type="button" className="fac-primary" onClick={openCreateModal}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add facility
        </button>
      </header>

      {loadError && <div className="fac-alert fac-alert--error">{loadError}</div>}
      {pageSuccess && <div className="fac-alert fac-alert--success">{pageSuccess}</div>}

      {isLoading ? (
        <div className="fac-loading">
          <div className="fac-loading__spinner" />
          Loading facilities...
        </div>
      ) : facilities.length === 0 ? (
        <div className="fac-empty">
          <div className="fac-empty__icon">🏢</div>
          <p>No facilities found. Create the first facility to get started.</p>
        </div>
      ) : (
        <>
          <div className="fac-stats">
            <div className="fac-stat">
              <div className="fac-stat__icon fac-stat__icon--total">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div className="fac-stat__info">
                <span className="fac-stat__label">Total Facilities</span>
                <span className="fac-stat__value">{stats.total}</span>
              </div>
            </div>

            <div className="fac-stat">
              <div className="fac-stat__icon fac-stat__icon--orgs">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="fac-stat__info">
                <span className="fac-stat__label">Organizations</span>
                <span className="fac-stat__value">{stats.orgsCount}</span>
              </div>
            </div>
          </div>

          <div className="fac-table-wrapper">
            <div className="fac-table-toolbar">
              <span className="fac-table-title">Facilities</span>
              <div className="fac-table-actions">
                <select
                  className="fac-table-filter"
                  value={organizationFilter}
                  onChange={(event) => setOrganizationFilter(event.target.value)}
                >
                  <option value="">All organizations</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>
                <label className="fac-search">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="16.65" y1="16.65" x2="21" y2="21" />
                  </svg>
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search"
                    aria-label="Search facilities"
                  />
                </label>
              </div>
            </div>
            <table className="fac-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Organization</th>
                  <th>Timezone</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredFacilities.map((fac) => (
                  <tr key={fac.id}>
                    <td>
                      <strong>{fac.name}</strong>
                    </td>
                    <td>{fac.address || "-"}</td>
                    <td>{orgMap.get(fac.organization) ?? fac.organization ?? "-"}</td>
                    <td>{fac.timezone || "-"}</td>
                    <td>
                      <div className="fac-actions">
                        <button
                          type="button"
                          className="fac-icon-button"
                          onClick={() => openEditModal(fac)}
                          aria-label="Edit facility"
                          title="Edit"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 21h6l12-12a2.1 2.1 0 0 0-3-3L6 18l-3 3z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="fac-icon-button fac-icon-button--danger"
                          onClick={() => handleDelete(fac)}
                          disabled={deletingIds.has(fac.id)}
                          aria-label="Delete facility"
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
            <div className="fac-table-footer">
              Showing {filteredFacilities.length === 0 ? 0 : 1} to {filteredFacilities.length} of{" "}
              {facilities.length} entries
            </div>
          </div>
        </>
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
              <h2 id="fac-modal-title">{editingFac ? "Edit facility" : "Add facility"}</h2>
              <button type="button" className="fac-modal__close" onClick={closeModal}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
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
                <input
                  type="text"
                  {...register("address")}
                  className="fac-input"
                  placeholder="Enter address"
                />
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
