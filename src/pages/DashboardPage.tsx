import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/shared/auth";
import type { Role } from "@/shared/auth";
import { unitsApi } from "@/api/units";
import type { UnitRecord } from "@/api/units";
import { facilitiesApi } from "@/api/facilities";
import { organizationsApi } from "@/api/organizations";
import "@/pages/Dashboard.css";

type QuickLink = {
  to: string;
  label: string;
  description: string;
  color: string;
  roles?: Role[];
};

const QUICK_LINKS: QuickLink[] = [
  { to: "/units", label: "Unidades", description: "Gerenciar unidades de armazenamento", color: "blue", roles: ["admin", "admin_corporativo", "gerente", "financeiro"] },
  { to: "/facilities", label: "Filiais", description: "Gerenciar filiais", color: "emerald", roles: ["admin", "admin_corporativo", "gerente"] },
  { to: "/organizations", label: "Organizações", description: "Gerenciar organizações", color: "violet", roles: ["admin", "admin_corporativo"] },
  { to: "/users", label: "Usuários", description: "Gerenciar usuários e permissões", color: "amber", roles: ["admin"] },
];

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  LIVRE: { label: "Livres", className: "dash-stat--free" },
  OCUPADA: { label: "Ocupadas", className: "dash-stat--occupied" },
  RESERVADA: { label: "Reservadas", className: "dash-stat--reserved" },
  BLOQUEADA: { label: "Bloqueadas", className: "dash-stat--blocked" },
  EM_VISTORIA: { label: "Em Vistoria", className: "dash-stat--inspection" },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [facilityCount, setFacilityCount] = useState(0);
  const [orgCount, setOrgCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [unitList, facList, orgList] = await Promise.all([
          unitsApi.list().catch(() => [] as UnitRecord[]),
          facilitiesApi.list().catch(() => []),
          organizationsApi.list().catch(() => []),
        ]);
        if (mounted) {
          setUnits(unitList);
          setFacilityCount(facList.length);
          setOrgCount(orgList.length);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, []);

  const statusCounts = units.reduce<Record<string, number>>((acc, u) => {
    acc[u.status] = (acc[u.status] || 0) + 1;
    return acc;
  }, {});

  const occupancyRate = units.length > 0
    ? Math.round(((statusCounts["OCUPADA"] || 0) / units.length) * 100)
    : 0;

  const visibleLinks = QUICK_LINKS.filter(
    (link) => !link.roles || (user && link.roles.some((r) => user.roles.includes(r)))
  );

  const greeting = getGreeting();

  return (
    <main className="dash-page">
      <div className="dash-welcome">
        <div>
          <h1 className="dash-welcome__title">
            {greeting}{user ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="dash-welcome__sub">
            Aqui está o resumo do seu sistema de armazenamento.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="dash-loading">Carregando dados...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <section className="dash-kpis">
            <div className="dash-kpi">
              <div className="dash-kpi__icon dash-kpi__icon--blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
              </div>
              <div className="dash-kpi__content">
                <span className="dash-kpi__value">{units.length}</span>
                <span className="dash-kpi__label">Total de Unidades</span>
              </div>
            </div>

            <div className="dash-kpi">
              <div className="dash-kpi__icon dash-kpi__icon--emerald">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <div className="dash-kpi__content">
                <span className="dash-kpi__value">{occupancyRate}%</span>
                <span className="dash-kpi__label">Taxa de Ocupação</span>
              </div>
            </div>

            <div className="dash-kpi">
              <div className="dash-kpi__icon dash-kpi__icon--violet">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" />
                </svg>
              </div>
              <div className="dash-kpi__content">
                <span className="dash-kpi__value">{facilityCount}</span>
                <span className="dash-kpi__label">Filiais</span>
              </div>
            </div>

            <div className="dash-kpi">
              <div className="dash-kpi__icon dash-kpi__icon--amber">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <div className="dash-kpi__content">
                <span className="dash-kpi__value">{orgCount}</span>
                <span className="dash-kpi__label">Organizações</span>
              </div>
            </div>
          </section>

          {/* Unit Status Breakdown */}
          {units.length > 0 && (
            <section className="dash-section">
              <h2 className="dash-section__title">Status das Unidades</h2>
              <div className="dash-statuses">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <div key={status} className={`dash-stat ${config.className}`}>
                    <span className="dash-stat__value">{statusCounts[status] || 0}</span>
                    <span className="dash-stat__label">{config.label}</span>
                  </div>
                ))}
              </div>

              {/* Occupancy Bar */}
              <div className="dash-occupancy">
                <div className="dash-occupancy__header">
                  <span>Ocupação geral</span>
                  <span className="dash-occupancy__pct">{occupancyRate}%</span>
                </div>
                <div className="dash-occupancy__track">
                  <div
                    className="dash-occupancy__fill"
                    style={{ width: `${occupancyRate}%` }}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Quick Links */}
          {visibleLinks.length > 0 && (
            <section className="dash-section">
              <h2 className="dash-section__title">Acesso Rápido</h2>
              <div className="dash-quick-links">
                {visibleLinks.map((link) => (
                  <Link key={link.to} to={link.to} className={`dash-quick-link dash-quick-link--${link.color}`}>
                    <span className="dash-quick-link__label">{link.label}</span>
                    <span className="dash-quick-link__desc">{link.description}</span>
                    <span className="dash-quick-link__arrow">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                      </svg>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}
