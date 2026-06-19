import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, ArrowDownRight } from "lucide-react";
import { SmartStorageNetworkVisualization } from "./SmartStorageNetworkVisualization";
import { RainGardenVisualization } from "./RainGardenVisualization";
import { TreeTrenchVisualization } from "./TreeTrenchVisualization";
import { PermeablePavementVisualization } from "./PermeablePavementVisualization";
import { RetentionBasinVisualization } from "./RetentionBasinVisualization";
import { StorageTankVisualization } from "./StorageTankVisualization";
import { FloodVisualization } from "./FloodVisualization";
import {
  getZoneTrain,
  holdGallonsForStage,
  spaceForGallons,
  SOLUTION_CAPACITY,
  MODEL,
  type TrainStage,
} from "../data/treatmentTrain";
import { getZoneStrategy } from "../data/zoneStrategy";
import { ARCHETYPE_META } from "../data/zoneStrategy";

const MONO = "JetBrains Mono, monospace";

const FATE_LABEL: Record<string, string> = {
  "store-redirect": "Store + redirect",
  infiltrate: "Infiltrate",
  recharge: "Recharge aquifer",
  reuse: "Hold for reuse",
};

type WaterSource = "storm-drain" | "smart-tank";

function StageViz({
  vizId,
  isPlaying,
  speed,
  timelineValue,
  source,
}: {
  vizId: string;
  isPlaying: boolean;
  speed: number;
  timelineValue: number;
  source: WaterSource;
}) {
  const p = { isPlaying, speed, timelineValue, source };
  switch (vizId) {
    case "SmartStorageNetworkVisualization":
      return <SmartStorageNetworkVisualization isPlaying={isPlaying} speed={speed} timelineValue={timelineValue} />;
    case "RainGardenVisualization":
      return <RainGardenVisualization {...p} />;
    case "TreeTrenchVisualization":
      return <TreeTrenchVisualization {...p} />;
    case "PermeablePavementVisualization":
      return <PermeablePavementVisualization {...p} />;
    case "RetentionBasinVisualization":
      return <RetentionBasinVisualization {...p} />;
    case "StorageTankVisualization":
      return <StorageTankVisualization {...p} />;
    case "bioswale":
      return (
        <FloodVisualization mode="gsi" selectedSolution="bioswale" activeStep={0} {...p} />
      );
    default:
      return null;
  }
}

