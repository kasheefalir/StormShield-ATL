import { useState } from "react";
import { Check, DollarSign, Ruler, TrendingDown } from "lucide-react";
import { ARCHETYPE_META } from "../data/zoneStrategy";

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
        description: "Vegetated channel that filters and slows stormwater along streets and parking lots. Ponding in 12\" of engineered soil captures runoff before it reaches the sewer inlet.",
        suitability: 92,
        peakFlowReduction: 52,
        estimatedCost: "$12–55K",
        areaRequired: "500–2,000 sq ft",
        storageVolume: "~280,000 gal",
        storageNote: "1.1 mi × 6 ft swale · 8 gal/ft²",
        drawdownTime: "4–12 hrs",
        coBenefit: "Pollutant filtration, streetside habitat corridor",
        difficulty: "Low",
        difficultyColor: "#00d4d8",
        tags: ["Street-scale", "Linear sites", "High performance"],
      },
      {
        id: "rain-garden",
        name: "Rain Garden",
        emoji: "🌸",
        description: "Shallow planted depression captures rooftop and driveway runoff at the source. Amended soil with 9\" ponding depth infiltrates during and after the storm.",
        suitability: 87,
        peakFlowReduction: 65,
        estimatedCost: "$3–20K",
        areaRequired: "100–500 sq ft",
        storageVolume: "~122,000 gal",
        storageNote: "~0.5 acre of cells · 5.6 gal/ft²",
        drawdownTime: "12–36 hrs",
        coBenefit: "Native plant habitat, urban cooling, reduced heat island",
        difficulty: "Low",
        difficultyColor: "#00d4d8",
        tags: ["Residential", "Low cost", "Quick install"],
      },
      {
        id: "tree-trench",
        name: "Tree Trench",
        emoji: "🌳",
        description: "Continuous Silva Cell root vaults beneath the sidewalk store stormwater and slow-release it to tree roots — no surface footprint, no land consumed.",
        suitability: 85,
        peakFlowReduction: 35,
        estimatedCost: "$65–200K",
        areaRequired: "Sidewalk ROW",
        storageVolume: "~85,500 gal",
        storageNote: "~0.6 mi trench · 27 gal/linear ft",
        drawdownTime: "24–48 hrs",
        coBenefit: "Doubles canopy cover (~528 trees), -4°F urban cooling",
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
        description: "IoT pressure sensors trigger a smart valve to divert excess peak flow (10,125 gpm) into distributed underground tanks — capturing it at the source before it backs up into the sewer.",
        suitability: 94,
        peakFlowReduction: 74,
        estimatedCost: "$290–780K",
        areaRequired: "Subsurface",
        storageVolume: "607,500 gal/hr",
        storageNote: "6 tanks ~100k gal each · 10,125 gpm intercepted",
        drawdownTime: "12–24 hrs (controlled release)",
        coBenefit: "Real-time IoT control, reuse-ready for irrigation or non-potable",
        difficulty: "Medium",
        difficultyColor: "#f59e0b",
        tags: ["Smart city", "Real-time control", "High capacity", "Delayed release", "Urban retrofit"],
      },
      {
        id: "permeable-pavement",
        name: "Permeable Pavement",
        emoji: "🧱",
        description: "Porous asphalt or concrete over a 12\" open-graded stone reservoir (40% void) holds water below the surface and meters it through an under-drain after the storm.",
        suitability: 79,
        peakFlowReduction: 72,
        estimatedCost: "$130–270K",
        areaRequired: "Full lot / plaza",
        storageVolume: "~914,000 gal",
        storageNote: "~7 acres · 3.0 gal/ft² (12\" stone, 40% void)",
        drawdownTime: "6–24 hrs",
        coBenefit: "Reduces surface ponding, safer driving in rain, heat island benefit",
        difficulty: "Medium",
        difficultyColor: "#f59e0b",
        tags: ["Parking lots", "Driveways", "High capacity"],
      },
      {
        id: "retention-basin",
        name: "Retention Basin",
        emoji: "💧",
        description: "Deep surface or subsurface detention holds large volumes at peak and slow-releases via a gated riser over 24–72 hours — permanently removing water from the combined sewer.",
        suitability: 74,
        peakFlowReduction: 76,
        estimatedCost: "$320K–1.6M",
        areaRequired: "0.5–5 acres",
        storageVolume: "~608,000 gal",
        storageNote: "~0.2 acre subsurface vault · 30 gal/ft²",
        drawdownTime: "24–72 hrs",
        coBenefit: "Habitat creation, groundwater recharge, baseflow augmentation",
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

                      {/* Storage volume — primary metric */}
                      {"storageVolume" in sol && (
                        <div style={{ marginBottom: 12, padding: "9px 11px", background: `${group.accent}0c`, border: `1px solid ${group.accent}28`, borderRadius: 7 }}>
                          <div style={{ fontSize: 8, color: "#2d5070", letterSpacing: "0.1em", fontFamily: MONO, marginBottom: 4 }}>STORAGE CAPACITY</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: group.accent, fontFamily: MONO, lineHeight: 1.1 }}>
                            {(sol as any).storageVolume}
                          </div>
                          <div style={{ fontSize: 9.5, color: "#4a7090", marginTop: 3 }}>{(sol as any).storageNote}</div>
                        </div>
                      )}

                      {/* Drawdown + Co-benefit */}
                      {"drawdownTime" in sol && (
                        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                          <div style={{ flex: 1, padding: "7px 9px", background: "rgba(0,212,216,0.04)", border: "1px solid rgba(0,212,216,0.1)", borderRadius: 6 }}>
                            <div style={{ fontSize: 8, color: "#254860", letterSpacing: "0.08em", fontFamily: MONO, marginBottom: 3 }}>DRAWDOWN</div>
                            <div style={{ fontSize: 10.5, color: "#6fb8d4", fontWeight: 500 }}>{(sol as any).drawdownTime}</div>
                          </div>
                          <div style={{ flex: 2, padding: "7px 9px", background: "rgba(0,168,243,0.04)", border: "1px solid rgba(0,168,243,0.1)", borderRadius: 6 }}>
                            <div style={{ fontSize: 8, color: "#254860", letterSpacing: "0.08em", fontFamily: MONO, marginBottom: 3 }}>CO-BENEFIT</div>
                            <div style={{ fontSize: 10, color: "#5a9abc", lineHeight: 1.4 }}>{(sol as any).coBenefit}</div>
                          </div>
                        </div>
                      )}

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

          {/* ── Methodology footnote ─────────────────────────────────── */}
          <div
            style={{
              marginTop: 4,
              padding: "9px 14px",
              background: "rgba(0,168,243,0.04)",
              border: "1px solid rgba(0,168,243,0.1)",
              borderRadius: 6,
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 11, color: "#1e4a6a", flexShrink: 0, marginTop: 1 }}>ⓘ</span>
            <p style={{ margin: 0, fontSize: 10.5, color: "#2d5c7a", lineHeight: 1.55, fontFamily: MONO }}>
              <span style={{ color: "#3a7090", fontWeight: 600 }}>Rational Method model (50-acre catchment, C=0.90):</span>{" "}
              Storm: 3.0 in/hr → 60,750 gpm total runoff · Drain capacity: 2.5 in/hr → 50,625 gpm · Excess diverted by GSI: <b style={{ color: "#3a7090" }}>10,125 gpm (~608k gal/hr)</b>.
            </p>
          </div>
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
                  ...("storageVolume" in selected ? [{ label: "Storage Capacity", value: (selected as any).storageVolume, color: "#00d4d8" }] : []),
                  ...("drawdownTime" in selected ? [{ label: "Drawdown Time", value: (selected as any).drawdownTime, color: "#3b82f6" }] : []),
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
