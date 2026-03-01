export type Role = "admin" | "admin_corporativo" | "gerente" | "financeiro" | "ops" | "viewer";

export interface FacilityInfo {
  id: number;
  name: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  roles: Role[];
  facilities: FacilityInfo[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}