export function TreatmentTrain({ zoneId }: { zoneId: string }) {
  const train = getZoneTrain(zoneId);
  const strat = getZoneStrategy(zoneId);
  const accent = strat ? ARCHETYPE_META[strat.archetype].accent : "#00a8f3";

  const [stage, setStage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [t, setT] = useState(0);
  const rafRef = useRef(0);

  // Reset stage + clock when zone changes.
  useEffect(() => {
    setStage(0);
    setT(0);
  }, [zoneId]);

  // Reset clock when stage changes manually.
  useEffect(() => {
    setT(0);
  }, [stage]);

  // Drive the per-stage animation timeline (0→100 loop), like the main sim.
  useEffect(() => {
    if (!isPlaying) return;
    const loop = () => {
      setT((prev) => (prev + speed >= 100 ? 0 : prev + speed));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, speed]);

  // Auto-advance through stages on a timer.
  const stageCount = train?.stages.length ?? 0;
  useEffect(() => {
    if (!autoAdvance || stageCount === 0) return;
    const id = setInterval(() => {
      setStage((s) => (s + 1) % stageCount);
    }, 6500);
    return () => clearInterval(id);
  }, [autoAdvance, stageCount]);

  if (!train) return null;

  const safeStage = Math.min(stage, train.stages.length - 1);
  const current: TrainStage = train.stages[safeStage];
  const cap = SOLUTION_CAPACITY[current.solutionId];
  const held = holdGallonsForStage(train, current);
  const footprint = spaceForGallons(current.solutionId, held);

  return (
    <div
      style={{
        background: "rgba(4,12,26,0.75)",
        border: `1px solid ${accent}30`,
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "14px 18px 10px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 9, color: "#3a6080", fontFamily: MONO, letterSpacing: "0.12em" }}>
            TANK-LED TREATMENT TRAIN · 50-ACRE CATCHMENT · C=0.90
          </div>
          <div style={{ fontSize: 13, color: "#cfe6f6", fontWeight: 600, marginTop: 2 }}>
            Intercepting{" "}
            <span style={{ color: accent }}>{train.interceptFlowGpm.toLocaleString()} gpm</span>
            {" "}excess — slow, store &amp; redirect
          </div>
          <div style={{ fontSize: 10.5, color: "#5a8aaa", fontFamily: MONO, marginTop: 3 }}>
            Storm: {MODEL.stormFlowGpm.toLocaleString()} gpm · Drain capacity: {MODEL.drainCapacityGpm.toLocaleString()} gpm · Excess: {MODEL.excessFlowGpm.toLocaleString()} gpm → ~{(train.interceptGallons / 1000).toFixed(0)}k gal/hr
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setIsPlaying((p) => !p)} style={ctrlBtn(accent)}>
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
          </button>
          {[0.25, 0.5, 1].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              style={{ ...ctrlBtn(accent), width: "auto", padding: "6px 9px", fontSize: 10, fontFamily: MONO, background: speed === s ? `${accent}24` : "rgba(0,212,216,0.06)" }}
            >
              {s === 1 ? "1×" : s === 0.5 ? "0.5×" : "0.25×"}
            </button>
          ))}
          <button
            onClick={() => setAutoAdvance((a) => !a)}
            style={{ ...ctrlBtn(accent), background: autoAdvance ? `${accent}24` : "rgba(0,212,216,0.06)", fontSize: 10, padding: "6px 10px", width: "auto", fontFamily: MONO }}
          >
            AUTO {autoAdvance ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {/* Stepper — Storm Drain → stages, with pipe connectors */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "0 18px 12px", flexWrap: "wrap" }}>
        <StepChip label="STORM DRAIN" sub="pressure point" active={false} accent="#ef4444" onClick={() => {}} static />
        <PipeConnector accent={accent} flowing />
        {train.stages.map((s, i) => {
          const sc = SOLUTION_CAPACITY[s.solutionId];
          return (
            <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
              <StepChip
                label={`${i + 1}. ${sc?.name ?? s.solutionId}`}
                sub={s.role === "hub" ? "HUB" : `${s.sharePercent}%`}
                active={i === stage}
                accent={s.role === "hub" ? accent : "#00c878"}
                onClick={() => setStage(i)}
              />
              {i < train.stages.length - 1 && <PipeConnector accent={accent} flowing={i < stage} />}
            </span>
          );
        })}
      </div>

      {/* Divert banner for destinations */}
      {current.role === "destination" && (
        <div style={{ margin: "0 18px 8px", padding: "7px 12px", display: "flex", alignItems: "center", gap: 8, background: `${accent}12`, border: `1px solid ${accent}30`, borderRadius: 6 }}>
          <ArrowDownRight size={14} color={accent} />
          <span style={{ fontSize: 11.5, color: "#bfe0f2" }}>
            Smart tank diverts <b style={{ color: accent }}>{current.sharePercent}%</b> (~{held.toLocaleString()} gal) here through the pipe network.
          </span>
        </div>
      )}

      {/* Stage animation (reused canvas) */}
      <div key={`${zoneId}-${stage}`} style={{ height: 340, position: "relative", borderTop: "1px solid rgba(0,212,216,0.08)", borderBottom: "1px solid rgba(0,212,216,0.08)" }}>
        <StageViz
          vizId={cap?.vizId ?? ""}
          isPlaying={isPlaying}
          speed={speed}
          timelineValue={t}
          source={current.role === "hub" ? "storm-drain" : "smart-tank"}
        />
      </div>

      {/* Caption + metrics */}
      <div style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontFamily: MONO, fontWeight: 700, letterSpacing: "0.05em", color: current.role === "hub" ? accent : "#00c878", padding: "3px 8px", borderRadius: 4, background: current.role === "hub" ? `${accent}1e` : "rgba(0,200,120,0.12)", border: `1px solid ${current.role === "hub" ? accent : "#00c878"}40` }}>
            STAGE {stage + 1} / {train.stages.length} · {current.role === "hub" ? "HUB" : "DESTINATION"}
          </span>
          <span style={{ fontSize: 13.5, color: "#e2f0ff", fontWeight: 600 }}>{cap?.name ?? current.solutionId}</span>
        </div>
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#8ab0cc", lineHeight: 1.6 }}>{current.caption}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
          <Metric
            label="FLOW RATE"
            value={current.role === "hub"
              ? `${train.interceptFlowGpm.toLocaleString()} gpm`
              : `~${Math.round((current.sharePercent / 100) * train.interceptFlowGpm).toLocaleString()} gpm`}
            accent={accent}
          />
          <Metric label="VOLUME / HR" value={`~${held.toLocaleString()} gal`} accent={accent} />
          <Metric label="FOOTPRINT" value={footprint} accent={accent} />
          <Metric label="ABSORBS" value={cap?.absorbs ?? "—"} accent={accent} />
          <Metric label="FATE" value={FATE_LABEL[current.fate]} accent={accent} />
        </div>

        {/* Prev/next */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14 }}>
          <button onClick={() => setStage((s) => Math.max(0, s - 1))} disabled={stage === 0} style={navBtn(stage === 0)}>
            <ChevronLeft size={14} /> Prev
          </button>
          <button onClick={() => setStage((s) => Math.min(train.stages.length - 1, s + 1))} disabled={stage === train.stages.length - 1} style={navBtn(stage === train.stages.length - 1)}>
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ padding: "8px 10px", background: "rgba(4,14,30,0.6)", border: "1px solid rgba(0,212,216,0.1)", borderRadius: 6 }}>
      <div style={{ fontSize: 8.5, color: "#3a6080", fontFamily: MONO, letterSpacing: "0.08em", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 11.5, color: accent, fontWeight: 600, fontFamily: MONO, lineHeight: 1.3 }}>{value}</div>
    </div>
  );
}

