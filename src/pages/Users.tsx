import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useForm } from "react-hook-form";
import { apiClient } from "@/api/client";
import "@/pages/Users.css";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "MANAGER", label: "Manager" },
  { value: "OPERATOR", label: "Operator" },
  { value: "ATTENDANCE", label: "Attendance" },
  { value: "FINANCIAL", label: "Financial" }
];

type FacilityOption = {
  id: string;
  name: string;
};

type UserOption = {
  id: string;
  email: string;
};

type UserProfile = {
  id: string;
  user?: UserOption | string | null;
  user_id?: string | null;
  user_email?: string | null;
  role?: string | null;
  facilities?: Array<FacilityOption | string> | null;
};

type UserFormValues = {
  userId: string;
  role: string;
  facilityIds: string[];
};

const DEFAULT_FORM_VALUES: UserFormValues = {
  userId: "",
  role: "",
  facilityIds: []
};

function normalizeList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === "object" && "results" in payload) {
    const results = (payload as { results?: T[] }).results;
    if (Array.isArray(results)) {
      return results;
    }
  }

  return [];
}

function normalizeUser(profile: UserProfile): UserOption | null {
  if (profile.user && typeof profile.user === "object") {
    const user = profile.user as UserOption;
    if (user.id && user.email) {
      return user;
    }
  }

  const id = profile.user_id ?? (typeof profile.user === "string" ? profile.user : "");
  const email = profile.user_email ?? (profile as { email?: string }).email ?? "";

  if (id && email) {
    return { id, email };
  }

  return null;
}

function normalizeFacilityId(facility: FacilityOption | string): string {
  return typeof facility === "string" ? facility : facility.id;
}

function normalizeFacilityName(
  facility: FacilityOption | string,
  facilityMap: Map<string, string>
): string {
  if (typeof facility === "string") {
    return facilityMap.get(facility) ?? facility;
  }

  return facility.name ?? facilityMap.get(facility.id) ?? facility.id;
}

function getFacilityValidationMessage(role: string, facilityIds: string[]): string | null {
  if (!role) {
    return null;
  }

  const count = facilityIds.length;

  if (["OPERATOR", "ATTENDANCE", "FINANCIAL"].includes(role)) {
    return count === 1 ? null : "This role requires exactly 1 facility.";
  }

  if (role === "MANAGER") {
    return count >= 1 ? null : "This role requires at least 1 facility.";
  }

  if (role === "ADMIN") {
    return count === 0 ? null : "Admins should not be assigned to facilities.";
  }

  return null;
}

