import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { apiClient } from "@/api/client";
import { unitsApi, unitTypesApi } from "@/api/units";
import type { UnitRecord, UnitType } from "@/api/units";
import "@/pages/LeadConvert.css";

const STEP_TENANT = 0;
const STEP_UNIT = 1;
const STEP_CONTRACT = 2;
const STEP_CONFIRM = 3;

const STEP_LABELS = ["Tenant Data", "Unit Selection", "Contract Terms", "Confirmation"];

type Lead = {
  id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_primary: string | null;
  source: string | null;
  stage: string;
};

type TenantFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  phone_primary: string;
  document: string;
  category: string;
  address: string;
  address_city: string;
  address_state: string;
  address_zip: string;
};

type ContractFormValues = {
  unit_id: string;
  move_in: string;
  move_out: string;
  monthly_rate: string;
  deposit_amount: string;
  terms: string;
  notes: string;
};

const DEFAULT_TENANT_VALUES: TenantFormValues = {
  first_name: "",
  last_name: "",
  email: "",
  phone_primary: "",
  document: "",
  category: "",
  address: "",
  address_city: "",
  address_state: "",
  address_zip: ""
};

const DEFAULT_CONTRACT_VALUES: ContractFormValues = {
  unit_id: "",
  move_in: "",
  move_out: "",
  monthly_rate: "",
  deposit_amount: "",
  terms: "",
  notes: ""
};

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatCurrency(value: number | null | string): string {
  if (value === null || value === undefined || value === "") return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(num);
}

