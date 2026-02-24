export const FACILITY_STORAGE_KEY = "currentFacilityId";

export function readStoredFacilityId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(FACILITY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeStoredFacilityId(facilityId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (facilityId) {
      window.localStorage.setItem(FACILITY_STORAGE_KEY, facilityId);
    } else {
      window.localStorage.removeItem(FACILITY_STORAGE_KEY);
    }
  } catch {
    // Storage might be unavailable in private mode.
  }
}
