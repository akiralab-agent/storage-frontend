import { useEffect, useState } from "react";
import { useAuth } from "@/shared/auth";
import { readStoredFacilityId, writeStoredFacilityId } from "@/shared/facility/storage";

type Facility = {
  id: string | number;
  name: string;
};

export function useFacility() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacilityId, setSelectedFacilityIdState] = useState<string | null>(() => {
    return readStoredFacilityId();
  });
  const { user, isAuthenticated } = useAuth();

  const setSelectedFacilityId = (facilityId: string | null) => {
    setSelectedFacilityIdState(facilityId);
    writeStoredFacilityId(facilityId);
  };

  // Sync facilities from user profile
  useEffect(() => {
    if (!isAuthenticated || !user?.facilities?.length) {
      setFacilities([]);
      setSelectedFacilityIdState(null);
      writeStoredFacilityId(null);
      return;
    }

    setFacilities(user.facilities);

    // Ensure selected facility is valid
    const current = readStoredFacilityId();
    if (current && user.facilities.some((f) => String(f.id) === current)) {
      setSelectedFacilityIdState(current);
    } else {
      const firstId = String(user.facilities[0].id);
      setSelectedFacilityIdState(firstId);
      writeStoredFacilityId(firstId);
    }
  }, [isAuthenticated, user]);

  return {
    facilities,
    selectedFacilityId,
    setSelectedFacilityId
  };
}
