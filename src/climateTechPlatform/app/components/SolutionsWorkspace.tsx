import { useState } from "react";
import { Check, Zap, DollarSign, Ruler, TrendingDown } from "lucide-react";
import { ARCHETYPE_META } from "../data/zoneStrategy";
import { SOLUTION_CAPACITY, spaceForGallons } from "../data/treatmentTrain";

const MONO = "JetBrains Mono, monospace";

// Short "lead with" guidance per archetype — keeps the Solutions surface aligned
// with the land/soil strategy shown in Flood Zones and Overview.
const ARCHETYPE_GUIDANCE: Record<string, { zones: string; lead: string }> = {
  "dense-core": {
    zones: "South Downtown, Midtown",
    lead: "Lead with Smart Storage tanks. No land or soil for green GSI — it is a marginal bonus.",
  },
  "mixed-urban": {
    zones: "Westside, Old Fourth Ward, Vine City",
    lead: "Smart-tank backbone + bioswales / rain gardens as meaningful support.",
  },
  "land-available": {
    zones: "East Atlanta, Airport / College Park",
    lead: "Tanks + retention basins. Wide-area green GSI only where soil infiltrates well.",
  },
};

function StrategyByZoneType() {
  return (
    <div
      style={{
        marginBottom: 24,
        padding: "14px 16px",
        background: "rgba(4,14,30,0.6)",
        border: "1px solid rgba(0,212,216,0.1)",
        borderRadius: 8,
      }}
    >
      <div style={{ fontSize: 10, color: "#3a6080", letterSpacing: "0.12em", fontFamily: MONO, marginBottom: 4 }}>
        CHOOSE BY ZONE TYPE
      </div>
      <div style={{ fontSize: 11.5, color: "#6f96b4", marginBottom: 12 }}>
        The right mix is driven by how much land a zone has and how well its soil infiltrates.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {(Object.keys(ARCHETYPE_META) as Array<keyof typeof ARCHETYPE_META>).map((key) => {
          const meta = ARCHETYPE_META[key];
          const g = ARCHETYPE_GUIDANCE[key];
          return (
            <div
              key={key}
              style={{
                padding: "11px 13px",
                borderRadius: 7,
                background: `${meta.accent}0e`,
                border: `1px solid ${meta.accent}33`,
              }}
            >
              <div style={{ fontSize: 10, fontFamily: MONO, fontWeight: 700, letterSpacing: "0.05em", color: meta.accent }}>
                {meta.label}
              </div>
              <div style={{ fontSize: 10.5, color: "#7aa0bc", margin: "2px 0 7px", fontStyle: "italic" }}>{meta.tagline}</div>
              <div style={{ fontSize: 11.5, color: "#aecbe2", lineHeight: 1.45 }}>{g.lead}</div>
              <div style={{ fontSize: 10, color: "#4a7090", marginTop: 7, fontFamily: MONO }}>{g.zones}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Sorted by suitability desc, grouped: Nature-Based first, Engineered second
const solutionGroups = [
  {
    label: "NATURE-BASED GSI",
    description: "Vegetation, soil, and landscape features that slow, filter, and absorb runoff",
    accent: "#00d4d8",
    solutions: [
      {
        id: "bioswale",
        name: "Bioswale",
        emoji: "🌿",
        description: "Vegetated channel that filters and slows stormwater runoff along streets and parking lots.",
        suitability: 92,
        runoffReduction: 70,
        peakFlowReduction: 52,
        estimatedCost: "$12–55K",
        areaRequired: "500–2,000 sq ft",
        difficulty: "Low",
        difficultyColor: "#00d4d8",
        tags: ["Street-scale", "Linear sites", "High performance"],
      },
      {
        id: "rain-garden",
        name: "Rain Garden",
        emoji: "🌸",
        description: "Shallow planted depression that captures runoff from roofs, driveways, and streets.",
        suitability: 87,
        runoffReduction: 83,
        peakFlowReduction: 65,
        estimatedCost: "$3–20K",
        areaRequired: "100–500 sq ft",
        difficulty: "Low",
        difficultyColor: "#00d4d8",
        tags: ["Residential", "Low cost", "Quick install"],
      },
      {
        id: "tree-trench",
        name: "Tree Trench",
        emoji: "🌳",
        description: "Underground silva cells connected to street trees absorb and store stormwater below the surface.",
        suitability: 85,
        runoffReduction: 42,
        peakFlowReduction: 35,
        estimatedCost: "$65–200K",
        areaRequired: "Sidewalk zone",
        difficulty: "Medium",
        difficultyColor: "#f59e0b",
        tags: ["Urban streets", "Co-benefits", "Long-lived"],
      },
    ],
  },
  {
    label: "ENGINEERED SOLUTIONS",
    description: "Structural and smart-city infrastructure designed for high-volume flow control",
    accent: "#00a8f3",
    solutions: [
      {
        id: "smart-storage-network",
        name: "Smart Storage Network",
        emoji: "🔧",
        description: "IoT sensor detects sewer overload, triggers a smart valve to divert excess peak stormwater into an underground storage tank — storing it until capacity returns.",
        suitability: 94,
        runoffReduction: 76,
        peakFlowReduction: 74,
        estimatedCost: "$290–780K",
        areaRequired: "Subsurface",
        difficulty: "Medium",
        difficultyColor: "#f59e0b",
        tags: ["Smart city", "Real-time control", "High capacity", "Delayed release", "Urban retrofit"],
      },
      {
        id: "permeable-pavement",
        name: "Permeable Pavement",
        emoji: "🧱",
        description: "Porous surface allows water to pass through into subbase storage, reducing surface runoff and peak discharge.",
        suitability: 79,
        runoffReduction: 83,
        peakFlowReduction: 72,
        estimatedCost: "$130–270K",
        areaRequired: "Full lot",
        difficulty: "Medium",
        difficultyColor: "#f59e0b",
        tags: ["Parking lots", "Driveways", "High capacity"],
      },
      {
        id: "retention-basin",
        name: "Retention Basin",
        emoji: "💧",
        description: "Permanent open water feature that captures large volumes of stormwater at peak and releases slowly via a controlled outlet valve over 12–24 hours.",
        suitability: 74,
        runoffReduction: 65,
        peakFlowReduction: 76,
        estimatedCost: "$320K–1.6M",
        areaRequired: "0.5–5 acres",
        difficulty: "High",
        difficultyColor: "#ef4444",
        tags: ["District-scale", "High volume", "Major investment"],
      },
    ],
  },
];

// Flat list for lookup (detail panel, selection state)
const solutions = solutionGroups.flatMap((g) => g.solutions);

interface SolutionsWorkspaceProps {
  onBack: () => void;
  onSelectSolution: (id: string) => void;
  selectedSolution: string | null;
}

function ScoreBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
      <div
        style={{
          height: "100%",
          width: `${value}%`,
          background: color,
          borderRadius: 2,
          boxShadow: `0 0 6px ${color}60`,
          transition: "width 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
    </div>
  );
}

export function SolutionsWorkspace({ onBack, onSelectSolution, selectedSolution }: SolutionsWorkspaceProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const selected = solutions.find((s) => s.id === selectedSolution);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 28px",
          borderBottom: "1px solid rgba(0,212,216,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ fontSize: 10, color: "#3a6080", letterSpacing: "0.12em", marginBottom: 4, fontFamily: "JetBrains Mono, monospace" }}>
            SOLUTION COMPARISON WORKSPACE
          </div>
          <h2 style={{ color: "#e2f0ff", margin: 0 }}>Green Stormwater Infrastructure</h2>
          <div style={{ fontSize: 12, color: "#5b8ab0", marginTop: 4 }}>
            Match the solution mix to each zone's land and soil — not one size fits all
          </div>
        </div>
        <button
          onClick={onBack}
          style={{
            padding: "8px 16px",
            background: "rgba(0,212,216,0.08)",
            border: "1px solid rgba(0,212,216,0.2)",
            borderRadius: 6,
            color: "#00d4d8",
            cursor: "pointer",
            fontSize: 12,
            letterSpacing: "0.04em",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,212,216,0.14)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(0,212,216,0.08)")}
        >
          ← Back to Simulation
        </button>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Solutions — two grouped rows of 3 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px 24px" }}>
          <StrategyByZoneType />
          {solutionGroups.map((group) => (
            <div key={group.label} style={{ marginBottom: 28 }}>
              {/* Group header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 3, height: 32, borderRadius: 2, background: group.accent, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 10, color: group.accent, letterSpacing: "0.12em", fontFamily: "JetBrains Mono, monospace", fontWeight: 700 }}>
                    {group.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#3a5870", marginTop: 2 }}>{group.description}</div>
                </div>
              </div>

              {/* Fixed 3-column row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                {group.solutions.map((sol) => {
                  const isSelected = selectedSolution === sol.id;
                  const isHovered = hoveredCard === sol.id;
                  const highlight = isSelected || isHovered;

                  return (
                    <div
                      key={sol.id}
                      onClick={() => onSelectSolution(sol.id)}
                      onMouseEnter={() => setHoveredCard(sol.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      style={{
                        background: isSelected
                          ? `linear-gradient(135deg, ${group.accent}18, ${group.accent}08)`
                          : "rgba(6,18,42,0.65)",
                        border: isSelected
                          ? `1px solid ${group.accent}55`
                          : highlight
                          ? `1px solid ${group.accent}22`
                          : "1px solid rgba(0,212,216,0.08)",
                        borderRadius: 10,
                        padding: "16px",
                        cursor: "pointer",
                        transition: "all 0.18s ease",
                        backdropFilter: "blur(8px)",
                        boxShadow: isSelected
                          ? `0 0 28px ${group.accent}18, inset 0 0 24px ${group.accent}06`
                          : "none",
                      }}
                    >
                      {/* Card header */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <span style={{ fontSize: 22, lineHeight: 1 }}>{sol.emoji}</span>
                          <div>
                            <div style={{ fontSize: 13, color: "#e2f0ff", fontWeight: 600 }}>{sol.name}</div>
                            <div style={{ fontSize: 9, color: sol.difficultyColor, fontFamily: "JetBrains Mono, monospace", marginTop: 1 }}>
                              {sol.difficulty} Difficulty
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <div style={{ fontSize: 17, fontWeight: 700, color: group.accent, lineHeight: 1.1, fontFamily: "JetBrains Mono, monospace" }}>
                            {sol.suitability}
                          </div>
                          <div style={{ fontSize: 8, color: "#2d5070", letterSpacing: "0.04em" }}>SUIT.</div>
                        </div>
                      </div>

                      <p style={{ fontSize: 11, color: "#4e7a96", lineHeight: 1.55, margin: "0 0 12px" }}>
                        {sol.description}
                      </p>

                      {/* Metrics */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 9, color: "#2d5070", fontFamily: "JetBrains Mono, monospace" }}>RUNOFF REDUCTION</span>
                            <span style={{ fontSize: 9, color: "#00d4d8", fontFamily: "JetBrains Mono, monospace" }}>{sol.runoffReduction}%</span>
                          </div>
                          <ScoreBar value={sol.runoffReduction} color="#00d4d8" />
                        </div>
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ fontSize: 9, color: "#2d5070", fontFamily: "JetBrains Mono, monospace" }}>PEAK FLOW REDUCTION</span>
                            <span style={{ fontSize: 9, color: "#00a8f3", fontFamily: "JetBrains Mono, monospace" }}>{sol.peakFlowReduction}%</span>
                          </div>
                          <ScoreBar value={sol.peakFlowReduction} color="#00a8f3" />
                        </div>
                      </div>

                      {/* Cost + Area */}
                      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 8, color: "#254860", marginBottom: 2, display: "flex", alignItems: "center", gap: 3 }}>
                            <DollarSign size={8} color="#254860" /> COST
                          </div>
                          <div style={{ fontSize: 10, color: "#6a9ab8" }}>{sol.estimatedCost}</div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 8, color: "#254860", marginBottom: 2, display: "flex", alignItems: "center", gap: 3 }}>
                            <Ruler size={8} color="#254860" /> AREA
                          </div>
                          <div style={{ fontSize: 10, color: "#6a9ab8" }}>{sol.areaRequired}</div>
                        </div>
                      </div>

                      {/* Storage capacity / space needed (shared with the treatment train) */}
                      {SOLUTION_CAPACITY[sol.id] && (
                        <div style={{ marginBottom: 10, padding: "8px 10px", background: "rgba(0,200,120,0.05)", border: "1px solid rgba(0,200,120,0.16)", borderRadius: 6 }}>
                          <div style={{ fontSize: 8, color: "#2d5070", marginBottom: 4, fontFamily: MONO, letterSpacing: "0.06em" }}>
                            STORAGE CAPACITY
                          </div>
                          <div style={{ fontSize: 10, color: "#7fb89a", marginBottom: 3 }}>
                            Absorbs {SOLUTION_CAPACITY[sol.id].absorbs}
                          </div>
                          <div style={{ fontSize: 9.5, color: "#4e7a96" }}>
                            Space to hold 10% of a storm (~282k gal):{" "}
                            <b style={{ color: "#9fd9b8" }}>{spaceForGallons(sol.id, 282000)}</b>
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {sol.tags.map((tag) => (
                          <span
                            key={tag}
                            style={{
                              fontSize: 8,
                              color: "#2d5070",
                              background: `${group.accent}0a`,
                              border: `1px solid ${group.accent}18`,
                              borderRadius: 3,
                              padding: "2px 5px",
                              letterSpacing: "0.03em",
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {isSelected && (
                        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 5, color: group.accent, fontSize: 10 }}>
                          <Check size={12} />
                          <span>Selected — simulation updated</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Selected solution detail panel */}
        {selected && (
          <div
            style={{
              width: 280,
              minWidth: 280,
              background: "rgba(4,14,30,0.95)",
              borderLeft: "1px solid rgba(0,212,216,0.1)",
              padding: "24px 20px",
              overflowY: "auto",
            }}
          >
            <div style={{ fontSize: 10, color: "#3a6080", letterSpacing: "0.12em", marginBottom: 16, fontFamily: "JetBrains Mono, monospace" }}>
              SELECTED SOLUTION
            </div>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{selected.emoji}</div>
            <h3 style={{ color: "#e2f0ff", margin: "0 0 4px" }}>{selected.name}</h3>
            <div style={{ fontSize: 11, color: "#5b8ab0", lineHeight: 1.6, marginBottom: 20 }}>{selected.description}</div>

            <div
              style={{
                padding: "14px",
                background: "rgba(0,212,216,0.06)",
                border: "1px solid rgba(0,212,216,0.15)",
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 10, color: "#3a6080", marginBottom: 12, fontFamily: "JetBrains Mono, monospace" }}>PERFORMANCE FORECAST</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "Suitability Score", value: `${selected.suitability}/100`, color: "#00d4d8" },
                  { label: "Runoff Reduction", value: `${selected.runoffReduction}%`, color: "#00a8f3" },
                  { label: "Peak Flow Reduction", value: `${selected.peakFlowReduction}%`, color: "#3b82f6" },
                  { label: "Est. Cost", value: selected.estimatedCost, color: "#f59e0b" },
                  { label: "Area Required", value: selected.areaRequired, color: "#a78bfa" },
                  { label: "Difficulty", value: selected.difficulty, color: selected.difficultyColor },
                ].map((m) => (
                  <div key={m.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#4a7090" }}>{m.label}</span>
                    <span style={{ fontSize: 12, color: m.color, fontWeight: 600, fontFamily: "JetBrains Mono, monospace" }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                padding: "12px 14px",
                background: "linear-gradient(135deg, rgba(0,212,216,0.1), rgba(0,168,243,0.06))",
                border: "1px solid rgba(0,212,216,0.2)",
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <TrendingDown size={12} color="#00d4d8" />
                <span style={{ fontSize: 10, color: "#00d4d8", fontWeight: 600 }}>FLOOD RISK IMPACT</span>
              </div>
              <p style={{ fontSize: 11, color: "#5b8ab0", lineHeight: 1.55, margin: 0 }}>
                {selected.id === "smart-storage-network"
                  ? <>A distributed network of ~6 smart tanks (~510k gal) captures the peak overshoot — <span style={{ color: "#00d4d8" }}>~14% of storm runoff</span> — at the source and diverts it <span style={{ color: "#00d4d8" }}>out of the combined sewer to reuse / recharge</span>. Pipe utilization drops from <span style={{ color: "#ef4444" }}>105%</span> to an honest <span style={{ color: "#00d4d8" }}>~90%</span> — overflow eliminated. <span style={{ color: "#00d4d8" }}>~6,500 gal/min</span> diverted, slow-released after the storm. Based on EPA RTC pilot data (EmNet, Milwaukee, KC).</>
                  : selected.id === "retention-basin"
                  ? <>Up to <span style={{ color: "#00d4d8" }}>6,400 gal/min</span> diverted from the combined sewer into an open detention pond, cutting peak sewer load by <span style={{ color: "#00d4d8" }}>76%</span>. Basin drains over 12–24 hrs via a controlled outlet. Based on EPA wet detention basin design guidance and Georgia Stormwater Manual.</>
                  : <>Implementing {selected.name} in South Downtown would reduce peak stormwater discharge to the combined sewer by{" "}<span style={{ color: "#00d4d8" }}>{selected.peakFlowReduction}%</span>, keeping the system below capacity during most storm events.</>
                }
              </p>
            </div>

            <button
              style={{
                width: "100%",
                padding: "12px",
                background: "linear-gradient(135deg, #00d4d8, #00a8f3)",
                border: "none",
                borderRadius: 8,
                color: "#040d1a",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                letterSpacing: "0.04em",
                boxShadow: "0 4px 24px rgba(0,212,216,0.3)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 6px 32px rgba(0,212,216,0.5)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,212,216,0.3)")}
            >
              Generate Implementation Plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
