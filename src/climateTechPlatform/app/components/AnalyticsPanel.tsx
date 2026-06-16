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
    statusSub: "Bioswale — curb-to-soil pathway",
    accentColor: "#00c878",
    icon: <Sprout size={18} color="#00c878" />,
    pipeMax: 50,
    flowMax: 7020,
    floodMax: 16,
    what:
      "Vegetated bioswales intercept surface runoff at the curb edge before it reaches the storm drain inlet. Engineered soil (12–18\" amended layer) achieves 1–5 in/hr infiltration, absorbing the 2.4 in/hr storm event. Plants slow flow velocity by 60–80%, giving water time to percolate. 70% of runoff is captured in the bioswale cell, cutting peak sewer flow by 52% and dropping pipe utilization from 105% to ~50%.",
    metricsFn: (p) => [
      { label: "Bioswale Area", value: "~3,200 sq ft", status: "low" },
      { label: "Soil Infiltration", value: "2.4 in/hr", status: "low" },
      { label: "Plant Cover", value: "Native / dense", status: "low" },
      { label: "Runoff Captured", value: `${Math.round(p * 70)}%`, status: "low" },
      {
        label: "Remaining to Sewer",
        value: `${Math.round((1 - p * 0.7) * 100)}%`,
        status: "low",
      },
    ],
    impactFn: (p, pipe) =>
      `52% peak flow reduction. Pipe drops from 105% → ${pipe}% capacity. ${Math.round(p * 70)}% of surface runoff intercepted at curb. Zero overflow.`,
  },

  "rain-garden": {
    statusVerb: "CAPTURING",
    statusSub: "4 rain gardens active — residential network",
    accentColor: "#00c878",
    icon: <Leaf size={18} color="#00c878" />,
    pipeMax: 37,
    flowMax: 8190,
    floodMax: 12,
    what:
      "Distributed rain gardens capture runoff at 4 residential sites across the zone. Each 280 sq ft garden is engineered with native plantings and amended soil achieving 1.8 in/hr infiltration. During a 2.4 in/hr storm, the gardens collectively intercept 22,000 gallons — 65% of sewer-bound runoff — before it reaches the combined sewer inlet. This drops the 48\" main from 105% utilization to 37%, eliminating overflow risk entirely.",
    metricsFn: (p) => [
      { label: "Gallons Captured", value: `${Math.round(p * 22000).toLocaleString()} gal`, status: "low" },
      { label: "Infiltration Rate", value: `${(p * 1.82).toFixed(1)} in/hr`, status: "low" },
      { label: "Sewer Load Reduction", value: `${Math.round(p * 65)}%`, status: "low" },
      { label: "Gardens Active", value: "4 sites", status: "low" },
      { label: "Avg. Garden Area", value: "280 sq ft", status: "low" },
      {
        label: "Remaining Sewer Load",
        value: `${Math.round((1 - p * 0.65) * 100)}%`,
        status: p > 0.5 ? "low" : "medium",
      },
    ],
    impactFn: (p, pipe) =>
      `4 rain gardens capture ${Math.round(p * 22000).toLocaleString()} gallons of runoff at ${(p * 1.82).toFixed(1)} in/hr. Sewer load reduced by ${Math.round(p * 65)}% — pipe at ${pipe}% capacity. No overflow.`,
  },

  "tree-trench": {
    statusVerb: "ABSORBING",
    statusSub: "6 street trees + underground trenches",
    accentColor: "#00dc8a",
    icon: <TreePine size={18} color="#00dc8a" />,
    pipeMax: 68,
    flowMax: 15210,
    floodMax: 22,
    what:
      "Six street trees with 480 linear feet of underground Silva Cells form a root-zone storage network beneath the sidewalk. Each tree's structural soil profile holds 1,440 gallons of storm runoff, slowly absorbed through the root system over 24–48 hours. Together they capture 8,640 gallons per storm event, reducing peak sewer flow by 35% and lowering pipe utilization from 105% to 68%. The canopy also reduces summer surface temperatures by up to 4.8°F.",
    metricsFn: (p) => [
      { label: "Runoff Captured", value: `${Math.round(p * 8640).toLocaleString()} gal`, status: "low" },
      { label: "Urban Cooling", value: `${(p * 4.8).toFixed(1)}°F`, status: "low" },
      { label: "Sewer Flow Reduction", value: `${Math.round(p * 35)}%`, status: "low" },
      { label: "Tree Health Boost", value: `${Math.round(p * 78)}%`, status: "low" },
      { label: "Street Trees", value: "6 trees", status: "low" },
      { label: "Silva Cell Storage", value: "8,640 gal max", status: "low" },
      {
        label: "Remaining Sewer Load",
        value: `${Math.round((1 - p * 0.35) * 100)}%`,
        status: p > 0.7 ? "low" : "medium",
      },
    ],
    impactFn: (p, pipe) =>
      `Street trees capture ${Math.round(p * 8640).toLocaleString()} gallons in root-zone storage, cool the street by ${(p * 4.8).toFixed(1)}°F, and reduce sewer demand by ${Math.round(p * 35)}% — pipe at ${pipe}% capacity. No overflow.`,
  },

  "permeable-pavement": {
    statusVerb: "INFILTRATING",
    statusSub: "2 permeable pavement sections active",
    accentColor: "#00d4dc",
    icon: <Layers size={18} color="#00d4dc" />,
    pipeMax: 30,
    flowMax: 3978,
    floodMax: 10,
    what:
      "Two sections of permeable asphalt/concrete pavement — totaling 8,400 sq ft — allow stormwater to pass through the surface into a crushed stone aggregate base. The 18\" void layer holds up to 28,000 gallons with a 32% void ratio, achieving 3.2 in/hr effective infiltration. This eliminates 83% of surface runoff that would otherwise flow directly to the storm drain, cutting peak sewer flow by 72% and keeping the 48\" combined main at just 30% capacity.",
    metricsFn: (p) => [
      { label: "Runoff Reduction", value: `${Math.round(p * 83)}%`, status: "low" },
      { label: "Aggregate Storage", value: `${Math.round(p * 28000).toLocaleString()} gal`, status: "low" },
      { label: "Infiltration Rate", value: `${(p * 3.2).toFixed(1)} in/hr`, status: "low" },
      { label: "Peak Flow Reduction", value: `${Math.round(p * 72)}%`, status: "low" },
      { label: "Permeable Area", value: "~8,400 sq ft", status: "low" },
      { label: "Void Ratio", value: "32%", status: "low" },
      {
        label: "Remaining Sewer Load",
        value: `${Math.round((1 - p * 0.83) * 100)}%`,
        status: p > 0.5 ? "low" : "medium",
      },
    ],
    impactFn: (p, pipe) =>
      `Permeable surfaces absorb ${Math.round(p * 83)}% of runoff, storing ${Math.round(p * 28000).toLocaleString()} gallons at ${(p * 3.2).toFixed(1)} in/hr infiltration. Peak flow cut by ${Math.round(p * 72)}%. Sewer pipe at ${pipe}% capacity.`,
  },

  "smart-storage-network": {
    statusVerb: "DIVERTING",
    statusSub: "Smart Storage — RTC valve network",
    accentColor: "#00a8f3",
    icon: <Zap size={18} color="#00a8f3" />,
    pipeMax: 57,
    flowMax: 6084,
    floodMax: 18,
    what:
      "Real-time control valves read pressure sensors across the sewer network and divert peak flows into distributed storage before the system backs up. Used in Milwaukee, South Bend, and Columbus, RTC shifts water in time rather than space. At peak storm intensity, 3,850 gal/min is diverted, dropping pipe utilization from 130% (active overflow) to 57% within minutes of valve activation.",
    metricsFn: (p) => [
      { label: "Flow Diverted", value: `${Math.round(p * 3850).toLocaleString()} gal/min`, status: "low" },
      { label: "Storage Used", value: `${(p * 2.1).toFixed(1)}M gal`, status: "low" },
      { label: "Peak Flow Reduction", value: `${Math.round(p * 74)}%`, status: "low" },
      { label: "Sensor Nodes", value: "12 active", status: "low" },
      { label: "Valve Response", value: "< 90 sec", status: "low" },
      {
        label: "Remaining Pipe Load",
        value: `${Math.round(57 + (1 - p) * 48)}%`,
        status: p > 0.6 ? "low" : "medium",
      },
    ],
    impactFn: (p, pipe) =>
      `${Math.round(p * 74)}% peak flow diverted. Pipe drops from 130% → ${pipe}% capacity. ${Math.round(p * 3850).toLocaleString()} gal/min redirected through valve network. Zero overflow projected.`,
  },

  "retention-basin": {
    statusVerb: "DETAINING",
    statusSub: "Retention Basin — controlled detention",
    accentColor: "#3b82f6",
    icon: <Waves size={18} color="#3b82f6" />,
    pipeMax: 61,
    flowMax: 5616,
    floodMax: 20,
    what:
      "The retention basin captures runoff from the entire contributing drainage area, detaining up to 6,400 gal/min of peak inflow in a surface or subsurface pond. Water releases slowly through a controlled outlet over 24–72 hours, preventing the downstream 48\" combined sewer from being overwhelmed. Georgia Stormwater Manual sizing delivers 76% peak flow reduction and 65% total runoff volume cut.",
    metricsFn: (p) => [
      { label: "Inflow Detained", value: `${Math.round(p * 6400).toLocaleString()} gal/min`, status: "low" },
      { label: "Basin Volume Used", value: `${(p * 4.8).toFixed(1)}M gal`, status: "low" },
      { label: "Peak Flow Reduction", value: `${Math.round(p * 76)}%`, status: "low" },
      { label: "Total Vol. Reduction", value: `${Math.round(p * 65)}%`, status: "low" },
      { label: "Outlet Control", value: "Gated riser", status: "low" },
      { label: "Drawdown Time", value: "24–72 hrs", status: "low" },
    ],
    impactFn: (p, pipe) =>
      `76% peak flow reduction. Pipe at ${pipe}% capacity. ${Math.round(p * 65)}% less total runoff volume reaching sewer. Basin detaining ${(p * 4.8).toFixed(1)}M gallons with controlled release.`,
  },
};

