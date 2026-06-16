import { useEffect, useState } from "react";
import { ArrowRight, AlertTriangle, CheckCircle } from "lucide-react";

export const FLOW_DATA: Record<string, {
  name: string; color: string;
  currentRunoff: number; currentOverflow: number;
  gsiRunoff: number; gsiOverflow: number;
  peakFlowReduction: number; pipeUtilBefore: number; pipeUtilAfter: number;
  runoffCapture: number; infiltration: number; sewerReduction: number;
  mechanism: string;
}> = {
  "bioswale": {
    name: "Bioswale", color: "#22c55e",
    currentRunoff: 156340, currentOverflow: 114544,
    gsiRunoff: 92000, gsiOverflow: 12000,
    peakFlowReduction: 47, pipeUtilBefore: 120, pipeUtilAfter: 68,
    runoffCapture: 47, infiltration: 35, sewerReduction: 63,
    mechanism: "Vegetated channel intercepts curb runoff and infiltrates it into soil before it reaches the storm drain.",
  },
  "rain-garden": {
    name: "Rain Garden", color: "#4ade80",
    currentRunoff: 156340, currentOverflow: 114544,
    gsiRunoff: 88000, gsiOverflow: 8000,
    peakFlowReduction: 54, pipeUtilBefore: 120, pipeUtilAfter: 62,
    runoffCapture: 52, infiltration: 42, sewerReduction: 60,
    mechanism: "Roof and yard runoff diverted into planted depression. Water infiltrates over hours, not seconds.",
  },
  "permeable-pavement": {
    name: "Permeable Pavement", color: "#06b6d4",
    currentRunoff: 156340, currentOverflow: 114544,
    gsiRunoff: 72000, gsiOverflow: 0,
    peakFlowReduction: 65, pipeUtilBefore: 120, pipeUtilAfter: 48,
    runoffCapture: 65, infiltration: 58, sewerReduction: 78,
    mechanism: "Porous surface stores rain in aggregate base layer, releasing slowly to soil and eliminating peak runoff spike.",
  },
  "tree-trench": {
    name: "Tree Trench", color: "#16a34a",
    currentRunoff: 156340, currentOverflow: 114544,
    gsiRunoff: 104000, gsiOverflow: 22000,
    peakFlowReduction: 38, pipeUtilBefore: 120, pipeUtilAfter: 75,
    runoffCapture: 38, infiltration: 28, sewerReduction: 48,
    mechanism: "Underground structural soil cells and root systems absorb runoff. Canopy intercepts 15–20% of rainfall before it hits the ground.",
  },
  "retention-basin": {
    name: "Retention Basin", color: "#0284c7",
    currentRunoff: 156340, currentOverflow: 114544,
    gsiRunoff: 68000, gsiOverflow: 0,
    peakFlowReduction: 70, pipeUtilBefore: 120, pipeUtilAfter: 38,
    runoffCapture: 78, infiltration: 22, sewerReduction: 85,
    mechanism: "Large-scale detention pond captures stormwater district-wide, releasing at a controlled rate the sewer can handle.",
  },
  "cistern": {
    name: "Cistern", color: "#7c3aed",
    currentRunoff: 156340, currentOverflow: 114544,
    gsiRunoff: 98000, gsiOverflow: 18000,
    peakFlowReduction: 42, pipeUtilBefore: 120, pipeUtilAfter: 72,
    runoffCapture: 42, infiltration: 15, sewerReduction: 55,
    mechanism: "Rooftop runoff stored in tank for later reuse or metered release, reducing demand on sewer during peak rain.",
  },
  "smart-valve": {
    name: "Smart Valve", color: "#f59e0b",
    currentRunoff: 156340, currentOverflow: 114544,
    gsiRunoff: 108000, gsiOverflow: 5000,
    peakFlowReduction: 58, pipeUtilBefore: 120, pipeUtilAfter: 55,
    runoffCapture: 30, infiltration: 8, sewerReduction: 68,
    mechanism: "IoT sensor monitors pipe levels in real-time. Valve throttles flow to prevent capacity exceedance, distributing load over time.",
  },
};

interface Props {
  selectedSolution: string | null;
  timelineValue: number;
}

function AnimatedNumber({ target, duration = 800 }: { target: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const from = display;
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * ease));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target]);
  return <>{display.toLocaleString()}</>;
}

