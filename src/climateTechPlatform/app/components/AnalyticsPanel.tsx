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
      "A vegetated bioswale corridor threads the limited curb-edge right-of-way, intercepting street runoff before it reaches the combined-sewer inlets. Engineered soil (12–18\" amended layer, 1–5 in/hr) plus ~9\" of ponding stores roughly 8 gal/sq ft of swale surface. ~1.1 miles of continuous 6-ft-wide swale (~35,000 sq ft) stores ~280,000 gal of the storm's 3.6M-gal total runoff. In dense South Downtown that is near the physical ceiling — curb ROW competes with loading zones and taxi lanes — so the bioswale is a supporting practice that eases the 48\" main from 120% to ~112% (still over capacity without the smart tank).",
    metricsFn: (p) => [
      { label: "Gallons Stored", value: `${Math.round(p * 280000).toLocaleString()} gal`, status: "low" },
      { label: "Storage Density", value: "8 gal / ft² (9\" ponding)", status: "low" },
      { label: "Swale Area", value: "~35,000 sq ft (1.1 mi × 6 ft)", status: "medium" },
      { label: "Soil Infiltration", value: "1–5 in/hr (amended media)", status: "low" },
      {
        label: "Sewer Load Remaining",
        value: `~${Math.round(3645000 - p * 280000).toLocaleString()} gal`,
        status: "medium",
      },
    ],
    impactFn: (p, pipe) =>
      `${Math.round(p * 280000).toLocaleString()} gal stored in ~35,000 sq ft of vegetated swale. Pipe eases from 100% → ${pipe}% — still near capacity as a standalone. Works best as a supporting layer under the smart tank system.`,
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
      "Distributed rain-garden (bioretention) cells capture roof and plaza runoff at the source. But South Downtown's native soil infiltrates poorly (score 32, ~0.3 in/hr) and open pervious ground is almost nonexistent (available-land score 22). About 0.5 acre of engineered bioretention (9\" ponding over 24\" imported media, 5.6 gal/sq ft) stores ~122,000 gal of the 3.6M-gal storm. The 65–97% volume reductions often cited are annual figures for soil-rich sites; here, scarce land limits deployment. Best used as a pre-filter feeding the smart tank system, not a standalone solution.",
    metricsFn: (p) => [
      { label: "Gallons Stored", value: `${Math.round(p * 122000).toLocaleString()} gal`, status: "low" },
      { label: "Bioretention Area", value: "~0.5 acre (21,800 sq ft)", status: "medium" },
      { label: "Storage Density", value: "5.6 gal / ft² (9\" ponding)", status: "low" },
      { label: "Native Soil Infil.", value: "~0.3 in/hr (score 32)", status: "high" },
      { label: "Media", value: "Imported / amended", status: "low" },
      {
        label: "Sewer Load Remaining",
        value: `~${Math.round(3645000 - p * 122000).toLocaleString()} gal`,
        status: "high",
      },
    ],
    impactFn: (p, pipe) =>
      `${Math.round(p * 122000).toLocaleString()} gal stored across ~0.5 acre of bioretention cells. Low soil infiltration (score 32) and scarce land cap deployment — pipe at ${pipe}%. Best as a pre-filter under the smart tank system.`,
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
      "Street trees set in continuous Silva Cells form a root-zone storage gallery beneath the sidewalks — no buildable land consumed. At 27 gal per linear foot of trench (6 ft wide × 3 ft deep at 1.5 gal/cu ft), roughly 0.6 miles (3,168 linear ft) of sidewalk trench stores ~85,500 gal, drawn down over 24–48 hours. About 528 trees fit that run — more than doubling the zone's thin 12% canopy. Best used alongside the smart tank, which routes intercepted water directly into the Silva Cell vault via pipe.",
    metricsFn: (p) => [
      { label: "Gallons Stored", value: `${Math.round(p * 85500).toLocaleString()} gal`, status: "low" },
      { label: "Silva Cell Trees", value: `${Math.round(p * 528)}`, status: "low" },
      { label: "Storage Density", value: "27 gal / linear ft of trench", status: "low" },
      { label: "Trench Length", value: "~0.6 mi (3,168 linear ft)", status: "medium" },
      { label: "Urban Cooling", value: `${(p * 4.0).toFixed(1)}°F`, status: "low" },
      { label: "Drawdown Time", value: "24–48 hrs", status: "low" },
    ],
    impactFn: (p, pipe) =>
      `${Math.round(p * 528)} Silva-Cell trees store ${Math.round(p * 85500).toLocaleString()} gal in root-zone vault and cool the street ${(p * 4.0).toFixed(1)}°F. Pipe at ${pipe}%. Pairs best with the smart tank routing excess directly into the trench.`,
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
      "Permeable asphalt/concrete over an open-graded stone reservoir is the strongest green fit here because the zone is mostly pavement. A 12\" stone base at 40% void stores 3.0 gal/sq ft, so 7 acres (~305,000 sq ft) of permeable surface stores ~914,000 gal — about 25% of the 3.6M-gal storm. Native soil infiltrates slowly (score 32), so the reservoir is under-drained: it detains and meters flow rather than fully infiltrating. Parking decks, civic plazas, and low-speed lanes are the conversion targets.",
    metricsFn: (p) => [
      { label: "Gallons Stored", value: `${Math.round(p * 914000).toLocaleString()} gal`, status: "low" },
      { label: "Permeable Area", value: "~7 acres (305,000 sq ft)", status: "low" },
      { label: "Storage Density", value: "3.0 gal / ft² (12\" stone, 40% void)", status: "low" },
      { label: "Reservoir", value: "Under-drained (soil score 32)", status: "low" },
      {
        label: "Sewer Load Remaining",
        value: `~${Math.round(3645000 - p * 914000).toLocaleString()} gal`,
        status: p > 0.5 ? "low" : "medium",
      },
    ],
    impactFn: (p, pipe) =>
      `~7 acres of permeable surface stores ${Math.round(p * 914000).toLocaleString()} gal in stone reservoir. Pipe drops from 100% → ${pipe}%. Most viable standalone green practice — pavement is the one resource this zone has in abundance.`,
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
      "A distributed network of ~6 smart tanks (~100,000 gal each, ~600k gal total capacity) sits at the worst inlets across the sub-basin. Pressure sensors trigger the valve the moment the pipe hits 100% capacity — diverting 10,125 gal/min OUT of the sewer to reuse and groundwater recharge before any backup occurs. Intercepting 17% of runoff drops the pipe 17 percentage points: 100% → 83%, a comfortable operating margin with clear headroom for variability. Used in Milwaukee, South Bend, and Columbus (EPA RTC pilots).",
    metricsFn: (p) => [
      { label: "Flow Diverted", value: `${Math.round(p * 10125).toLocaleString()} gal/min`, status: "low" },
      { label: "Volume Stored / Hr", value: `${Math.round(p * 607500).toLocaleString()} gal`, status: "low" },
      { label: "Tank Network", value: "6 tanks · 2 clusters", status: "low" },
      { label: "Tank Size", value: "~100,000 gal each", status: "low" },
      { label: "Valve Response", value: "< 90 sec", status: "low" },
      {
        label: "Pipe Load",
        value: `${Math.round(100 - p * 17)}%`,
        status: p > 0.6 ? "low" : "medium",
      },
    ],
    impactFn: (p, pipe) =>
      `${Math.round(p * 10125).toLocaleString()} gal/min intercepted at the source — ${Math.round(p * 607500).toLocaleString()} gal stored per hour across ~6 tanks. Pipe drops from 100% → ${pipe}%. Overflow eliminated. Stored water slow-released to reuse post-storm.`,
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
      "A true surface retention basin would need 1.5–2 acres of open parcel to detain a meaningful share of the 3.6M-gal storm — land South Downtown does not have (available-land score 22, the lowest of any zone). The feasible substitute is a subsurface detention vault sized at ~608k gal (~17% of storm volume) under a plaza or street in a ~0.2-acre buried structure, released over 24–72 hours through a gated riser. A full basin at 50–65% capture belongs in land-rich zones — Old Fourth Ward's Historic Fourth Ward Park pond or Airport South (land score 72).",
    metricsFn: (p) => [
      { label: "Gallons Detained", value: `${Math.round(p * 608000).toLocaleString()} gal`, status: "low" },
      { label: "Storage Density", value: "30 gal / ft² (7.5 × 4 ft depth)", status: "low" },
      { label: "Footprint", value: "~0.2 acre subsurface vault", status: "medium" },
      { label: "Outlet Control", value: "Gated riser", status: "low" },
      { label: "Drawdown Time", value: "24–72 hrs", status: "low" },
      {
        label: "Sewer Load Remaining",
        value: `~${Math.round(3645000 - p * 608000).toLocaleString()} gal`,
        status: "medium",
      },
    ],
    impactFn: (p, pipe) =>
      `Subsurface vault detains ~${Math.round(p * 608000).toLocaleString()} gal, easing pipe from 100% → ${pipe}%. A surface basin (50–65% of 3.6M gal) needs 1.5–2 acres unavailable here — best sited at Old Fourth Ward or Airport South.`,
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
    "Green stormwater infrastructure is layered across the zone: ~7 acres of permeable pavement on parking decks and plazas, Silva-Cell tree trenches under the sidewalks, curb bioswales where ROW allows, and smart tanks capturing peak overshoot for reuse. The smart tank intercepts ~607,500 gal/hr (10,125 gpm) of excess — the most direct fix. Permeable pavement adds ~914k gal of stone-reservoir storage. Together they keep pipe utilization at or below 83% — well under the 100% threshold where overflow begins. Vegetated practices (bioswales, rain gardens) contribute supporting storage but can't solve the problem alone in this dense zone.",
  metricsFn: () => [
    { label: "Hard Surface Cover", value: "81%", status: "high" },
    { label: "Rainfall Event", value: "3.0 in/hr", status: "high" },
    { label: "Infrastructure Age", value: "95–130 yrs", status: "medium" },
    { label: "Elevation Risk", value: "Moderate", status: "medium" },
    { label: "GSI Coverage", value: "34%", status: "low" },
  ],
  impactFn: (_, pipe) =>
    `Smart tank + permeable pavement handle the bulk: ~608k gal/hr intercepted, ~914k gal stored in stone reservoir. System at ${pipe}% capacity — overflow eliminated. Vegetated layers add resilience but aren't the load-bearers here.`,
};

const OVERLOAD_DESCRIPTION = {
  what:
    "A 1-hour cloudburst drops 3.0 inches of rain — 20% above the 2.5 in/hr Atlanta's storm drains are rated for — onto 81% hard surfaces (concrete, asphalt, rooftops). The South Downtown sub-basin generates ≈3.6 million gallons of runoff per hour, pushing the aging combined sewer to 100% capacity. With no GSI active, any additional flow — from adjacent blocks, clogged inlets, or a slightly heavier cell — tips the system into backup. Manholes surcharge, low points flood, and basements take on water.",
  drivers: [
    { label: "Hard Surface Cover", value: "81%", status: "high" as const },
    { label: "Rainfall Event", value: "3.0 in/hr", status: "high" as const },
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
    ? Math.round(Math.min(progress * 100, 100))
    : Math.round(Math.min(progress * sol.pipeMax, sol.pipeMax));
  const flow = isOverload
    ? Math.round(Math.min(progress * 3645000, 3645000))
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
          max={3645000}
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
