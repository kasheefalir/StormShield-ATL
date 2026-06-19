import { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { FloodVisualization } from "./components/FloodVisualization";
import { AnalyticsPanel } from "./components/AnalyticsPanel";
import { ProcessTimeline } from "./components/ProcessTimeline";
import { SolutionsWorkspace } from "./components/SolutionsWorkspace";
import { Play, Pause, ChevronRight, Gauge, Activity, Zap, AlertCircle } from "lucide-react";
import { FloodZonesPage } from "./components/FloodZonesPage";
import { WaterManagementPage } from "./components/WaterManagementPage";
import { StrategyBadge } from "./components/StrategyPanel";

type SimMode = "current" | "gsi";
type ActivePage = "overview" | "flood-map" | "flood-zones" | "solutions" | "water-management";

// Zone metadata for breadcrumb / header — mirrors FloodZonesPage ZONES array
const ZONE_META: Record<string, { name: string; imperviousPct: number; complaints: number }> = {
  "westside-proctor":  { name: "Westside / Proctor Creek",          imperviousPct: 68, complaints: 126 },
  "south-downtown":    { name: "South Downtown",                     imperviousPct: 81, complaints: 102 },
  "old-fourth-ward":   { name: "Old Fourth Ward",                    imperviousPct: 61, complaints: 72  },
  "vine-city":         { name: "Vine City / English Avenue",         imperviousPct: 65, complaints: 118 },
  "airport-south":     { name: "Airport / South River Headwaters",   imperviousPct: 74, complaints: 67  },
};

function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        background: bg,
        border: `1px solid ${color}40`,
        borderRadius: 4,
        fontSize: 11,
        color,
        fontWeight: 600,
        letterSpacing: "0.04em",
        fontFamily: "JetBrains Mono, monospace",
      }}
    >
      {children}
    </span>
  );
}

interface AppProps {
  onNavigateToMap?: () => void;
}

