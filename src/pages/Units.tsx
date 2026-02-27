import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useForm } from "react-hook-form";
import { unitsApi, unitTypesApi } from "@/api/units";
import type { UnitRecord, UnitPayload, UnitStatus, UnitType } from "@/api/units";
import { useFacility } from "@/contexts/FacilityContext";
import "@/pages/Units.css";

const STATUS_OPTIONS: { value: UnitStatus; label: string }[] = [
  { value: "LIVRE", label: "Livre" },
  { value: "RESERVADA", label: "Reservada" },
  { value: "OCUPADA", label: "Ocupada" },
  { value: "BLOQUEADA", label: "Bloqueada" },
  { value: "EM_VISTORIA", label: "Em Vistoria" }
];

type UnitFormValues = {
  unit_type: string;
  unit_number: string;
  status: UnitStatus;
  reservation_expires_at: string;
};

const DEFAULT_FORM_VALUES: UnitFormValues = {
  unit_type: "",
  unit_number: "",
  status: "LIVRE",
  reservation_expires_at: ""
};

export default function UnitsPage() {
  const { selectedFacilityId } = useFacility();
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitRecord | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const modalPanelRef = useRef<HTMLDivElement | null>(null);
  const modalFirstInputRef = useRef<HTMLSelectElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<UnitFormValues>({
    defaultValues: DEFAULT_FORM_VALUES
  });

  const unitTypeRegister = register("unit_type", { required: "Unit type is required." });
  const unitNumberRegister = register("unit_number", { required: "Unit number is required." });

  const watchedStatus = watch("status");

  const unitTypeMap = useMemo(() => new Map(unitTypes.map((ut) => [ut.id, ut.name])), [unitTypes]);

  const filteredUnits = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return units.filter((unit) => {
      const typeName = unitTypeMap.get(unit.unit_type) ?? String(unit.unit_type ?? "");
      const statusLabel = STATUS_OPTIONS.find((statusOption) => statusOption.value === unit.status)?.label;
      const matchesStatus = !statusFilter || unit.status === statusFilter;

      if (!normalizedQuery) {
        return matchesStatus;
      }

      const searchable = [
        unit.unit_number,
        typeName,
        statusLabel ?? unit.status,
        unit.reservation_expires_at ?? ""
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && searchable.includes(normalizedQuery);
    });
  }, [searchTerm, statusFilter, unitTypeMap, units]);

  // Calculate stats
  const stats = useMemo(() => {
    const statusCounts = units.reduce<Record<UnitStatus, number>>(
      (acc, unit) => {
        acc[unit.status] = (acc[unit.status] || 0) + 1;
        return acc;
      },
      { LIVRE: 0, RESERVADA: 0, OCUPADA: 0, BLOQUEADA: 0, EM_VISTORIA: 0 }
    );
    return {
      total: units.length,
      livre: statusCounts.LIVRE,
      ocupada: statusCounts.OCUPADA,
      reservada: statusCounts.RESERVADA
    };
  }, [units]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [unitList, typeList] = await Promise.all([unitsApi.list(), unitTypesApi.list()]);

        if (isMounted) {
          setUnits(unitList);
          setUnitTypes(typeList);
        }
      } catch {
        if (isMounted) {
          setLoadError("Unable to load units. Please try again.");
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
  }, [selectedFacilityId]);

  const openCreateModal = () => {
    setEditingUnit(null);
    reset(DEFAULT_FORM_VALUES);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (unit: UnitRecord) => {
    setEditingUnit(unit);
    reset({
      unit_type: String(unit.unit_type),
      unit_number: unit.unit_number,
      status: unit.status,
      reservation_expires_at: unit.reservation_expires_at
        ? unit.reservation_expires_at.slice(0, 16)
        : ""
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingUnit(null);
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
    const list = await unitsApi.list();
    setUnits(list);
  };

  const onSubmit = async (values: UnitFormValues) => {
    setFormError(null);
    setPageSuccess(null);
    setIsSaving(true);

    const payload: UnitPayload = {
      unit_type: Number(values.unit_type),
      unit_number: values.unit_number,
      status: values.status,
      reservation_expires_at:
        values.status === "RESERVADA" && values.reservation_expires_at
          ? values.reservation_expires_at
          : null
    };

    try {
      const successMessage = editingUnit
        ? "Unit updated successfully."
        : "Unit created successfully.";

      if (editingUnit) {
        await unitsApi.update(editingUnit.id, payload);
      } else {
        await unitsApi.create(payload);
      }

      await refreshList();
      setPageSuccess(successMessage);
      closeModal();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setFormError("Unable to save unit. Please check the form and try again.");
      } else {
        setFormError("Unexpected error while saving unit.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (unit: UnitRecord) => {
    if (deletingIds.has(unit.id)) {
      return;
    }

    if (!window.confirm(`Delete unit "${unit.unit_number}"?`)) {
      return;
    }

    try {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.add(unit.id);
        return next;
      });
      await unitsApi.delete(unit.id);
      await refreshList();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        await refreshList();
        return;
      }
      setLoadError("Unable to delete unit. Please try again.");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(unit.id);
        return next;
      });
    }
  };

  return (
    <main className="units-page">
      <header className="units-header">
        <div className="units-header__left">
          <div className="units-header__title-row">
            <Link to="/dashboard" className="units-header__home" title="Go to Dashboard">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <span className="units-header__path">Workspace</span>
            </Link>
            <span className="units-header__path-divider">/</span>
            <span className="units-header__current">Units</span>
          </div>
          <p className="units-subtitle">Manage storage units for the current facility.</p>
        </div>
        <button type="button" className="units-primary" onClick={openCreateModal}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add unit
        </button>
      </header>

      {loadError && <div className="units-alert units-alert--error">{loadError}</div>}
      {pageSuccess && <div className="units-alert units-alert--success">{pageSuccess}</div>}

      {isLoading ? (
        <div className="units-loading">
          <div className="units-loading__spinner" />
          Loading units...
        </div>
      ) : units.length === 0 ? (
        <div className="units-empty">
          <div className="units-empty__icon">📦</div>
          <p>No units found. Create the first unit to get started.</p>
        </div>
      ) : (
        <>
          <div className="units-stats">
            <div className="units-stat">
              <div className="units-stat__icon units-stat__icon--total">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              </div>
              <div className="units-stat__info">
                <span className="units-stat__label">Total</span>
                <span className="units-stat__value">{stats.total}</span>
              </div>
            </div>

            <div className="units-stat">
              <div className="units-stat__icon units-stat__icon--free">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="units-stat__info">
                <span className="units-stat__label">Available</span>
                <span className="units-stat__value">{stats.livre}</span>
              </div>
            </div>

            <div className="units-stat">
              <div className="units-stat__icon units-stat__icon--occupied">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div className="units-stat__info">
                <span className="units-stat__label">Occupied</span>
                <span className="units-stat__value">{stats.ocupada}</span>
              </div>
            </div>

            <div className="units-stat">
              <div className="units-stat__icon units-stat__icon--reserved">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="units-stat__info">
                <span className="units-stat__label">Reserved</span>
                <span className="units-stat__value">{stats.reservada}</span>
              </div>
            </div>
          </div>

          <div className="units-table-wrapper">
            <div className="units-table-toolbar">
              <span className="units-table-title">Units</span>
              <div className="units-table-actions">
                <select
                  className="units-table-filter"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="">All status</option>
                  {STATUS_OPTIONS.map((statusOption) => (
                    <option key={statusOption.value} value={statusOption.value}>
                      {statusOption.label}
                    </option>
                  ))}
                </select>
                <label className="units-search">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="16.65" y1="16.65" x2="21" y2="21" />
                  </svg>
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search"
                    aria-label="Search units"
                  />
                </label>
              </div>
            </div>
            <table className="units-table">
              <thead>
                <tr>
                  <th>Unit</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUnits.map((unit) => (
                  <tr key={unit.id}>
                    <td>
                      <strong>{unit.unit_number}</strong>
                    </td>
                    <td>{unitTypeMap.get(unit.unit_type) ?? unit.unit_type ?? "-"}</td>
                    <td>
                      <span className={`units-status units-status--${unit.status.toLowerCase()}`}>
                        <span className="units-status-dot" />
                        {unit.status === "LIVRE" && "Livre"}
                        {unit.status === "OCUPADA" && "Ocupada"}
                        {unit.status === "RESERVADA" && "Reservada"}
                        {unit.status === "BLOQUEADA" && "Bloqueada"}
                        {unit.status === "EM_VISTORIA" && "Em Vistoria"}
                      </span>
                    </td>
                    <td>{unit.reservation_expires_at ? new Date(unit.reservation_expires_at).toLocaleDateString() : "-"}</td>
                    <td>
                      <div className="units-actions">
                        <button
                          type="button"
                          className="units-icon-button"
                          onClick={() => openEditModal(unit)}
                          aria-label="Edit unit"
                          title="Edit"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M3 21h6l12-12a2.1 2.1 0 0 0-3-3L6 18l-3 3z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="units-icon-button units-icon-button--danger"
                          onClick={() => handleDelete(unit)}
                          disabled={deletingIds.has(unit.id)}
                          aria-label="Delete unit"
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
            <div className="units-table-footer">
              Showing {filteredUnits.length === 0 ? 0 : 1} to {filteredUnits.length} of{" "}
              {units.length} entries
            </div>
          </div>
        </>
      )}

      {isModalOpen && (
        <div
          className="units-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="units-modal-title"
        >
          <div className="units-modal__overlay" onClick={closeModal} />
          <div className="units-modal__panel" ref={modalPanelRef}>
            <div className="units-modal__header">
              <h2 id="units-modal-title">{editingUnit ? "Edit unit" : "Add unit"}</h2>
              <button type="button" className="units-modal__close" onClick={closeModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form className="units-form" onSubmit={handleSubmit(onSubmit)}>
              <label className="units-field">
                <span>Unit Type</span>
                <select
                  {...unitTypeRegister}
                  className={errors.unit_type ? "units-input units-input--error" : "units-input"}
                  ref={(node) => {
                    unitTypeRegister.ref(node);
                    modalFirstInputRef.current = node;
                  }}
                >
                  <option value="">Select a unit type</option>
                  {unitTypes.map((ut) => (
                    <option key={ut.id} value={ut.id}>
                      {ut.name}
                    </option>
                  ))}
                </select>
                {errors.unit_type && (
                  <span className="units-error">{errors.unit_type.message}</span>
                )}
              </label>

              <label className="units-field">
                <span>Unit Number</span>
                <input
                  type="text"
                  {...unitNumberRegister}
                  className={errors.unit_number ? "units-input units-input--error" : "units-input"}
                  placeholder="e.g., A-101"
                />
                {errors.unit_number && (
                  <span className="units-error">{errors.unit_number.message}</span>
                )}
              </label>

              <label className="units-field">
                <span>Status</span>
                <select {...register("status")} className="units-input">
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              {watchedStatus === "RESERVADA" && (
                <label className="units-field">
                  <span>Reservation Expires At</span>
                  <input
                    type="datetime-local"
                    {...register("reservation_expires_at")}
                    className="units-input"
                  />
                </label>
              )}

              {formError && <div className="units-alert units-alert--error">{formError}</div>}

              <div className="units-form__actions">
                <button type="button" className="units-button" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="units-primary" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingUnit ? "Update unit" : "Create unit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
