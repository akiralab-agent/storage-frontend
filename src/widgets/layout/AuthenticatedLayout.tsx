import { NavLink, Outlet, Navigate } from "react-router-dom";
import FacilitySelector from "@/components/FacilitySelector";
import { useAuth } from "@/shared/auth";
import type { Role } from "@/shared/auth";
import { useState } from "react";
import "./AuthenticatedLayout.css";

type NavItem = {
  to: string;
  label: string;
  icon: string;
  roles?: Role[];
};

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "grid" },
  {
    to: "/leads",
    label: "Leads",
    icon: "target",
    roles: ["admin", "admin_corporativo", "gerente", "operador"]
  },
  {
    to: "/units",
    label: "Unidades",
    icon: "box",
    roles: ["admin", "admin_corporativo", "gerente", "financeiro"]
  },
  {
    to: "/facilities",
    label: "Filiais",
    icon: "building",
    roles: ["admin", "admin_corporativo", "gerente"]
  },
  {
    to: "/organizations",
    label: "Organizações",
    icon: "briefcase",
    roles: ["admin", "admin_corporativo"]
  },
  { to: "/users", label: "Usuários", icon: "users", roles: ["admin"] }
];

const ICONS: Record<string, JSX.Element> = {
  grid: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  ),
  target: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  box: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  building: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M8 10h.01" />
      <path d="M16 10h.01" />
      <path d="M8 14h.01" />
      <path d="M16 14h.01" />
    </svg>
  ),
  briefcase: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  ),
  users: (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
};

export default function AuthenticatedLayout() {
  const { user, logout, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.some((r) => user.roles.includes(r)))
  );

  const toggleCollapse = () => setSidebarCollapsed((prev) => !prev);

  return (
    <div className={`app-shell ${sidebarCollapsed ? "app-shell--collapsed" : ""}`}>
      <aside className={`sidebar ${sidebarOpen ? "sidebar--open" : ""}`}>
        {/* ── Rail (icon strip) ── */}
        <div className="sidebar__rail">
          <div className="sidebar__logo">
            <span>AL</span>
          </div>

          {/* Expand button — visible only on desktop when collapsed */}
          <button
            type="button"
            className="sidebar__rail-toggle"
            onClick={toggleCollapse}
            title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {sidebarCollapsed ? (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              ) : (
                <polyline points="15 18 9 12 15 6" />
              )}
            </svg>
          </button>

          <nav className="sidebar__rail-nav">
            {visibleItems.map((item) => (
              <NavLink
                key={`rail-${item.to}`}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar__rail-link ${isActive ? "sidebar__rail-link--active" : ""}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                {ICONS[item.icon]}
                <span className="sidebar__rail-tooltip">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <button type="button" className="sidebar__logout" onClick={logout} title="Sair">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="sidebar__rail-tooltip">Sair</span>
          </button>
        </div>

        {/* ── Panel (full nav) ── */}
        <div className="sidebar__panel">
          <div className="sidebar__brand">
            <div>
              <span className="sidebar__brand-eyebrow">Workspace</span>
              <span className="sidebar__brand-text">AkiraLab</span>
            </div>

            <div className="sidebar__panel-actions">
              <button
                type="button"
                className="sidebar__panel-action sidebar__panel-action--collapse"
                onClick={toggleCollapse}
                aria-label="Recolher menu"
                title="Recolher menu"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                className="sidebar__panel-action sidebar__panel-action--close"
                onClick={() => setSidebarOpen(false)}
                aria-label="Fechar menu"
                title="Fechar menu"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          <div className="sidebar__facility">
            <FacilitySelector />
          </div>

          <span className="sidebar__section-title">Menu</span>

          <nav className="sidebar__nav">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <span className="sidebar__link-icon">{ICONS[item.icon]}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="sidebar__footer">
            <div className="sidebar__user-info">
              <div className="sidebar__avatar">{user?.name?.charAt(0).toUpperCase() || "U"}</div>
              <div className="sidebar__user-details">
                <span className="sidebar__user-name">{user?.name}</span>
                <span className="sidebar__user-role">
                  {user?.roles?.[0]?.replace("_", " ") || "user"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className="main-area">
        <header className="mobile-bar">
          <button
            type="button"
            className="mobile-bar__toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="mobile-bar__brand">AkiraLab</span>
        </header>
        <div className="main-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