export default function UsersPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [facilities, setFacilities] = useState<FacilityOption[]>([]);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors }
  } = useForm<UserFormValues>({
    defaultValues: DEFAULT_FORM_VALUES
  });

  const selectedRole = watch("role");
  const selectedFacilities = watch("facilityIds");
  const facilityMap = useMemo(
    () => new Map(facilities.map((facility) => [facility.id, facility.name])),
    [facilities]
  );

  const roleLabelMap = useMemo(() => {
    return new Map(ROLE_OPTIONS.map((role) => [role.value, role.label]));
  }, []);

  useEffect(() => {
    if (selectedRole === "ADMIN" && selectedFacilities.length > 0) {
      setValue("facilityIds", []);
    }
  }, [selectedRole, selectedFacilities, setValue]);

  useEffect(() => {
    const validationMessage = getFacilityValidationMessage(selectedRole, selectedFacilities);
    if (validationMessage) {
      setError("facilityIds", { type: "validate", message: validationMessage });
    } else {
      clearErrors("facilityIds");
    }
  }, [selectedRole, selectedFacilities, setError, clearErrors]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      setLoadError(null);

      try {
        const [profilesResponse, facilitiesResponse] = await Promise.all([
          apiClient.get("/api/users/"),
          apiClient.get("/api/facilities/")
        ]);

        if (!isMounted) {
          return;
        }

        const profileList = normalizeList<UserProfile>(profilesResponse.data);
        const facilityList = normalizeList<FacilityOption>(facilitiesResponse.data);
        setProfiles(profileList);
        setFacilities(facilityList);

        const userMap = new Map<string, UserOption>();
        profileList.forEach((profile) => {
          const user = normalizeUser(profile);
          if (user) {
            userMap.set(user.id, user);
          }
        });

        setUserOptions(Array.from(userMap.values()));
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setLoadError("Unable to load users. Please try again.");
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
    setEditingProfile(null);
    reset(DEFAULT_FORM_VALUES);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (profile: UserProfile) => {
    const user = normalizeUser(profile);
    const facilityIds = (profile.facilities ?? []).map(normalizeFacilityId);

    setEditingProfile(profile);
    reset({
      userId: user?.id ?? "",
      role: profile.role ?? "",
      facilityIds
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProfile(null);
    reset(DEFAULT_FORM_VALUES);
  };

  const refreshProfiles = async () => {
    const response = await apiClient.get("/api/users/");
    const profileList = normalizeList<UserProfile>(response.data);
    setProfiles(profileList);

    const userMap = new Map<string, UserOption>();
    profileList.forEach((profile) => {
      const user = normalizeUser(profile);
      if (user) {
        userMap.set(user.id, user);
      }
    });

    setUserOptions(Array.from(userMap.values()));
  };

  const onSubmit = async (values: UserFormValues) => {
    setFormError(null);
    setPageSuccess(null);

    const validationMessage = getFacilityValidationMessage(values.role, values.facilityIds);
    if (validationMessage) {
      setError("facilityIds", { type: "validate", message: validationMessage });
      return;
    }

    if (!values.userId) {
      setError("userId", { type: "validate", message: "Please select a user." });
      return;
    }

    if (!values.role) {
      setError("role", { type: "validate", message: "Please select a role." });
      return;
    }

    const payload = {
      user: values.userId,
      role: values.role,
      facilities: values.facilityIds
    };

    setIsSaving(true);

    try {
      if (editingProfile) {
        await apiClient.put(`/api/users/${editingProfile.id}/`, payload);
        setPageSuccess("User updated successfully.");
      } else {
        await apiClient.post("/api/users/", payload);
        setPageSuccess("User created successfully.");
      }

      await refreshProfiles();
      closeModal();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        setFormError("Unable to save user. Please check the form and try again.");
      } else {
        setFormError("Unexpected error while saving user.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (profile: UserProfile) => {
    const user = normalizeUser(profile);
    const confirmLabel = user?.email ?? "this user";

    if (!window.confirm(`Delete ${confirmLabel}?`)) {
      return;
    }

    try {
      await apiClient.delete(`/api/users/${profile.id}/`);
      await refreshProfiles();
    } catch (error) {
      setLoadError("Unable to delete user. Please try again.");
    }
  };

  return (
    <main className="users-page">
      <header className="users-header">
        <div>
          <h1>Users</h1>
          <p className="users-subtitle">Manage roles and facility access for your team.</p>
        </div>
        <button type="button" className="users-primary" onClick={openCreateModal}>
          Add user
        </button>
      </header>

      {loadError && <div className="users-alert users-alert--error">{loadError}</div>}
      {pageSuccess && <div className="users-alert users-alert--success">{pageSuccess}</div>}

      {isLoading ? (
        <div className="users-empty">Loading users...</div>
      ) : profiles.length === 0 ? (
        <div className="users-empty">No users found. Create the first user profile.</div>
      ) : (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Facilities</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => {
                const user = normalizeUser(profile);
                const facilitiesLabel = (profile.facilities ?? [])
                  .map((facility) => normalizeFacilityName(facility, facilityMap))
                  .join(", ");
                const roleLabel = roleLabelMap.get(profile.role ?? "") ?? profile.role ?? "";

                return (
                  <tr key={profile.id}>
                    <td>{user?.email ?? "Unknown"}</td>
                    <td>{roleLabel || "-"}</td>
                    <td>{facilitiesLabel || "-"}</td>
                    <td>
                      <div className="users-actions">
                        <button
                          type="button"
                          className="users-button"
                          onClick={() => openEditModal(profile)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="users-button users-button--danger"
                          onClick={() => handleDelete(profile)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <div className="users-modal" role="dialog" aria-modal="true">
          <div className="users-modal__overlay" onClick={closeModal} />
          <div className="users-modal__panel">
            <div className="users-modal__header">
              <div>
                <h2>{editingProfile ? "Edit user" : "Add user"}</h2>
                <p className="users-subtitle">Set role and facility access.</p>
              </div>
              <button type="button" className="users-button" onClick={closeModal}>
                Close
              </button>
            </div>

            <form className="users-form" onSubmit={handleSubmit(onSubmit)}>
              <label className="users-field">
                <span>User</span>
                <select
                  {...register("userId")}
                  disabled={!!editingProfile}
                  className={errors.userId ? "users-input users-input--error" : "users-input"}
                >
                  <option value="">Select a user</option>
                  {userOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email} ({user.id})
                    </option>
                  ))}
                </select>
                {errors.userId && <span className="users-error">{errors.userId.message}</span>}
                {editingProfile && (
                  <span className="users-help">User cannot be changed once created.</span>
                )}
              </label>

              <label className="users-field">
                <span>Role</span>
                <select
                  {...register("role")}
                  className={errors.role ? "users-input users-input--error" : "users-input"}
                >
                  <option value="">Select role</option>
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                {errors.role && <span className="users-error">{errors.role.message}</span>}
              </label>

              <fieldset className="users-field">
                <legend>Facilities</legend>
                <div className="users-checkbox-grid">
                  {facilities.map((facility) => (
                    <label key={facility.id} className="users-checkbox">
                      <input
                        type="checkbox"
                        value={facility.id}
                        {...register("facilityIds")}
                        disabled={selectedRole === "ADMIN"}
                      />
                      <span>{facility.name}</span>
                    </label>
                  ))}
                </div>
                {errors.facilityIds && (
                  <span className="users-error">{errors.facilityIds.message}</span>
                )}
                {selectedRole === "ADMIN" && (
                  <span className="users-help">Admins do not need facility assignments.</span>
                )}
              </fieldset>

              {formError && <div className="users-alert users-alert--error">{formError}</div>}

              <div className="users-form__actions">
                <button type="button" className="users-button" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="users-primary" disabled={isSaving}>
                  {isSaving ? "Saving..." : editingProfile ? "Update user" : "Create user"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
