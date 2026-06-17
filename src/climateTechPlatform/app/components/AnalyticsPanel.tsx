import {
  AlertTriangle,
  Activity,
  Droplets,
  Leaf,
  TreePine,
  Layers,
  Zap,
  Waves,
  Sprout,
} from "lucide-react";

interface AnalyticsPanelProps {
  mode: "current" | "gsi";
  timelineValue: number;
  selectedSolution?: string | null;
}

function MetricBar({
  label,
  value,
  max,
  color,
  unit,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  unit: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span
          style={{
            fontSize: 10,
            color: "#5b8ab0",
            letterSpacing: "0.06em",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: 11,
            color: "#e2f0ff",
            fontFamily: "JetBrains Mono, monospace",
            fontWeight: 600,
          }}
        >
          {value.toLocaleString()}
          {unit}
        </span>
      </div>
      <div
        style={{
          height: 6,
          background: "rgba(255,255,255,0.05)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: color,
            borderRadius: 3,
            transition: "width 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            boxShadow: `0 0 8px ${color}60`,
          }}
        />
      </div>
    </div>
  );
}

function KeyDriver({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "high" | "medium" | "low";
}) {
  const colors = { high: "#ef4444", medium: "#f59e0b", low: "#00d4d8" };
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "7px 0",
        borderBottom: "1px solid rgba(0,212,216,0.06)",
      }}
    >
      <span style={{ fontSize: 11, color: "#5b8ab0" }}>{label}</span>
      <span
        style={{
          fontSize: 10,
          color: colors[status],
          fontFamily: "JetBrains Mono, monospace",
          fontWeight: 600,
          letterSpacing: "0.04em",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Per-solution config ───────────────────────────────────────────────────────

interface SolutionDesc {
  statusVerb: string;
  statusSub: string;
  accentColor: string;
  icon: React.ReactNode;
  /** Pipe utilization % at full GSI (progress=1) */
  pipeMax: number;
  /** Sewer flow gal/hr at full GSI (progress=1) */
  flowMax: number;
  /** Flood risk % at full GSI (progress=1) */
  floodMax: number;
  what: string;
  metricsFn: (
    p: number
  ) => Array<{ label: string; value: string; status: "high" | "medium" | "low" }>;
  impactFn: (p: number, pipe: number, flow: number) => string;
}

const SOLUTION_DESCRIPTIONS: Record<string, SolutionDesc> = {
  bioswale: {
    statusVerb: "INTERCEPTING",
    statusSub: "Bioswale — curb-edge interception (limited ROW)",
    accentColor: "#00c878",
    icon: <Sprout size={18} color="#00c878" />,
    pipeMax: 95,
    flowMax: 2538000,
    floodMax: 38,
    what:
      "A vegetated bioswale corridor threads the limited curb-edge right-of-way, intercepting street runoff before it reaches the combined-sewer inlets. Engineered soil (12–18\" amended layer, 1–5 in/hr) plus ~9\" of ponding stores roughly 8 gal/sq ft of swale surface. Capturing ~10% of this storm's 2.8M-gal runoff (~282,000 gal) needs about 1.1 miles of continuous 6-ft-wide swale (~35,000 sq ft). In dense South Downtown that is near the physical ceiling — curb ROW competes with loading zones and taxi lanes — so the bioswale is a supporting practice: it trims peak sewer flow ~10%, easing the 48\" main from 105% to ~95% (still tight).",
    metricsFn: (p) => [
      { label: "Gallons Captured", value: `${Math.round(p * 282000).toLocaleString()} gal`, status: "low" },
      { label: "Soil Infiltration", value: "1–5 in/hr", status: "low" },
      { label: "Swale Length", value: "~1.1 mi × 6 ft", status: "medium" },
      { label: "Runoff Captured", value: `${Math.round(p * 10)}%`, status: "medium" },
      {
        label: "Remaining to Sewer",
        value: `${Math.round((1 - p * 0.1) * 100)}%`,
        status: "medium",
      },
    ],
    impactFn: (p, pipe) =>
      `~${Math.round(p * 10)}% of runoff intercepted at the curb. Pipe eases 105% → ${pipe}% — still near capacity. Curb ROW caps the bioswale near 10%; it works as a supporting practice, not a primary one.`,
  },

  "rain-garden": {
    statusVerb: "CAPTURING",
    statusSub: "Rain garden cells — constrained by land & soil",
    accentColor: "#00c878",
    icon: <Leaf size={18} color="#00c878" />,
    pipeMax: 99,
    flowMax: 2650800,
    floodMax: 39,
    what:
      "Distributed rain-garden (bioretention) cells capture roof and plaza runoff at the source. But South Downtown's native soil infiltrates poorly (score 32, ~0.3 in/hr) and open pervious ground is almost nonexistent (available-land score 22). Capturing even ~6% of the 2.8M-gal storm (~169,000 gal) takes ~0.5 acre of engineered bioretention — 9\" ponding over 24\" of imported media, ~8 gal/sq ft. The 65–97% volume reductions often cited are annual figures for soil-rich sites; matching that here would demand ~5 acres of rain gardens this zone does not have. Realistically a marginal practice: pipe barely moves from 105% to ~99%.",
    metricsFn: (p) => [
      { label: "Gallons Captured", value: `${Math.round(p * 169000).toLocaleString()} gal`, status: "low" },
      { label: "Bioretention Area", value: "~0.5 acre", status: "medium" },
      { label: "Native Soil Infil.", value: "~0.3 in/hr (score 32)", status: "high" },
      { label: "Runoff Captured", value: `${Math.round(p * 6)}%`, status: "medium" },
      { label: "Media", value: "Imported / amended", status: "low" },
      {
        label: "Remaining Sewer Load",
        value: `${Math.round((1 - p * 0.06) * 100)}%`,
        status: "high",
      },
    ],
    impactFn: (p, pipe) =>
      `Rain gardens capture ~${Math.round(p * 169000).toLocaleString()} gal across ~0.5 acre of cells. Low soil infiltration (score 32) and scarce land (score 22) cap this near 6% — pipe stays at ${pipe}%. Best used as a pre-filter, not a primary practice here.`,
  },

  "tree-trench": {
    statusVerb: "ABSORBING",
    statusSub: "Silva Cell tree trench — under-sidewalk storage",
    accentColor: "#00dc8a",
    icon: <TreePine size={18} color="#00dc8a" />,
    pipeMax: 95,
    flowMax: 2538000,
    floodMax: 38,
    what:
      "Street trees set in continuous Silva Cells form a root-zone storage gallery beneath the sidewalks — no buildable land consumed. At ~500 gal per tree (King County / DeepRoot field range 200–800), capturing ~10% of the storm (~282,000 gal) takes about 560 trees along roughly 3 miles of sidewalk trench, drawn down over 24–48 hours. That fits the ROW and would more than double the zone's thin 12% canopy, but sidewalk length caps capture near 10–12%. Peak sewer flow drops ~10%, easing the 48\" main from 105% to ~95%.",
    metricsFn: (p) => [
      { label: "Runoff Captured", value: `${Math.round(p * 282000).toLocaleString()} gal`, status: "low" },
      { label: "Silva Cell Trees", value: `${Math.round(p * 560)}`, status: "low" },
      { label: "Trench Length", value: "~3.0 mi", status: "medium" },
      { label: "Urban Cooling", value: `${(p * 4.0).toFixed(1)}°F`, status: "low" },
      { label: "Sewer Flow Reduction", value: `${Math.round(p * 10)}%`, status: "medium" },
      { label: "Drawdown Time", value: "24–48 hrs", status: "low" },
      {
        label: "Remaining Sewer Load",
        value: `${Math.round((1 - p * 0.1) * 100)}%`,
        status: "medium",
      },
    ],
    impactFn: (p, pipe) =>
      `~${Math.round(p * 560)} Silva-Cell trees store ${Math.round(p * 282000).toLocaleString()} gal in root-zone media and cool the street ${(p * 4.0).toFixed(1)}°F. Sewer flow down ~${Math.round(p * 10)}% — pipe at ${pipe}%. Canopy is the main draw; capture caps near 10%.`,
  },

  "permeable-pavement": {
    statusVerb: "INFILTRATING",
    statusSub: "Permeable pavement — parking, plazas, low-speed lanes",
    accentColor: "#00d4dc",
    icon: <Layers size={18} color="#00d4dc" />,
    pipeMax: 65,
    flowMax: 1748400,
    floodMax: 26,
    what:
      "Permeable asphalt/concrete over an open-graded stone reservoir is the strongest fit here, because the zone is mostly pavement. An 18\" stone base at 32% void stores ~3.6 gal/sq ft, so capturing ~38% of the 2.8M-gal storm (~1.07M gal) takes about 7 acres of permeable surface — roughly 20% of the zone's ~35 impervious acres, drawn from parking decks, civic plazas, and low-speed lanes. Native soil infiltrates slowly (score 32), so the reservoir is under-drained: it detains and meters flow rather than fully infiltrating. Peak sewer flow falls ~38%, bringing the 48\" main from 105% down to ~65%.",
    metricsFn: (p) => [
      { label: "Runoff Reduction", value: `${Math.round(p * 38)}%`, status: "low" },
      { label: "Permeable Area", value: "~7 acres", status: "low" },
      { label: "Aggregate Storage", value: `${Math.round(p * 1071600).toLocaleString()} gal`, status: "low" },
      { label: "Reservoir", value: "18\" stone @ 32% void", status: "low" },
      { label: "Peak Flow Reduction", value: `${Math.round(p * 38)}%`, status: "low" },
      {
        label: "Remaining Sewer Load",
        value: `${Math.round((1 - p * 0.38) * 100)}%`,
        status: p > 0.5 ? "low" : "medium",
      },
    ],
    impactFn: (p, pipe) =>
      `Permeable surfaces absorb ~${Math.round(p * 38)}% of runoff, storing ${Math.round(p * 1071600).toLocaleString()} gal in ~7 acres of stone reservoir. Pipe drops 105% → ${pipe}%. The most viable single practice — pavement is the one resource this zone has in abundance.`,
  },

  "smart-storage-network": {
    statusVerb: "DIVERTING",
    statusSub: "Distributed smart tanks — capture + reuse",
    accentColor: "#00a8f3",
    icon: <Zap size={18} color="#00a8f3" />,
    pipeMax: 90,
    flowMax: 2420000,
    floodMax: 45,
    what:
      "A distributed network of ~6 smart tanks (~85,000 gal each, ~510k gal total) sits at the worst inlets across the sub-basin. Pressure sensors trigger valves that capture the peak overshoot at the source — diverting it OUT of the combined sewer to reuse (irrigation, non-potable) and groundwater recharge rather than back into the pipe. Capturing ~400–510k gallons (~14% of the 2.6 in/hr storm's runoff) drops the 48\" main from 105% to an honest, safe 90% — then the tanks slow-release to reuse over the hours after the storm. Used in Milwaukee, South Bend, and Columbus (EPA RTC pilots).",
    metricsFn: (p) => [
      { label: "Flow Diverted", value: `${Math.round(p * 6500).toLocaleString()} gal/min`, status: "low" },
      { label: "Diverted to Reuse", value: `${Math.round(p * 510000).toLocaleString()} gal`, status: "low" },
      { label: "Peak Flow Reduction", value: `${Math.round(p * 14)}%`, status: "low" },
      { label: "Tank Network", value: "6 tanks · 2 clusters", status: "low" },
      { label: "Valve Response", value: "< 90 sec", status: "low" },
      {
        label: "Pipe Load",
        value: `${Math.round(105 - p * 15)}%`,
        status: p > 0.6 ? "low" : "medium",
      },
    ],
    impactFn: (p, pipe) =>
      `${Math.round(p * 14)}% of peak flow captured at the source and diverted to reuse/recharge — OUT of the combined sewer. Pipe drops from 105% → ${pipe}% capacity. ${Math.round(p * 510000).toLocaleString()} gallons stored across ~6 tanks. Overflow eliminated.`,
  },

  "retention-basin": {
    statusVerb: "DETAINING",
    statusSub: "Detention vault — surface basin not feasible in-zone",
    accentColor: "#3b82f6",
    icon: <Waves size={18} color="#3b82f6" />,
    pipeMax: 82,
    flowMax: 2199600,
    floodMax: 33,
    what:
      "A true surface retention basin would need 1.5–2 acres of open parcel to detain a meaningful share of the 2.8M-gal storm — land South Downtown does not have (available-land score 22, the lowest of any zone). The feasible substitute is a subsurface detention vault: ~0.6M gal (~22%) held under a plaza or street in a ~0.2-acre buried structure, released over 24–72 hours through a gated riser. That eases the 48\" main from 105% to ~82%. A full basin at 50–65% capture belongs in land-rich zones — Old Fourth Ward's existing Historic Fourth Ward Park pond or Airport South (land score 72) — not here.",
    metricsFn: (p) => [
      { label: "Inflow Detained", value: `${Math.round(p * 620400).toLocaleString()} gal`, status: "low" },
      { label: "Vault Volume", value: `${(p * 0.6).toFixed(2)}M gal`, status: "low" },
      { label: "Footprint", value: "~0.2 acre (subsurface)", status: "medium" },
      { label: "Peak Flow Reduction", value: `${Math.round(p * 22)}%`, status: "low" },
      { label: "Outlet Control", value: "Gated riser", status: "low" },
      { label: "Drawdown Time", value: "24–72 hrs", status: "low" },
    ],
    impactFn: (p, pipe) =>
      `Subsurface vault detains ~${Math.round(p * 620400).toLocaleString()} gal, easing pipe 105% → ${pipe}%. A surface basin (50–65% capture) needs 1.5–2 acres unavailable here — site it in Old Fourth Ward or Airport South instead.`,
  },
};

const DEFAULT_GSI_DESCRIPTION: SolutionDesc = {
  statusVerb: "ACTIVE",
  statusSub: "With green infrastructure",
  accentColor: "#00d4b4",
  icon: <Activity size={18} color="#00d4b4" />,
  pipeMax: 50,
  flowMax: 1353600,
  floodMax: 20,
  what:
    "Green stormwater infrastructure is layered across the zone: ~7 acres of permeable pavement on parking decks and plazas, Silva-Cell tree trenches under the sidewalks, curb bioswales where ROW allows, and RTC tanks capturing peak overshoot to reuse. Stacked (with some overlap), they capture roughly 50–55% of the 2.8M-gal cloudburst at the source — enough to bring the 48\" combined main from 105% down to ~50% and hold off overflow. Permeable pavement and smart storage do the heavy lifting; land-hungry practices (rain gardens, surface basins) are minor contributors in this dense zone.",
  metricsFn: () => [
    { label: "Impervious Surface", value: "81%", status: "high" },
    { label: "Rainfall Event", value: "2.6 in/hr", status: "high" },
    { label: "Infrastructure Age", value: "95–130 yrs", status: "medium" },
    { label: "Elevation Risk", value: "Moderate", status: "medium" },
    { label: "GSI Coverage", value: "34%", status: "low" },
  ],
  impactFn: (_, pipe) =>
    `Peak flow reduced ~52%. System operating at ${pipe}% capacity — overflow held off, but only because permeable pavement + smart storage carry the load; vegetated practices alone would leave the pipe near 95%.`,
};

const OVERLOAD_DESCRIPTION = {
  what:
    "A 1-hour cloudburst drops 2.6 inches of rain — just past the 2.5 in/hr that Atlanta's drains are designed for — onto 81% impervious surfaces. The South Downtown sub-basin sheds ≈2.8 million gallons of runoff straight into the aging combined sewer. The 48\" main — built for a 10-year storm and rated at ~2.7 million gal/hr (≈100 cfs) — hits 105% capacity, so ~130,000 gallons back up at manholes and into basements across South Downtown. No GSI is active to intercept or delay peak flow.",
  drivers: [
    { label: "Impervious Surface", value: "81%", status: "high" as const },
    { label: "Rainfall Event", value: "2.6 in/hr", status: "high" as const },
    { label: "Infrastructure Age", value: "95–130 yrs", status: "medium" as const },
    { label: "Elevation Risk", value: "Moderate", status: "medium" as const },
    { label: "GSI Coverage", value: "2%", status: "high" as const },
  ],
};

// ─── Main panel ───────────────────────────────────────────────────────────────

export function AnalyticsPanel({ mode, timelineValue, selectedSolution }: AnalyticsPanelProps) {
  const isOverload = mode === "current";
  const progress = timelineValue / 100;

  const sol: SolutionDesc =
    !isOverload && selectedSolution && SOLUTION_DESCRIPTIONS[selectedSolution]
      ? SOLUTION_DESCRIPTIONS[selectedSolution]
      : DEFAULT_GSI_DESCRIPTION;

  // Compute live metric values directly from progress — no state needed.
  // AnalyticsPanel re-renders every RAF frame since timelineValue is a prop
  // that updates at ~60fps. Using useState+setTimeout here would cause the
  // cleanup to fire before the timeout every frame, keeping values at 0.
  const pipe = isOverload
    ? Math.round(Math.min(progress * 105, 105))
    : Math.round(Math.min(progress * sol.pipeMax, sol.pipeMax));
  const flow = isOverload
    ? Math.round(Math.min(progress * 2820000, 2820000))
    : Math.round(Math.min(progress * sol.flowMax, sol.flowMax));
  const overflow = isOverload ? Math.round(Math.max(0, (progress - 0.65) * 371429)) : 0;
  const flood = isOverload
    ? Math.round(progress * 88)
    : Math.round(progress * sol.floodMax);

  // Overload status label
  const statusLabel = isOverload && progress > 0.7
    ? "OVERLOADED"
    : isOverload && progress > 0.4
    ? "AT RISK"
    : isOverload
    ? "NORMAL"
    : sol.statusVerb;

  const statusColor = isOverload && progress > 0.7
    ? "#ef4444"
    : isOverload && progress > 0.4
    ? "#f59e0b"
    : isOverload
    ? "#00d4d8"
    : sol.accentColor;

  const mono = "JetBrains Mono, monospace";

  const solutionMetrics = !isOverload ? sol.metricsFn(progress) : [];

  return (
    <div
      style={{
        width: 300,
        minWidth: 300,
        background: "rgba(4,14,30,0.9)",
        backdropFilter: "blur(12px)",
        borderLeft: "1px solid rgba(0,212,216,0.08)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {/* ── Status badge ─────────────────────────────────────────── */}
      <div style={{ padding: "20px 20px 0" }}>
        <div
          style={{
            fontSize: 10,
            color: "#3a6080",
            letterSpacing: "0.12em",
            marginBottom: 10,
            fontFamily: mono,
          }}
        >
          SYSTEM STATUS
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 14px",
            background: `${statusColor}12`,
            border: `1px solid ${statusColor}30`,
            borderRadius: 8,
            marginBottom: 20,
          }}
        >
          {isOverload && progress > 0.5 ? (
            <AlertTriangle size={18} color={statusColor} style={{ flexShrink: 0 }} />
          ) : isOverload ? (
            <Activity size={18} color={statusColor} style={{ flexShrink: 0 }} />
          ) : (
            <span style={{ flexShrink: 0 }}>{sol.icon}</span>
          )}
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: statusColor,
                letterSpacing: "0.08em",
                lineHeight: 1.2,
              }}
            >
              {statusLabel}
            </div>
            <div style={{ fontSize: 10, color: "#5b8ab0", marginTop: 2 }}>
              {isOverload ? "Combined sewer system — no GSI" : sol.statusSub}
            </div>
          </div>
        </div>

        {/* ── LIVE METRICS ─────────────────────────────────────── */}
        <div
          style={{
            fontSize: 10,
            color: "#3a6080",
            letterSpacing: "0.12em",
            marginBottom: 14,
            fontFamily: mono,
          }}
        >
          LIVE METRICS
        </div>

        <MetricBar
          label="PIPE CAPACITY"
          value={pipe}
          max={110}
          color={
            pipe > 90 ? "#ef4444" : pipe > 70 ? "#f59e0b" : isOverload ? "#f59e0b" : statusColor
          }
          unit="%"
        />
        <MetricBar
          label="CURRENT FLOW"
          value={flow}
          max={3000000}
          color="#00a8f3"
          unit=" gal/hr"
        />
        <MetricBar
          label="OVERFLOW"
          value={overflow}
          max={150000}
          color={overflow > 0 ? "#ef4444" : "#00d4d8"}
          unit=" gal"
        />
        <MetricBar
          label="FLOOD RISK"
          value={flood}
          max={100}
          color={isOverload && progress > 0.6 ? "#ef4444" : statusColor}
          unit="%"
        />
      </div>

      {/* ── WHAT IS HAPPENING? ───────────────────────────────────── */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(0,212,216,0.07)" }}>
        <div
          style={{
            fontSize: 10,
            color: "#3a6080",
            letterSpacing: "0.12em",
            marginBottom: 10,
            fontFamily: mono,
          }}
        >
          WHAT IS HAPPENING?
        </div>
        <p style={{ fontSize: 11, color: "#7aadcc", lineHeight: 1.65, margin: 0 }}>
          {isOverload ? OVERLOAD_DESCRIPTION.what : sol.what}
        </p>
      </div>

      {/* ── SOLUTION METRICS / KEY DRIVERS ───────────────────────── */}
      <div style={{ padding: "0 20px 16px" }}>
        <div
          style={{
            fontSize: 10,
            color: "#3a6080",
            letterSpacing: "0.12em",
            marginBottom: 10,
            fontFamily: mono,
          }}
        >
          {isOverload ? "KEY DRIVERS" : "SOLUTION METRICS"}
        </div>
        {isOverload
          ? OVERLOAD_DESCRIPTION.drivers.map((d) => (
              <KeyDriver key={d.label} label={d.label} value={d.value} status={d.status} />
            ))
          : solutionMetrics.map((d) => (
              <KeyDriver key={d.label} label={d.label} value={d.value} status={d.status} />
            ))}
      </div>

      {/* ── IMPACT callout ───────────────────────────────────────── */}
      {!isOverload && (
        <div
          style={{
            margin: "0 16px 16px",
            padding: "12px 14px",
            background: `linear-gradient(135deg, ${sol.accentColor}18, rgba(0,168,243,0.08))`,
            border: `1px solid ${sol.accentColor}35`,
            borderRadius: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Droplets size={13} color={sol.accentColor} />
            <span
              style={{
                fontSize: 10,
                color: sol.accentColor,
                fontWeight: 600,
                letterSpacing: "0.06em",
              }}
            >
              {selectedSolution
                ? `${selectedSolution.replace(/-/g, " ").toUpperCase()} IMPACT`
                : "GSI IMPACT"}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#7aadcc", lineHeight: 1.55 }}>
            {sol.impactFn(progress, pipe, flow)}
          </div>
        </div>
      )}

      {/* ── Overload CTA ─────────────────────────────────────────── */}
      {isOverload && (
        <div style={{ padding: "0 16px 20px", marginTop: "auto" }}>
          <div
            style={{
              padding: "14px",
              background: "linear-gradient(135deg, rgba(0,212,216,0.12), rgba(0,168,243,0.08))",
              border: "1px solid rgba(0,212,216,0.2)",
              borderRadius: 10,
            }}
          >
            <div style={{ fontSize: 11, color: "#00d4d8", fontWeight: 600, marginBottom: 4 }}>
              Reduce peak flow with GSI
            </div>
            <div style={{ fontSize: 10, color: "#5b8ab0", lineHeight: 1.5, marginBottom: 10 }}>
              Layered green infrastructure can cut peak stormwater flow by 35–55% in this land-constrained zone — permeable pavement and smart storage do most of the work.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
