import { Fragment, useEffect, useState } from "react";
import { useAuth } from "@/shared/auth";
import { useFacility } from "@/contexts/FacilityContext";
import { unitsApi } from "@/api/units";
import type { UnitRecord } from "@/api/units";
import { facilitiesApi } from "@/api/facilities";
import { organizationsApi } from "@/api/organizations";
import "@/pages/Dashboard.css";

/* ── Mock data (métricas financeiras / tarefas) ── */
const MOCK_REVENUE_MONTHS = [
  { label: "Mar", value: 180000 },
  { label: "Abr", value: 195000 },
  { label: "Mai", value: 172000 },
  { label: "Jun", value: 210000 },
  { label: "Jul", value: 198000 },
  { label: "Ago", value: 225000 },
  { label: "Set", value: 215000 },
  { label: "Out", value: 230000 },
  { label: "Nov", value: 242000 },
  { label: "Dez", value: 238000 },
  { label: "Jan", value: 213000 },
  { label: "Fev", value: 256054 }
];

const MOCK_RETENTION_MONTHS = [
  { label: "Set", value: 85 },
  { label: "Out", value: 87 },
  { label: "Nov", value: 88 },
  { label: "Dez", value: 90 },
  { label: "Jan", value: 89 },
  { label: "Fev", value: 92 }
];

const MOCK_MINI_BARS = [65, 72, 58, 80, 75, 90, 85];

const MOCK_HEATMAP = [
  [0.2, 0.3, 0.5, 0.8, 0.9, 0.7, 0.4],
  [0.3, 0.4, 0.6, 0.9, 1.0, 0.8, 0.5],
  [0.4, 0.5, 0.7, 0.9, 0.95, 0.85, 0.6],
  [0.3, 0.4, 0.6, 0.85, 0.9, 0.7, 0.45],
  [0.2, 0.3, 0.4, 0.7, 0.8, 0.6, 0.3]
];
const HEATMAP_HOURS = ["08h", "10h", "12h", "14h", "16h"];
const HEATMAP_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const STATUS_COLORS: Record<string, string> = {
  LIVRE: "var(--status-success)",
  OCUPADA: "var(--brand-primary)",
  RESERVADA: "var(--status-warning)",
  BLOQUEADA: "var(--status-error)",
  EM_VISTORIA: "var(--status-info)"
};

