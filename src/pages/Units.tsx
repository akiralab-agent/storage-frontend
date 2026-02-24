import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { unitsApi, unitTypesApi } from "@/api/units";
import type { UnitRecord, UnitPayload, UnitStatus, UnitType } from "@/api/units";
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
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitRecord | null>(null);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
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

  const unitTypeMap = useMemo(
    () => new Map(unitTypes.map((ut) => [ut.id, ut.name])),
    [unitTypes]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [unitList, typeList] = await Promise.all([
          unitsApi.list(),
          unitTypesApi.list()
        ]);

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
  }, []);

  const openCreateModal = () => {
    setEditingUnit(null);
    reset(DEFAULT_FORM_VALUES);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (unit: UnitRecord) => {
    setEditingUnit(unit);
    reset({
      unit_type: unit.unit_type,
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
      unit_type: values.unit_type,
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

  const formatStatus = (status: UnitStatus) => {
    const option = STATUS_OPTIONS.find((s) => s.value === status);
    return option ? option.label : status;
  };

  return (
    <main className="units-page">
      <header className="units-header">
        <div>
          <h1>Units</h1>
          <p className="units-subtitle">Manage storage units for the current facility.</p>
        </div>
        <button type="button" className="units-primary" onClick={openCreateModal}>
          Add unit
        </button>
      </header>

      {loadError && <div className="units-alert units-alert--error">{loadError}</div>}
      {pageSuccess && <div className="units-alert units-alert--success">{pageSuccess}</div>}

      {isLoading ? (
        <div className="units-empty">Loading units...</div>
      ) : units.length === 0 ? (
        <div className="units-empty">No units found. Create the first unit.</div>
      ) : (
        <div className="units-table-wrapper">
          <table className="units-table">
            <thead>
              <tr>
                <th>Unit Number</th>
                <th>Unit Type</th>
                <th>Status</th>
                <th>Reservation Expires</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id}>
                  <td>{unit.unit_number}</td>
                  <td>{unitTypeMap.get(unit.unit_type) ?? unit.unit_type ?? "-"}</td>
                  <td>{formatStatus(unit.status)}</td>
                  <td>{unit.reservation_expires_at ?? "-"}</td>
                  <td>
                    <div className="units-actions">
                      <button
                        type="button"
                        className="units-button"
                        onClick={() => openEditModal(unit)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="units-button units-button--danger"
                        onClick={() => handleDelete(unit)}
                        disabled={deletingIds.has(unit.id)}
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
          className="units-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="units-modal-title"
        >
          <div className="units-modal__overlay" onClick={closeModal} />
          <div className="units-modal__panel" ref={modalPanelRef}>
            <div className="units-modal__header">
              <div>
                <h2 id="units-modal-title">{editingUnit ? "Edit unit" : "Add unit"}</h2>
                <p className="units-subtitle">Set unit details.</p>
              </div>
              <button type="button" className="units-button" onClick={closeModal}>
                Close
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
                  className={
                    errors.unit_number ? "units-input units-input--error" : "units-input"
                  }
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