function CompareBar({ label, before, after, color, unit = "" }: { label: string; before: number; after: number; color: string; unit?: string }) {
  const maxVal = Math.max(before, 1);
  const beforePct = Math.min((before / maxVal) * 100, 100);
  const afterPct = Math.min((after / maxVal) * 100, 100);
  const reduction = Math.round(((before - after) / before) * 100);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "#5b8ab0", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.05em" }}>{label}</span>
        {after < before && (
          <span style={{ fontSize: 10, color: color, fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>
            ↓ {reduction}%
          </span>
        )}
      </div>
      {/* Before bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: "#3a5060", width: 36, fontFamily: "JetBrains Mono, monospace", textAlign: "right" }}>NOW</span>
        <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 3 }}>
          <div style={{ width: `${beforePct}%`, height: "100%", background: "rgba(239,68,68,0.65)", borderRadius: 3, boxShadow: "0 0 6px rgba(239,68,68,0.3)" }} />
        </div>
        <span style={{ fontSize: 9, color: "#7aadcc", fontFamily: "JetBrains Mono, monospace", width: 70, textAlign: "right" }}>
          {before.toLocaleString()}{unit}
        </span>
      </div>
      {/* After bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, color: color, width: 36, fontFamily: "JetBrains Mono, monospace", textAlign: "right" }}>GSI</span>
        <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 3 }}>
          <div style={{
            width: `${afterPct}%`, height: "100%", borderRadius: 3,
            background: color,
            boxShadow: `0 0 6px ${color}60`,
            transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
          }} />
        </div>
        <span style={{ fontSize: 9, color: color, fontFamily: "JetBrains Mono, monospace", width: 70, textAlign: "right" }}>
          {after.toLocaleString()}{unit}
        </span>
      </div>
    </div>
  );
}

function PipeUtilBar({ before, after, color }: { before: number; after: number; color: string }) {
  const scale = 130;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, color: "#3a6080", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em", marginBottom: 8 }}>
        PIPE UTILIZATION
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Before */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: "#5b8ab0", marginBottom: 3, fontFamily: "JetBrains Mono, monospace" }}>CURRENT</div>
          <div style={{ height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "visible", position: "relative" }}>
            <div style={{
              width: `${Math.min((before / scale) * 100, 100)}%`,
              height: "100%", background: "rgba(239,68,68,0.7)", borderRadius: 3,
              boxShadow: "0 0 8px rgba(239,68,68,0.4)",
            }} />
            {before > 100 && (
              <div style={{
                position: "absolute", right: -2, top: -2, bottom: -2,
                width: `${((before - 100) / scale) * 100}%`,
                background: "rgba(239,68,68,0.9)", borderRadius: "0 3px 3px 0",
                border: "1px solid rgba(239,68,68,0.8)",
                animation: "overflowPulse 1.5s ease-in-out infinite",
              }} />
            )}
          </div>
          <div style={{ fontSize: 12, color: "#ef4444", fontWeight: 700, fontFamily: "JetBrains Mono, monospace", marginTop: 4 }}>
            {before}%
          </div>
        </div>

        <ArrowRight size={16} color={color} style={{ flexShrink: 0 }} />

        {/* After */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: color, marginBottom: 3, fontFamily: "JetBrains Mono, monospace" }}>WITH GSI</div>
          <div style={{ height: 10, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{
              width: `${Math.min((after / scale) * 100, 100)}%`,
              height: "100%", borderRadius: 3,
              background: color,
              boxShadow: `0 0 8px ${color}60`,
              transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1)",
            }} />
          </div>
          <div style={{ fontSize: 12, color: color, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", marginTop: 4 }}>
            {after}%
          </div>
        </div>
      </div>
      <style>{`@keyframes overflowPulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}

export function WaterMovementPanel({ selectedSolution, timelineValue }: Props) {
  const data = selectedSolution ? FLOW_DATA[selectedSolution] : null;
  if (!data) return null;

  const fl = Math.min(timelineValue / 100, 1);
  const noOverflow = data.gsiOverflow === 0;

  return (
    <div
      style={{
        borderTop: "1px solid rgba(0,212,216,0.08)",
        padding: "16px 20px",
        background: "rgba(3,8,18,0.6)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 3, height: 14, background: data.color, borderRadius: 2, boxShadow: `0 0 6px ${data.color}` }} />
        <span style={{ fontSize: 10, color: "#e2f0ff", fontWeight: 600, letterSpacing: "0.06em" }}>
          HOW THIS CHANGES WATER MOVEMENT
        </span>
      </div>

      {/* Mechanism */}
      <p style={{ fontSize: 10, color: "#5b8ab0", lineHeight: 1.65, margin: "0 0 14px" }}>
        {data.mechanism}
      </p>

      {/* Compare bars */}
      <CompareBar
        label="TOTAL RUNOFF"
        before={data.currentRunoff}
        after={Math.round(data.gsiRunoff * Math.min(fl * 1.2, 1))}
        color={data.color}
        unit=" gal"
      />
      <CompareBar
        label="SEWER OVERFLOW"
        before={data.currentOverflow}
        after={Math.round(data.gsiOverflow * Math.min(fl * 1.2, 1))}
        color={data.color}
        unit=" gal"
      />

      {/* Pipe utilization */}
      <PipeUtilBar before={data.pipeUtilBefore} after={data.pipeUtilAfter} color={data.color} />

      {/* Key metric callouts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {[
          { label: "PEAK FLOW ↓", value: `${data.peakFlowReduction}%`, color: data.color },
          { label: "RUNOFF CAP.", value: `${data.runoffCapture}%`, color: data.color },
          { label: "INFILTRATION", value: `${data.infiltration}%`, color: "#00a8f3" },
          { label: "SEWER LOAD ↓", value: `${data.sewerReduction}%`, color: "#00d4d8" },
        ].map(m => (
          <div key={m.label} style={{
            padding: "8px 10px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(0,212,216,0.08)",
            borderRadius: 6,
          }}>
            <div style={{ fontSize: 9, color: "#3a6080", fontFamily: "JetBrains Mono, monospace", marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 15, color: m.color, fontWeight: 700, fontFamily: "JetBrains Mono, monospace", lineHeight: 1 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Overflow status */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
        background: noOverflow ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
        border: `1px solid ${noOverflow ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
        borderRadius: 6,
      }}>
        {noOverflow
          ? <CheckCircle size={13} color="#22c55e" />
          : <AlertTriangle size={13} color="#f59e0b" />}
        <span style={{ fontSize: 10, color: noOverflow ? "#22c55e" : "#f59e0b", fontWeight: 600 }}>
          {noOverflow
            ? "Zero overflow events projected"
            : `Overflow reduced from 114,544 → ${data.gsiOverflow.toLocaleString()} gal`}
        </span>
      </div>
    </div>
  );
}
