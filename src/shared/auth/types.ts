export type Role = "admin" | "ops" | "viewer";
export type Facility = "primary" | "secondary";

export interface User {
  id: string;
  name: string;
  roles: Role[];
  facilities: Facility[];
}

export interface AuthState {
  user: User | null;
}
