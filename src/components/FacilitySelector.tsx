import React, { useEffect, useState } from "react";
import { apiClient } from "@/api/client";
import { useFacility } from "@/shared/facility/useFacility";

export default function FacilitySelector() {
  const { facilities, selectedFacilityId, setSelectedFacilityId } = useFacility();
  const [localSelectedId, setLocalSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setLocalSelectedId(selectedFacilityId);
  }, [selectedFacilityId]);

  return (
    <label className="facility-selector" htmlFor="facility-selector">
      <span className="facility-selector__label">Facility</span>
      <select
        id="facility-selector"
        value={localSelectedId ?? ""}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
          const nextId = event.target.value || null;
          setLocalSelectedId(nextId);
          setSelectedFacilityId(nextId);
          if (nextId) {
            apiClient.defaults.headers.common["X-Facility-ID"] = nextId;
          }
        }}
      >
        <option value="" disabled>
          Select a facility
        </option>
        {facilities.map((facility) => (
          <option key={facility.id} value={String(facility.id)}>
            {facility.name}
          </option>
        ))}
      </select>
    </label>
  );
}
