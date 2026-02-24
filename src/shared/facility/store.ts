import { create } from "zustand";

type FacilityState = {
  selectedFacilityId: string | null;
  setSelectedFacilityId: (facilityId: string | null) => void;
};

export const useFacilityStore = create<FacilityState>((set) => ({
  selectedFacilityId: null,
  setSelectedFacilityId: (facilityId) => set({ selectedFacilityId: facilityId })
}));

export function getSelectedFacilityId() {
  return useFacilityStore.getState().selectedFacilityId;
}
