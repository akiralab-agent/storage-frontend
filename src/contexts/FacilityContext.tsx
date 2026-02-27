import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/shared/auth";
import { readStoredFacilityId, writeStoredFacilityId } from "@/shared/facility/storage";

type Facility = {
  id: string | number;
  name: string;
};

type FacilityContextValue = {
  facilities: Facility[];
  selectedFacilityId: string | null;
  setSelectedFacilityId: (id: string | null) => void;
};

const FacilityContext = createContext<FacilityContextValue | null>(null);

export function FacilityProvider({ children }: { children: ReactNode }) {
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

  return (
    <FacilityContext.Provider
      value={{
        facilities,
        selectedFacilityId,
        setSelectedFacilityId
      }}
    >
      {children}
    </FacilityContext.Provider>
  );
}

export function useFacility() {
  const context = useContext(FacilityContext);
  if (!context) {
    throw new Error("useFacility must be used within a FacilityProvider");
  }
  return context;
}