export default function App({ onNavigateToMap }: AppProps = {}) {
  const [activePage, setActivePage] = useState<ActivePage>("flood-zones");
  const [simMode, setSimMode] = useState<SimMode>("current");
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [timelineValue, setTimelineValue] = useState(0);
  const [activeStep, setActiveStep] = useState(1);
  const [selectedSolution, setSelectedSolution] = useState<string | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string>("south-downtown");
  const animRef = useRef<number>(0);
  const dirRef = useRef(1);

  useEffect(() => {
    if (!isPlaying) return;
    const tick = () => {
      setTimelineValue((v) => {
        let next = v + 0.4 * speed * dirRef.current;
        if (next >= 100) { next = 100; dirRef.current = -1; }
        if (next <= 0) { next = 0; dirRef.current = 1; }
        return next;
      });
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, speed]);

  useEffect(() => {
    const t = timelineValue;
    if (t < 15) setActiveStep(1);
    else if (t < 30) setActiveStep(2);
    else if (t < 50) setActiveStep(3);
    else if (t < 65) setActiveStep(4);
    else if (t < 80) setActiveStep(5);
    else setActiveStep(6);
  }, [timelineValue]);

  const handleNavigate = (page: string) => {
    if (page === "flood-map" && onNavigateToMap) {
      onNavigateToMap();
      return;
    }
    setActivePage(page as ActivePage);
  };
  const handleExploreSolutions = () => setActivePage("solutions");
  const handleSelectSolution = (id: string, zoneId?: string) => {
    setSelectedSolution(id);
    setSimMode("gsi");
    if (zoneId && ZONE_META[zoneId]) setSelectedZoneId(zoneId);
    setActivePage("overview");
  };
  const handleBack = () => setActivePage("flood-zones");


  const showSolutions      = activePage === "solutions";
  const showFloodZones     = activePage === "flood-zones";
  const showWaterMgmt      = activePage === "water-management";

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        background: "#040d1a",
        fontFamily: "Inter, DM Sans, system-ui, sans-serif",
        overflow: "hidden",
        color: "#e2f0ff",
      }}
    >
      <Sidebar activePage={activePage} onNavigate={handleNavigate} onNavigateToMap={onNavigateToMap} />

      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {showWaterMgmt ? (
          <WaterManagementPage />
        ) : showFloodZones ? (
          <FloodZonesPage
            onExploreSolution={(solutionId, zoneId) => {
              handleSelectSolution(solutionId, zoneId);
            }}
          />
        ) : showSolutions ? (
          <SolutionsWorkspace
            onBack={handleBack}
            onSelectSolution={handleSelectSolution}
            selectedSolution={selectedSolution}
          />
        ) : (
          <>
            {/* Top bar */}
            <div
              style={{
                padding: "14px 24px 12px",
                borderBottom: "1px solid rgba(0,212,216,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
                background: "rgba(4,10,22,0.6)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                  {["Atlanta", "Flood Zones", ZONE_META[selectedZoneId]?.name ?? "Zone"].map((crumb, i, arr) => (
                    <span key={crumb} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 11, color: i === arr.length - 1 ? "#a8c8e8" : "#3a6080" }}>
                        {crumb}
                      </span>
                      {i < arr.length - 1 && <ChevronRight size={10} color="#2d5c7a" />}
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <h1 style={{ margin: 0, color: "#e2f0ff", letterSpacing: "-0.02em" }}>
                    {ZONE_META[selectedZoneId]?.name ?? "Zone"}
                  </h1>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Badge color="#ef4444" bg="rgba(239,68,68,0.1)">
                      <AlertCircle size={11} /> High Flood Risk
                    </Badge>
                    <Badge color="#f59e0b" bg="rgba(245,158,11,0.08)">
                      <Gauge size={11} /> {ZONE_META[selectedZoneId]?.imperviousPct ?? 81}% Hard Surface
                    </Badge>
                    <Badge color="#00a8f3" bg="rgba(0,168,243,0.08)">
                      <Activity size={11} /> {ZONE_META[selectedZoneId]?.complaints ?? 102} Complaints
                    </Badge>
                    {selectedSolution && simMode === "gsi" && (
                      <Badge color="#22c55e" bg="rgba(34,197,94,0.08)">
                        <Zap size={11} /> GSI Active
                      </Badge>
                    )}
                    <StrategyBadge zoneId={selectedZoneId} />
                  </div>
                </div>
              </div>

              {/* Mode toggle */}
              <div
                style={{
                  display: "flex",
                  background: "rgba(4,14,30,0.8)",
                  border: "1px solid rgba(0,212,216,0.15)",
                  borderRadius: 8,
                  padding: 3,
                  gap: 2,
                }}
              >
                {(["current", "gsi"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSimMode(m)}
                    style={{
                      padding: "7px 16px",
                      borderRadius: 6,
                      border: "none",
                      background:
                        simMode === m
                          ? m === "current"
                            ? "linear-gradient(135deg, rgba(239,68,68,0.25), rgba(239,68,68,0.15))"
                            : "linear-gradient(135deg, rgba(0,212,216,0.25), rgba(0,168,243,0.15))"
                          : "transparent",
                      color: simMode === m ? (m === "current" ? "#ef4444" : "#00d4d8") : "#3a6080",
                      fontSize: 12,
                      fontWeight: simMode === m ? 600 : 400,
                      cursor: "pointer",
                      letterSpacing: "0.03em",
                      transition: "all 0.2s ease",
                      whiteSpace: "nowrap",
                      boxShadow:
                        simMode === m
                          ? m === "current"
                            ? "0 0 12px rgba(239,68,68,0.2)"
                            : "0 0 12px rgba(0,212,216,0.2)"
                          : "none",
                    }}
                  >
                    {m === "current" ? "Current System" : "With Selected GSI"}
                  </button>
                ))}
              </div>
            </div>

            {/* Main content: visualization + analytics */}
            <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

                {/* Visualization hero */}
                <div style={{ flex: 1, position: "relative", overflow: "hidden", minHeight: 0 }}>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        simMode === "current"
                          ? "radial-gradient(ellipse at 50% 80%, rgba(239,68,68,0.04) 0%, transparent 70%)"
                          : "radial-gradient(ellipse at 50% 80%, rgba(0,212,216,0.04) 0%, transparent 70%)",
                      pointerEvents: "none",
                      transition: "background 0.5s ease",
                      zIndex: 1,
                    }}
                  />
                  <FloodVisualization
                    mode={simMode}
                    isPlaying={isPlaying}
                    speed={speed}
                    timelineValue={timelineValue}
                    activeStep={activeStep}
                    selectedSolution={selectedSolution}
                  />

                  {/* Corner stats */}
                  <div
                    style={{
                      position: "absolute",
                      top: 14,
                      left: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      zIndex: 2,
                    }}
                  >
                    {[
                      { label: "ZONE AREA", value: "0.82 mi²" },
                      { label: "RAIN INTENSITY", value: "3.0 in/hr" },
                      { label: "SEWER AGE", value: "95–130 yrs" },
                    ].map((s) => (
                      <div
                        key={s.label}
                        style={{
                          background: "rgba(4,14,30,0.75)",
                          backdropFilter: "blur(8px)",
                          border: "1px solid rgba(0,212,216,0.1)",
                          borderRadius: 6,
                          padding: "5px 10px",
                        }}
                      >
                        <div style={{ fontSize: 9, color: "#3a6080", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.08em" }}>
                          {s.label}
                        </div>
                        <div style={{ fontSize: 12, color: "#00d4d8", fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>
                          {s.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedSolution && simMode === "gsi" && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 14,
                        left: 14,
                        background: "rgba(34,197,94,0.12)",
                        border: "1px solid rgba(34,197,94,0.25)",
                        borderRadius: 6,
                        padding: "6px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        zIndex: 2,
                      }}
                    >
                      <Zap size={12} color="#22c55e" />
                      <span style={{ fontSize: 11, color: "#22c55e", fontFamily: "JetBrains Mono, monospace" }}>
                        GSI ACTIVE: {selectedSolution.replace(/-/g, " ").toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Process timeline */}
                <div
                  style={{
                    height: 100,
                    flexShrink: 0,
                    background: "rgba(3,10,22,0.85)",
                    borderTop: "1px solid rgba(0,212,216,0.07)",
                  }}
                >
                  <ProcessTimeline activeStep={activeStep} />
                </div>

                {/* Simulation controls */}
                <div
                  style={{
                    height: 52,
                    flexShrink: 0,
                    background: "rgba(3,8,18,0.9)",
                    borderTop: "1px solid rgba(0,212,216,0.07)",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "0 20px",
                  }}
                >
                  <button
                    onClick={() => setIsPlaying((p) => !p)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: isPlaying ? "rgba(0,212,216,0.12)" : "rgba(0,212,216,0.2)",
                      border: "1px solid rgba(0,212,216,0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "all 0.15s",
                    }}
                  >
                    {isPlaying ? <Pause size={13} color="#00d4d8" /> : <Play size={13} color="#00d4d8" />}
                  </button>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "#3a6080", fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap" }}>
                      SPEED
                    </span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[0.5, 1, 2, 4].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSpeed(s)}
                          style={{
                            padding: "3px 8px",
                            borderRadius: 4,
                            border: "1px solid rgba(0,212,216,0.15)",
                            background: speed === s ? "rgba(0,212,216,0.15)" : "transparent",
                            color: speed === s ? "#00d4d8" : "#3a6080",
                            fontSize: 10,
                            cursor: "pointer",
                            fontFamily: "JetBrains Mono, monospace",
                            transition: "all 0.15s",
                          }}
                        >
                          {s}×
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 9, color: "#2d5c7a", fontFamily: "JetBrains Mono, monospace" }}>0:00</span>
                    <div style={{ flex: 1, position: "relative", height: 20, display: "flex", alignItems: "center" }}>
                      <div style={{ position: "absolute", left: 0, right: 0, height: 3, background: "rgba(0,212,216,0.12)", borderRadius: 2 }} />
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          width: `${timelineValue}%`,
                          height: 3,
                          background:
                            simMode === "current"
                              ? `linear-gradient(90deg, #00d4d8, ${timelineValue > 65 ? "#ef4444" : "#00a8f3"})`
                              : "linear-gradient(90deg, #00d4d8, #22c55e)",
                          borderRadius: 2,
                          boxShadow: "0 0 8px rgba(0,212,216,0.4)",
                          transition: "background 0.5s",
                        }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={timelineValue}
                        onChange={(e) => {
                          setIsPlaying(false);
                          setTimelineValue(Number(e.target.value));
                        }}
                        style={{
                          position: "absolute",
                          left: 0,
                          right: 0,
                          width: "100%",
                          opacity: 0,
                          height: 20,
                          cursor: "pointer",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          left: `${timelineValue}%`,
                          transform: "translateX(-50%)",
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: "#00d4d8",
                          boxShadow: "0 0 8px rgba(0,212,216,0.6)",
                          pointerEvents: "none",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: 9, color: "#2d5c7a", fontFamily: "JetBrains Mono, monospace" }}>1:00h</span>
                  </div>

                  {simMode === "current" && (
                    <button
                      onClick={handleExploreSolutions}
                      style={{
                        padding: "8px 16px",
                        background: "linear-gradient(135deg, #00d4d8, #00a8f3)",
                        border: "none",
                        borderRadius: 6,
                        color: "#040d1a",
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                        letterSpacing: "0.03em",
                        whiteSpace: "nowrap",
                        boxShadow: "0 0 20px rgba(0,212,216,0.35)",
                        transition: "all 0.2s",
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 28px rgba(0,212,216,0.55)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(0,212,216,0.35)")}
                    >
                      Explore Solutions →
                    </button>
                  )}

                  {simMode === "gsi" && selectedSolution && (
                    <button
                      onClick={handleExploreSolutions}
                      style={{
                        padding: "7px 14px",
                        background: "rgba(34,197,94,0.1)",
                        border: "1px solid rgba(34,197,94,0.25)",
                        borderRadius: 6,
                        color: "#22c55e",
                        fontWeight: 600,
                        fontSize: 11,
                        cursor: "pointer",
                        letterSpacing: "0.03em",
                        whiteSpace: "nowrap",
                        transition: "all 0.2s",
                        flexShrink: 0,
                      }}
                    >
                      ⇄ Switch GSI
                    </button>
                  )}
                </div>
              </div>

              <AnalyticsPanel mode={simMode} timelineValue={timelineValue} selectedSolution={selectedSolution} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
