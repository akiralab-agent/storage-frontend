import { Outlet } from "react-router-dom";
import FacilitySelector from "@/components/FacilitySelector";
import { useAuth } from "@/shared/auth";

export default function AuthenticatedLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="top-nav__brand">AkiraLab</div>
        <div className="top-nav__actions">
          <FacilitySelector />
          {user && <span className="top-nav__user">{user.name}</span>}
          <button type="button" className="top-nav__logout" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