function StepChip({
  label,
  sub,
  active,
  accent,
  onClick,
  static: isStatic,
}: {
  label: string;
  sub: string;
  active: boolean;
  accent: string;
  onClick: () => void;
  static?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={isStatic}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 1,
        padding: "5px 10px",
        borderRadius: 6,
        cursor: isStatic ? "default" : "pointer",
        background: active ? `${accent}1e` : "rgba(255,255,255,0.03)",
        border: active ? `1px solid ${accent}` : "1px solid rgba(255,255,255,0.08)",
        transition: "all 0.15s",
      }}
    >
      <span style={{ fontSize: 10.5, fontWeight: 700, color: active ? accent : "#7aa0bc", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ fontSize: 8, fontFamily: MONO, color: active ? accent : "#3a6080", letterSpacing: "0.06em" }}>{sub}</span>
    </button>
  );
}

function PipeConnector({ accent, flowing }: { accent: string; flowing: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: 22,
        height: 0,
        margin: "0 2px",
        borderTop: `2px dashed ${flowing ? accent : "rgba(255,255,255,0.16)"}`,
        opacity: flowing ? 0.9 : 0.5,
      }}
    />
  );
}

function ctrlBtn(accent: string): React.CSSProperties {
  return {
    width: 30,
    height: 28,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(0,212,216,0.06)",
    border: `1px solid ${accent}33`,
    borderRadius: 6,
    color: accent,
    cursor: "pointer",
  };
}

function navBtn(disabled: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "7px 14px",
    background: disabled ? "rgba(255,255,255,0.03)" : "rgba(0,212,216,0.08)",
    border: "1px solid rgba(0,212,216,0.2)",
    borderRadius: 6,
    color: disabled ? "#3a5870" : "#00d4d8",
    cursor: disabled ? "default" : "pointer",
    fontSize: 12,
  };
}