const DEFAULT_GSI_DESCRIPTION: SolutionDesc = {
  statusVerb: "ACTIVE",
  statusSub: "With green infrastructure",
  accentColor: "#00d4b4",
  icon: <Activity size={18} color="#00d4b4" />,
  pipeMax: 38,
  flowMax: 8100,
  floodMax: 18,
  what:
    "Green stormwater infrastructure is active across this drainage zone. Bioswales intercept curb runoff, rain gardens absorb roof discharge, and permeable pavement infiltrates road surface water. Together they capture 42–83% of runoff at the source, delaying peak flow arrival and keeping the 48\" combined sewer below capacity during the current 2.4 in/hr storm event.",
  metricsFn: () => [
    { label: "Impervious Surface", value: "81%", status: "high" },
    { label: "Rainfall Event", value: "2.4 in/hr", status: "high" },
    { label: "Infrastructure Age", value: "95–130 yrs", status: "medium" },
    { label: "Elevation Risk", value: "Moderate", status: "medium" },
    { label: "GSI Coverage", value: "34%", status: "low" },
  ],
  impactFn: (_, pipe) =>
    `Peak flow reduced by 63%. System operating at ${pipe}% capacity. Zero overflow events projected.`,
};

const OVERLOAD_DESCRIPTION = {
  what:
    "Heavy rainfall on 81% impervious surfaces generates 23,400 gal/hr of runoff that funnels directly into the aging combined sewer. The 48\" main — designed for a 10-year storm — reaches 105% capacity within 45 minutes of peak rainfall. Sewage and stormwater back up at manholes and into basements across South Downtown. No GSI is active to intercept or delay peak flow.",
  drivers: [
    { label: "Impervious Surface", value: "81%", status: "high" as const },
    { label: "Rainfall Event", value: "2.4 in/hr", status: "high" as const },
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
    ? Math.round(Math.min(progress * 23400, 23400))
    : Math.round(Math.min(progress * sol.flowMax, sol.flowMax));
  const overflow = isOverload ? Math.round(Math.max(0, (progress - 0.65) * 14286)) : 0;
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
          max={25000}
          color="#00a8f3"
          unit=" gal/hr"
        />
        <MetricBar
          label="OVERFLOW"
          value={overflow}
          max={5000}
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
              Green infrastructure can cut peak stormwater flow by 40–70% in this zone.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