const STATUS_LABELS: Record<string, string> = {
  LIVRE: "Livre",
  OCUPADA: "Ocupada",
  RESERVADA: "Reservada",
  BLOQUEADA: "Bloqueada",
  EM_VISTORIA: "Em Vistoria"
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedFacilityId } = useFacility();
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
          organizationsApi.list().catch(() => [])
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
    return () => {
      mounted = false;
    };
  }, [selectedFacilityId]);

  const statusCounts = units.reduce<Record<string, number>>((acc, u) => {
    acc[u.status] = (acc[u.status] || 0) + 1;
    return acc;
  }, {});

  // Use real data when available, fallback to mock
  const totalUnits = units.length || 1248;
  const occupancyRate =
    units.length > 0 ? Math.round(((statusCounts["OCUPADA"] || 0) / units.length) * 100) : 87;

  const statusData =
    units.length > 0
      ? statusCounts
      : { LIVRE: 187, OCUPADA: 892, RESERVADA: 84, BLOQUEADA: 52, EM_VISTORIA: 33 };

  const totalForDonut = Object.values(statusData).reduce((a, b) => a + b, 0);

  const greeting = getGreeting();

  // Revenue bar chart max
  const revenueMax = Math.max(...MOCK_REVENUE_MONTHS.map((m) => m.value));
  const retentionMax = 100;

  // Donut ring calculations
  const DONUT_RADIUS = 54;
  const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
  const statusEntries = Object.entries(statusData);
  let cumulativeOffset = 0;
  const donutSegments = statusEntries.map(([status, count]) => {
    const pct = count / totalForDonut;
    const dashLen = pct * DONUT_CIRCUMFERENCE;
    const gap = DONUT_CIRCUMFERENCE - dashLen;
    const offset = cumulativeOffset;
    cumulativeOffset += dashLen;
    return { status, count, pct, dashLen, gap, offset, color: STATUS_COLORS[status] || "#ccc" };
  });

  // Task ring
  const tasks = { done: 42, pending: 15, inProgress: 8 };
  const taskTotal = tasks.done + tasks.pending + tasks.inProgress;
  const TASK_RADIUS = 50;
  const TASK_CIRC = 2 * Math.PI * TASK_RADIUS;
  const taskDonePct = tasks.done / taskTotal;
  const taskInProgressPct = tasks.inProgress / taskTotal;
  const taskPendingPct = tasks.pending / taskTotal;

  void facilityCount;
  void orgCount;

  return (
    <main className={`dash-page ${loading ? "dash-page--loading" : ""}`}>
      {!loading && (
        <div className="dash-welcome">
          <div>
            <h1 className="dash-welcome__title">
              {greeting}
              {user ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>
            <p className="dash-welcome__sub">Aqui está o resumo do seu sistema de armazenamento.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="dash-loading" role="status" aria-live="polite">
          <img className="dash-loading__gif" src="/box.gif" alt="Loading" />
          <span className="dash-loading__text">loading...</span>
        </div>
      ) : (
        <div className="dash-grid">
          {/* ═══ Card 1: Total Unidades ═══ */}
          <div className="dash-card dash-card--units">
            <div className="dash-card__header">
              <span className="dash-card__label">Total Unidades</span>
              <span className="dash-badge dash-badge--up">+3.2%</span>
            </div>
            <span className="dash-card__big-value">{totalUnits.toLocaleString("pt-BR")}</span>
            <div className="dash-mini-bars">
              {MOCK_MINI_BARS.map((v, i) => (
                <div key={i} className="dash-mini-bars__bar" style={{ height: `${v}%` }} />
              ))}
            </div>
            <span className="dash-card__compare">
              vs mês anterior: <strong>1.210</strong>
            </span>
          </div>

          {/* ═══ Card 2: Ocupação Mensal ═══ */}
          <div className="dash-card dash-card--occupancy">
            <div className="dash-card__header">
              <span className="dash-card__label">Ocupação Mensal</span>
              <span className="dash-badge dash-badge--down">-1.5%</span>
            </div>
            <span className="dash-card__big-value">{occupancyRate}%</span>
            <svg className="dash-sparkline" viewBox="0 0 120 32" fill="none">
              <polyline
                points="0,28 17,22 34,25 51,18 68,14 85,16 102,10 120,12"
                stroke="var(--brand-primary)"
                strokeWidth="2"
                fill="none"
              />
              <polyline
                points="0,28 17,22 34,25 51,18 68,14 85,16 102,10 120,12 120,32 0,32"
                fill="var(--brand-primary)"
                opacity="0.08"
              />
            </svg>
            <span className="dash-card__compare">
              vs mês anterior: <strong>88.5%</strong>
            </span>
          </div>

          {/* ═══ Card 3: Distribuição de Status (donut) ═══ */}
          <div className="dash-card dash-card--donut">
            <div className="dash-card__header">
              <span className="dash-card__label">Distribuição de Status</span>
            </div>
            <div className="dash-donut-wrap">
              <svg viewBox="0 0 128 128" className="dash-donut-svg">
                {donutSegments.map((seg) => (
                  <circle
                    key={seg.status}
                    cx="64"
                    cy="64"
                    r={DONUT_RADIUS}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="16"
                    strokeDasharray={`${seg.dashLen} ${seg.gap}`}
                    strokeDashoffset={-seg.offset}
                    strokeLinecap="butt"
                    transform="rotate(-90 64 64)"
                  />
                ))}
                <text x="64" y="60" textAnchor="middle" className="dash-donut-center-value">
                  {totalForDonut}
                </text>
                <text x="64" y="76" textAnchor="middle" className="dash-donut-center-label">
                  unidades
                </text>
              </svg>
              <ul className="dash-donut-legend">
                {donutSegments.map((seg) => (
                  <li key={seg.status}>
                    <span className="dash-donut-legend__dot" style={{ background: seg.color }} />
                    <span className="dash-donut-legend__text">
                      {STATUS_LABELS[seg.status] || seg.status}
                    </span>
                    <span className="dash-donut-legend__val">{seg.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ═══ Card 4: Receita Total (destaque) ═══ */}
          <div className="dash-card dash-card--revenue-highlight">
            <div className="dash-card__header">
              <span className="dash-card__label" style={{ color: "rgba(255,255,255,0.8)" }}>
                Receita Total
              </span>
            </div>
            <span className="dash-card__big-value" style={{ color: "#fff" }}>
              R$ 5.2M
            </span>
            <span className="dash-revenue-hl__contracts">892 contratos ativos</span>
            <div className="dash-revenue-hl__breakdown">
              <div className="dash-revenue-hl__item">
                <span className="dash-revenue-hl__dot dash-revenue-hl__dot--ok" />
                <span>Recebido</span>
                <strong>R$ 3.64M</strong>
              </div>
              <div className="dash-revenue-hl__item">
                <span className="dash-revenue-hl__dot dash-revenue-hl__dot--pending" />
                <span>Pendente</span>
                <strong>R$ 1.56M</strong>
              </div>
            </div>
            <div className="dash-revenue-hl__status-section">
              <span className="dash-revenue-hl__status-title">Status Pagamento</span>
              <div className="dash-payment-bar">
                <div
                  className="dash-payment-bar__seg dash-payment-bar__seg--ok"
                  style={{ width: "70%" }}
                />
                <div
                  className="dash-payment-bar__seg dash-payment-bar__seg--late"
                  style={{ width: "25%" }}
                />
                <div
                  className="dash-payment-bar__seg dash-payment-bar__seg--cancel"
                  style={{ width: "5%" }}
                />
              </div>
              <div className="dash-payment-legend">
                <span>
                  <span className="dash-payment-legend__dot dash-payment-legend__dot--ok" />
                  Em dia 70%
                </span>
                <span>
                  <span className="dash-payment-legend__dot dash-payment-legend__dot--late" />
                  Atrasado 25%
                </span>
                <span>
                  <span className="dash-payment-legend__dot dash-payment-legend__dot--cancel" />
                  Cancelado 5%
                </span>
              </div>
            </div>
          </div>

          {/* ═══ Card 5: Visão Geral de Tarefas ═══ */}
          <div className="dash-card dash-card--tasks">
            <div className="dash-card__header">
              <span className="dash-card__label">Visão Geral</span>
            </div>
            <div className="dash-task-ring-wrap">
              <svg viewBox="0 0 120 120" className="dash-task-ring-svg">
                {/* Done */}
                <circle
                  cx="60"
                  cy="60"
                  r={TASK_RADIUS}
                  fill="none"
                  stroke="var(--status-success)"
                  strokeWidth="10"
                  strokeDasharray={`${taskDonePct * TASK_CIRC} ${TASK_CIRC - taskDonePct * TASK_CIRC}`}
                  strokeDashoffset={0}
                  transform="rotate(-90 60 60)"
                />
                {/* In Progress */}
                <circle
                  cx="60"
                  cy="60"
                  r={TASK_RADIUS}
                  fill="none"
                  stroke="var(--status-warning)"
                  strokeWidth="10"
                  strokeDasharray={`${taskInProgressPct * TASK_CIRC} ${TASK_CIRC - taskInProgressPct * TASK_CIRC}`}
                  strokeDashoffset={-(taskDonePct * TASK_CIRC)}
                  transform="rotate(-90 60 60)"
                />
                {/* Pending */}
                <circle
                  cx="60"
                  cy="60"
                  r={TASK_RADIUS}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="10"
                  strokeDasharray={`${taskPendingPct * TASK_CIRC} ${TASK_CIRC - taskPendingPct * TASK_CIRC}`}
                  strokeDashoffset={-((taskDonePct + taskInProgressPct) * TASK_CIRC)}
                  transform="rotate(-90 60 60)"
                />
                <text x="60" y="56" textAnchor="middle" className="dash-task-ring-value">
                  {taskTotal}
                </text>
                <text x="60" y="72" textAnchor="middle" className="dash-task-ring-label">
                  tarefas
                </text>
              </svg>
              <ul className="dash-task-legend">
                <li>
                  <span
                    className="dash-task-legend__dot"
                    style={{ background: "var(--status-success)" }}
                  />
                  Concluído <strong>{tasks.done}</strong>
                </li>
                <li>
                  <span
                    className="dash-task-legend__dot"
                    style={{ background: "var(--status-warning)" }}
                  />
                  Em andamento <strong>{tasks.inProgress}</strong>
                </li>
                <li>
                  <span className="dash-task-legend__dot" style={{ background: "var(--border)" }} />
                  Pendente <strong>{tasks.pending}</strong>
                </li>
              </ul>
            </div>
          </div>

          {/* ═══ Card 6: Contratos Ativos ═══ */}
          <div className="dash-card dash-card--contracts">
            <div className="dash-card__header">
              <span className="dash-card__label">Contratos Ativos</span>
              <span className="dash-badge dash-badge--up">+2.57%</span>
            </div>
            <span className="dash-card__big-value">892</span>
            <span className="dash-card__compare">
              vs mês anterior: <strong>870</strong>
            </span>
            <div className="dash-contracts-extra">
              <div className="dash-contracts-row">
                <span>Novos este mês</span>
                <strong>34</strong>
              </div>
              <div className="dash-contracts-row">
                <span>Cancelados</span>
                <strong>12</strong>
              </div>
              <div className="dash-contracts-row">
                <span>Filiais ativas</span>
                <strong>{facilityCount || 8}</strong>
              </div>
              <div className="dash-contracts-row">
                <span>Organizações</span>
                <strong>{orgCount || 3}</strong>
              </div>
            </div>
          </div>

          {/* ═══ Card 7: Receita Mensal (wide bar chart) ═══ */}
          <div className="dash-card dash-card--revenue-monthly">
            <div className="dash-card__header">
              <span className="dash-card__label">Receita Mensal</span>
              <span className="dash-badge dash-badge--up">+20%</span>
            </div>
            <div className="dash-revenue-monthly__values">
              <span className="dash-card__big-value">R$ 256.054,50</span>
              <span className="dash-card__compare">
                vs mês passado: <strong>R$ 213.378,75</strong>
              </span>
            </div>
            <div className="dash-bar-chart">
              {MOCK_REVENUE_MONTHS.map((m, i) => (
                <div key={i} className="dash-bar-chart__col">
                  <div
                    className={`dash-bar-chart__bar ${i === MOCK_REVENUE_MONTHS.length - 1 ? "dash-bar-chart__bar--active" : ""}`}
                    style={{ height: `${(m.value / revenueMax) * 100}%` }}
                  />
                  <span className="dash-bar-chart__label">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ Card 8: Taxa de Retenção ═══ */}
          <div className="dash-card dash-card--retention">
            <div className="dash-card__header">
              <span className="dash-card__label">Taxa de Retenção</span>
              <span className="dash-badge dash-badge--up">+15%</span>
            </div>
            <span className="dash-card__big-value">92%</span>
            <div className="dash-bar-chart dash-bar-chart--small">
              {MOCK_RETENTION_MONTHS.map((m, i) => (
                <div key={i} className="dash-bar-chart__col">
                  <div
                    className={`dash-bar-chart__bar ${i === MOCK_RETENTION_MONTHS.length - 1 ? "dash-bar-chart__bar--active" : ""}`}
                    style={{ height: `${(m.value / retentionMax) * 100}%` }}
                  />
                  <span className="dash-bar-chart__label">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ Card 9: Ocupação por Período (heatmap) ═══ */}
          <div className="dash-card dash-card--heatmap">
            <div className="dash-card__header">
              <span className="dash-card__label">Ocupação por Período</span>
            </div>
            <div className="dash-heatmap">
              <div className="dash-heatmap__corner" />
              {HEATMAP_DAYS.map((d) => (
                <span key={d} className="dash-heatmap__day-label">
                  {d}
                </span>
              ))}
              {MOCK_HEATMAP.map((row, ri) => (
                <Fragment key={ri}>
                  <span className="dash-heatmap__hour-label">{HEATMAP_HOURS[ri]}</span>
                  {row.map((val, ci) => (
                    <div
                      key={`${ri}-${ci}`}
                      className="dash-heatmap__cell"
                      style={{ opacity: 0.15 + val * 0.85, background: "var(--brand-primary)" }}
                      title={`${HEATMAP_DAYS[ci]} ${HEATMAP_HOURS[ri]}: ${Math.round(val * 100)}%`}
                    />
                  ))}
                </Fragment>
              ))}
            </div>
            <div className="dash-heatmap__scale">
              <span>Baixa</span>
              <div className="dash-heatmap__scale-bar" />
              <span>Alta</span>
            </div>
          </div>
        </div>
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