export default function LeadConvertPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(STEP_TENANT);
  const [selectedUnit, setSelectedUnit] = useState<UnitRecord | null>(null);

  const tenantForm = useForm<TenantFormValues>({
    defaultValues: DEFAULT_TENANT_VALUES
  });

  const contractForm = useForm<ContractFormValues>({
    defaultValues: DEFAULT_CONTRACT_VALUES
  });

  const unitTypeMap = useMemo(() => new Map(unitTypes.map((ut) => [ut.id, ut])), [unitTypes]);

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
        const [leadResponse, unitList, typeList] = await Promise.all([
          apiClient.get(`/api/v1/leads/${id}/`),
          unitsApi.list(),
          unitTypesApi.list()
        ]);

        if (!isMounted) {
          return;
        }

        const leadData = leadResponse.data as Lead;

        setLead(leadData);
        setUnits(unitList);
        setUnitTypes(typeList);

        tenantForm.reset({
          first_name: leadData.first_name || "",
          last_name: leadData.last_name || "",
          email: leadData.email || "",
          phone_primary: leadData.phone_primary || "",
          document: "",
          category: "",
          address: "",
          address_city: "",
          address_state: "",
          address_zip: ""
        });
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (axios.isAxiosError(error) && error.response?.status === 404) {
          setLoadError("Lead not found.");
        } else {
          setLoadError("Unable to load lead data. Please try again.");
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
  }, [id]);

  const handleBack = () => {
    if (currentStep > STEP_TENANT) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate(`/leads/${id}`);
    }
  };

  const handleTenantSubmit = (values: TenantFormValues) => {
    setValidationError(null);
    setCurrentStep(STEP_UNIT);
  };

  const handleTenantError = () => {
    const errors = tenantForm.formState.errors;
    const messages = Object.values(errors)
      .filter((e) => e?.message)
      .map((e) => e.message)
      .join(", ");
    setValidationError(messages || "Please fill in all required fields.");
  };

  const handleUnitSelect = (unit: UnitRecord) => {
    setSelectedUnit(unit);
    contractForm.setValue("unit_id", String(unit.id));
    setValidationError(null);
    setCurrentStep(STEP_CONTRACT);
  };

  const handleContractSubmit = (values: ContractFormValues) => {
    setValidationError(null);
    setCurrentStep(STEP_CONFIRM);
  };

  const handleContractError = () => {
    const errors = contractForm.formState.errors;
    const messages = Object.values(errors)
      .filter((e) => e?.message)
      .map((e) => e.message)
      .join(", ");
    setValidationError(messages || "Please fill in all required fields.");
  };

  const handleFinalSubmit = async () => {
    if (!lead) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const tenantValues = tenantForm.getValues();
    const contractValues = contractForm.getValues();

    const payload = {
      tenant: {
        first_name: tenantValues.first_name,
        last_name: tenantValues.last_name,
        email: tenantValues.email || null,
        phone_primary: tenantValues.phone_primary || null,
        document: tenantValues.document || null,
        category: tenantValues.category || null,
        address: tenantValues.address || null,
        address_city: tenantValues.address_city || null,
        address_state: tenantValues.address_state || null,
        address_zip: tenantValues.address_zip || null
      },
      contract: {
        unit: parseInt(contractValues.unit_id, 10),
        move_in: contractValues.move_in,
        move_out: contractValues.move_out || null,
        monthly_rate: contractValues.monthly_rate ? parseFloat(contractValues.monthly_rate) : null,
        deposit_amount: contractValues.deposit_amount ? parseFloat(contractValues.deposit_amount) : null,
        terms: contractValues.terms || null,
        notes: contractValues.notes || null
      }
    };

    try {
      const response = await apiClient.post(`/api/v1/leads/${lead.id}/convert/`, payload);
      const tenantId = response.data?.tenant?.id || response.data?.id;
      if (tenantId) {
        navigate(`/tenants/${tenantId}`);
      } else {
        navigate("/leads");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorData = error.response?.data;
        if (errorData && typeof errorData === "object") {
          const messages = Object.entries(errorData)
            .map(([field, errors]) => {
              if (typeof errors === "string") {
                return `${field}: ${errors}`;
              }
              if (Array.isArray(errors)) {
                return `${field}: ${errors.join(", ")}`;
              }
              return `${field}: ${JSON.stringify(errors)}`;
            })
            .join("; ");
          setSubmitError(messages || "Unable to convert lead. Please check the data and try again.");
        } else {
          setSubmitError("Unable to convert lead. Please check the data and try again.");
        }
      } else {
        setSubmitError("Unexpected error while converting lead.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableUnits = useMemo(() => {
    return units.filter((unit) => unit.status === "LIVRE");
  }, [units]);

  if (isLoading) {
    return (
      <main className="lead-convert-page">
        <div className="lead-convert-loading">Loading conversion wizard...</div>
      </main>
    );
  }

  if (loadError && !lead) {
    return (
      <main className="lead-convert-page">
        <div className="lead-convert-error">
          <p>{loadError}</p>
          <button type="button" className="lead-convert-button" onClick={() => navigate("/leads")}>
            Back to Leads
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="lead-convert-page">
      <header className="lead-convert-header">
        <button type="button" className="lead-convert-back" onClick={handleBack}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>
        <div className="lead-convert-header__title">
          <h1>Convert Lead to Tenant</h1>
          <p className="lead-convert-subtitle">
            {lead?.first_name} {lead?.last_name}
          </p>
        </div>
      </header>

      <nav className="lead-convert-steps">
        {STEP_LABELS.map((label, index) => (
          <div
            key={label}
            className={`lead-convert-step ${index === currentStep ? "lead-convert-step--active" : ""} ${
              index < currentStep ? "lead-convert-step--completed" : ""
            }`}
          >
            <span className="lead-convert-step__number">
              {index < currentStep ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                index + 1
              )}
            </span>
            <span className="lead-convert-step__label">{label}</span>
          </div>
        ))}
      </nav>

      {submitError && <div className="lead-convert-alert lead-convert-alert--error">{submitError}</div>}
      {validationError && (
        <div className="lead-convert-alert lead-convert-alert--error">
          <strong>Validation Error:</strong> {validationError}
        </div>
      )}

      <div className="lead-convert-content">
        {currentStep === STEP_TENANT && (
          <form className="lead-convert-form" onSubmit={tenantForm.handleSubmit(handleTenantSubmit, handleTenantError)}>
            <section className="lead-convert-section">
              <h2>Tenant Information</h2>
              <p className="lead-convert-section__description">
                Review and complete the tenant's personal information.
              </p>

              <div className="lead-convert-grid">
                <label className="lead-convert-field">
                  <span>First Name *</span>
                  <input
                    type="text"
                    {...tenantForm.register("first_name", { required: "First name is required." })}
                    className="lead-convert-input"
                  />
                </label>

                <label className="lead-convert-field">
                  <span>Last Name *</span>
                  <input
                    type="text"
                    {...tenantForm.register("last_name", { required: "Last name is required." })}
                    className="lead-convert-input"
                  />
                </label>

                <label className="lead-convert-field">
                  <span>Email</span>
                  <input type="email" {...tenantForm.register("email")} className="lead-convert-input" />
                </label>

                <label className="lead-convert-field">
                  <span>Primary Phone</span>
                  <input type="tel" {...tenantForm.register("phone_primary")} className="lead-convert-input" />
                </label>

                <label className="lead-convert-field">
                  <span>SSN / EIN *</span>
                  <input
                    type="text"
                    {...tenantForm.register("document", { required: "Document is required." })}
                    className="lead-convert-input"
                    placeholder="SSN or EIN"
                  />
                </label>

                <label className="lead-convert-field">
                  <span>Customer Type *</span>
                  <select
                    {...tenantForm.register("category", { required: "Category is required." })}
                    className="lead-convert-input"
                  >
                    <option value="">Select type</option>
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="BUSINESS">Business</option>
                  </select>
                </label>

                <label className="lead-convert-field">
                  <span>Address *</span>
                  <input
                    type="text"
                    {...tenantForm.register("address", { required: "Address is required." })}
                    className="lead-convert-input"
                    placeholder="Full address"
                  />
                </label>

                <label className="lead-convert-field">
                  <span>Address Street</span>
                  <input
                    type="text"
                    {...tenantForm.register("address_street")}
                    className="lead-convert-input"
                    placeholder="Street address"
                  />
                </label>

                <label className="lead-convert-field">
                  <span>City</span>
                  <input type="text" {...tenantForm.register("address_city")} className="lead-convert-input" />
                </label>

                <label className="lead-convert-field">
                  <span>State</span>
                  <input type="text" {...tenantForm.register("address_state")} className="lead-convert-input" />
                </label>

                <label className="lead-convert-field">
                  <span>ZIP Code</span>
                  <input type="text" {...tenantForm.register("address_zip")} className="lead-convert-input" />
                </label>
              </div>
            </section>

            <div className="lead-convert-actions">
              <button type="button" className="lead-convert-button" onClick={handleBack}>
                Cancel
              </button>
              <button type="submit" className="lead-convert-primary">
                Continue
              </button>
            </div>
          </form>
        )}

        {currentStep === STEP_UNIT && (
          <section className="lead-convert-section">
            <h2>Select Unit</h2>
            <p className="lead-convert-section__description">
              Choose an available unit for this tenant.
            </p>

            {availableUnits.length === 0 ? (
              <div className="lead-convert-empty">
                <p>No available units found.</p>
                <button type="button" className="lead-convert-button" onClick={() => navigate("/units")}>
                  View Units
                </button>
              </div>
            ) : (
              <div className="lead-convert-units">
                {availableUnits.map((unit) => {
                  const unitType = unitTypeMap.get(unit.unit_type);
                  const dimensions = unitType
                    ? `${unitType.width || "-"} x ${unitType.depth || "-"} x ${unitType.height || "-"} m`
                    : null;
                  return (
                    <button
                      key={unit.id}
                      type="button"
                      className="lead-convert-unit-card"
                      onClick={() => handleUnitSelect(unit)}
                    >
                      <div className="lead-convert-unit-card__header">
                        <span className="lead-convert-unit-card__name">{unit.unit_number}</span>
                        <span className="lead-convert-unit-card__price">
                          {unitType?.base_price ? formatCurrency(unitType.base_price) : "-"}
                        </span>
                      </div>
                      <div className="lead-convert-unit-card__body">
                        <span className="lead-convert-unit-card__type">
                          {unitType?.name || `Type ${unit.unit_type}`}
                        </span>
                      </div>
                      <div className="lead-convert-unit-card__details">
                        {dimensions && (
                          <span className="lead-convert-unit-card__dimension">{dimensions}</span>
                        )}
                        <span className="lead-convert-unit-card__status">
                          {unit.status === "LIVRE" ? "Available" : unit.status}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="lead-convert-actions">
              <button type="button" className="lead-convert-button" onClick={() => setCurrentStep(STEP_TENANT)}>
                Back
              </button>
            </div>
          </section>
        )}

        {currentStep === STEP_CONTRACT && (
          <form className="lead-convert-form" onSubmit={contractForm.handleSubmit(handleContractSubmit, handleContractError)}>
            <section className="lead-convert-section">
              <h2>Contract Terms</h2>
              <p className="lead-convert-section__description">
                Define the contract terms for this tenant.
              </p>

              <div className="lead-convert-unit-summary">
                <h3>Selected Unit</h3>
                <div className="lead-convert-unit-summary__details">
                  <span className="lead-convert-unit-summary__name">
                    {selectedUnit?.unit_number}
                  </span>
                  <span className="lead-convert-unit-summary__type">
                    {selectedUnit ? unitTypeMap.get(selectedUnit.unit_type)?.name || `Type ${selectedUnit.unit_type}` : "-"}
                  </span>
                  {selectedUnit && unitTypeMap.get(selectedUnit.unit_type)?.base_price && (
                    <span className="lead-convert-unit-summary__price">
                      {formatCurrency(unitTypeMap.get(selectedUnit.unit_type)!.base_price!)}/mo
                    </span>
                  )}
                </div>
                {selectedUnit && unitTypeMap.get(selectedUnit.unit_type) && (
                  <div className="lead-convert-unit-summary__dimensions">
                    {unitTypeMap.get(selectedUnit.unit_type)?.width && (
                      <span>{unitTypeMap.get(selectedUnit.unit_type)!.width}m (W)</span>
                    )}
                    {unitTypeMap.get(selectedUnit.unit_type)?.depth && (
                      <span>{unitTypeMap.get(selectedUnit.unit_type)!.depth}m (D)</span>
                    )}
                    {unitTypeMap.get(selectedUnit.unit_type)?.height && (
                      <span>{unitTypeMap.get(selectedUnit.unit_type)!.height}m (H)</span>
                    )}
                  </div>
                )}
              </div>

              <div className="lead-convert-grid">
                <label className="lead-convert-field">
                  <span>Move-in Date *</span>
                  <input
                    type="date"
                    {...contractForm.register("move_in", { required: "Move-in date is required." })}
                    className="lead-convert-input"
                    min={formatDate(new Date())}
                  />
                </label>

                <label className="lead-convert-field">
                  <span>Move-out Date</span>
                  <input type="date" {...contractForm.register("move_out")} className="lead-convert-input" />
                </label>

                <label className="lead-convert-field">
                  <span>Monthly Rate *</span>
                  <input
                    type="number"
                    step="0.01"
                    {...contractForm.register("monthly_rate", { required: "Monthly rate is required." })}
                    className="lead-convert-input"
                    placeholder="0.00"
                  />
                </label>

                <label className="lead-convert-field">
                  <span>Deposit Amount</span>
                  <input
                    type="number"
                    step="0.01"
                    {...contractForm.register("deposit_amount")}
                    className="lead-convert-input"
                    placeholder="0.00"
                  />
                </label>
              </div>

              <label className="lead-convert-field lead-convert-field--full">
                <span>Terms *</span>
                <textarea
                  {...contractForm.register("terms", { required: "Terms are required." })}
                  className="lead-convert-input lead-convert-textarea"
                  rows={3}
                  placeholder="Contract terms and conditions..."
                />
              </label>

              <label className="lead-convert-field lead-convert-field--full">
                <span>Notes</span>
                <textarea
                  {...contractForm.register("notes")}
                  className="lead-convert-input lead-convert-textarea"
                  rows={2}
                  placeholder="Additional notes..."
                />
              </label>
            </section>

            <div className="lead-convert-actions">
              <button type="button" className="lead-convert-button" onClick={() => setCurrentStep(STEP_UNIT)}>
                Back
              </button>
              <button type="submit" className="lead-convert-primary">
                Continue
              </button>
            </div>
          </form>
        )}

        {currentStep === STEP_CONFIRM && (
          <section className="lead-convert-section">
            <h2>Confirmation</h2>
            <p className="lead-convert-section__description">
              Review the information below and confirm the conversion.
            </p>

            <div className="lead-convert-summary">
              <div className="lead-convert-summary__block">
                <h3>Tenant Information</h3>
                <dl className="lead-convert-summary__list">
                  <div className="lead-convert-summary__item">
                    <dt>Name</dt>
                    <dd>
                      {tenantForm.getValues("first_name")} {tenantForm.getValues("last_name")}
                    </dd>
                  </div>
                  <div className="lead-convert-summary__item">
                    <dt>Email</dt>
                    <dd>{tenantForm.getValues("email") || "-"}</dd>
                  </div>
                  <div className="lead-convert-summary__item">
                    <dt>Phone</dt>
                    <dd>{tenantForm.getValues("phone_primary") || "-"}</dd>
                  </div>
                  <div className="lead-convert-summary__item">
                    <dt>Document</dt>
                    <dd>{tenantForm.getValues("document") || "-"}</dd>
                  </div>
                  <div className="lead-convert-summary__item">
                    <dt>Customer Type</dt>
                    <dd>
                      {tenantForm.getValues("category") === "INDIVIDUAL"
                        ? "Individual"
                        : tenantForm.getValues("category") === "BUSINESS"
                        ? "Business"
                        : tenantForm.getValues("category") || "-"}
                    </dd>
                  </div>
                  <div className="lead-convert-summary__item">
                    <dt>Address</dt>
                    <dd>{tenantForm.getValues("address") || "-"}</dd>
                  </div>
                  <div className="lead-convert-summary__item">
                    <dt>Address Details</dt>
                    <dd>
                      {[
                        tenantForm.getValues("address_street"),
                        tenantForm.getValues("address_city"),
                        tenantForm.getValues("address_state"),
                        tenantForm.getValues("address_zip")
                      ]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="lead-convert-summary__block">
                <h3>Contract Details</h3>
                <dl className="lead-convert-summary__list">
                  <div className="lead-convert-summary__item">
                    <dt>Unit</dt>
                    <dd>{selectedUnit?.unit_number || "-"}</dd>
                  </div>
                  <div className="lead-convert-summary__item">
                    <dt>Unit Type</dt>
                    <dd>{selectedUnit ? unitTypeMap.get(selectedUnit.unit_type)?.name || `Type ${selectedUnit.unit_type}` : "-"}</dd>
                  </div>
                  <div className="lead-convert-summary__item">
                    <dt>Dimensions</dt>
                    <dd>
                      {selectedUnit && unitTypeMap.get(selectedUnit.unit_type)
                        ? `${unitTypeMap.get(selectedUnit.unit_type)!.width || "-"} x ${unitTypeMap.get(selectedUnit.unit_type)!.depth || "-"} x ${unitTypeMap.get(selectedUnit.unit_type)!.height || "-"} m`
                        : "-"}
                    </dd>
                  </div>
                  <div className="lead-convert-summary__item">
                    <dt>Base Price</dt>
                    <dd>{selectedUnit && unitTypeMap.get(selectedUnit.unit_type)?.base_price ? formatCurrency(unitTypeMap.get(selectedUnit.unit_type)!.base_price!) : "-"}</dd>
                  </div>
                  <div className="lead-convert-summary__item">
                    <dt>Move-in Date</dt>
                    <dd>{contractForm.getValues("move_in") || "-"}</dd>
                  </div>
                  <div className="lead-convert-summary__item">
                    <dt>Move-out Date</dt>
                    <dd>{contractForm.getValues("move_out") || "-"}</dd>
                  </div>
                  <div className="lead-convert-summary__item">
                    <dt>Monthly Rate</dt>
                    <dd>{formatCurrency(contractForm.getValues("monthly_rate"))}</dd>
                  </div>
                  <div className="lead-convert-summary__item">
                    <dt>Deposit</dt>
                    <dd>{formatCurrency(contractForm.getValues("deposit_amount"))}</dd>
                  </div>
                  <div className="lead-convert-summary__item">
                    <dt>Terms</dt>
                    <dd>{contractForm.getValues("terms") || "-"}</dd>
                  </div>
                  {contractForm.getValues("notes") && (
                    <div className="lead-convert-summary__item">
                      <dt>Notes</dt>
                      <dd>{contractForm.getValues("notes")}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            <div className="lead-convert-actions">
              <button type="button" className="lead-convert-button" onClick={() => setCurrentStep(STEP_CONTRACT)}>
                Back
              </button>
              <button
                type="button"
                className="lead-convert-primary lead-convert-primary--success"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Converting..." : "Confirm & Convert"}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}