import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/api/client";
import { useAuth } from "@/shared/auth";
import { useFacilityStore } from "@/shared/facility/store";
import { readStoredFacilityId, writeStoredFacilityId } from "@/shared/facility/storage";

type Facility = {
  id: string | number;
  name: string;
};

function applyFacilityHeader(facilityId: string | null) {
  if (facilityId) {
    apiClient.defaults.headers.common["X-Facility-ID"] = facilityId;
  } else {
    delete apiClient.defaults.headers.common["X-Facility-ID"];
  }
}

export function useFacility() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityId, setSelectedFacilityIdState] = useState<string | null>(null);
  const setGlobalFacilityId = useFacilityStore((state) => state.setSelectedFacilityId);
  const { isAuthenticated } = useAuth();

  const setSelectedFacilityId = useCallback(
    (facilityId: string | null) => {
      setSelectedFacilityIdState(facilityId);
      setGlobalFacilityId(facilityId);
      writeStoredFacilityId(facilityId);
      applyFacilityHeader(facilityId);
    },
    [setGlobalFacilityId]
  );

  useEffect(() => {
    const saved = readStoredFacilityId();
    if (saved) {
      setSelectedFacilityId(saved);
    }
  }, [setSelectedFacilityId]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let isActive = true;

    apiClient
      .get("/api/facilities/")
      .then((response) => {
        if (!isActive) {
          return;
        }
        const data = Array.isArray(response.data) ? response.data : [];
        setFacilities(data);
      })
      .catch(() => {
        if (isActive) {
          setFacilities([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isAuthenticated]);

  return {
    facilities,
    selectedFacilityId,
    setSelectedFacilityId
  };
}
