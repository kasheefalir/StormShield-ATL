import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Droplets,
  TreePine,
  Layers,
  Waves,
  Container,
  Sprout,
  MapPin,
  Building2,
  Users,
  ChevronRight,
} from "lucide-react";
import { StrategyBadge, StrategyCallout } from "./StrategyPanel";
import { TreatmentTrain } from "./TreatmentTrain";

// ─── Types ────────────────────────────────────────────────────────────────────

type Feasibility = "recommended" | "feasible" | "limited" | "not-suitable";

interface SolutionFeasibility {
  id: string;
  name: string;
  icon: React.ReactNode;
  feasibility: Feasibility;
  reason: string;
}

interface ZoneProfile {
  id: string;
  name: string;
  type: string;
  riskScore: number;
  complaints: number;
  imperviousPct: number;
  availableLand: number; // 0–100 score
  soilInfiltration: number; // 0–100 score
  storagePotential: number; // 0–100 score
  vulnerablePopulation: number; // 0–100 score
  coordinates: string;
  areaDescription: string;
  complaintTypes: string[];
  constraintSummary: string;
  nearbyAssets: string[];
  solutions: SolutionFeasibility[];
}

// ─── Solution icon helper ─────────────────────────────────────────────────────

const SOL_ICONS: Record<string, React.ReactNode> = {
  bioswale: <Sprout size={13} />,
  "rain-garden": <Droplets size={13} />,
  "permeable-pavement": <Layers size={13} />,
  "tree-trench": <TreePine size={13} />,
  "smart-storage-network": <Container size={13} />,
  "retention-basin": <Waves size={13} />,
};

// ─── Zone data ────────────────────────────────────────────────────────────────

const ZONES: ZoneProfile[] = [
  {
    id: "westside-proctor",
    name: "Westside / Proctor Creek",
    type: "Historic Residential",
    riskScore: 91,
    complaints: 126,
    imperviousPct: 68,
    availableLand: 54,
    soilInfiltration: 48,
    storagePotential: 58,
    vulnerablePopulation: 78,
    coordinates: "33.77°N, 84.43°W",
    areaDescription:
      "Historic neighborhood with dense residential blocks, aging combined sewers, and a direct drainage pathway to Proctor Creek. High impervious cover from streets and small lots generates rapid runoff that backs up into the combined sewer during moderate storms. Limited lot size rules out large-footprint solutions.",
    complaintTypes: ["Street flooding", "Blocked drain", "Yard flooding", "Creek overflow"],
    constraintSummary:
      "Small residential lots and historic street layouts limit footprint. Soil infiltration is moderate — enough for plant-based systems but not high-volume infiltration trenches. No large open parcels available for retention structures.",
    nearbyAssets: ["Proctor Creek", "Maddox Park", "Linear greenway"],
    solutions: [
      {
        id: "bioswale",
        name: "Vegetated Bioswale",
        icon: SOL_ICONS["bioswale"],
        feasibility: "recommended",
        reason:
          "Residential curb lines are ideal for bioswale installation. Intercepts runoff before it reaches the combined sewer inlet. Proctor Creek corridor provides natural discharge point.",
      },
      {
        id: "rain-garden",
        name: "Rain Garden",
        icon: SOL_ICONS["rain-garden"],
        feasibility: "recommended",
        reason:
          "Front-yard and parkway rain gardens fit the residential lot pattern. Maddox Park offers space for a larger community rain garden serving multiple blocks.",
      },
      {
        id: "tree-trench",
        name: "Silva Cell Tree Trench",
        icon: SOL_ICONS["tree-trench"],
        feasibility: "feasible",
        reason:
          "Street tree trenches fit within existing ROW. Doubles canopy cover — currently only 28% — while capturing ~3,000 gal per six-tree cell.",
      },
      {
        id: "smart-storage-network",
        name: "Smart Storage Network",
        icon: SOL_ICONS["smart-storage-network"],
        feasibility: "feasible",
        reason:
          "Underground cisterns under driveways or parkways are viable. Moderate storage potential (score 58) means cells should be distributed, not concentrated.",
      },
      {
        id: "permeable-pavement",
        name: "Permeable Pavement",
        icon: SOL_ICONS["permeable-pavement"],
        feasibility: "limited",
        reason:
          "Residential streets are often too narrow and have heavy utility conflicts. Best limited to driveways and alley resurfacing where soil allows.",
      },
      {
        id: "retention-basin",
        name: "Retention Basin",
        icon: SOL_ICONS["retention-basin"],
        feasibility: "not-suitable",
        reason:
          "No open parcels large enough for a basin in this historic neighborhood. Available land score is 54 — insufficient for a structure requiring 1–3 acres. Maddox Park is too small and serves active recreation.",
      },
    ],
  },
  {
    id: "south-downtown",
    name: "South Downtown",
    type: "Dense Commercial",
    riskScore: 86,
    complaints: 102,
    imperviousPct: 81,
    availableLand: 22,
    soilInfiltration: 32,
    storagePotential: 48,
    vulnerablePopulation: 72,
    coordinates: "33.75°N, 84.39°W",
    areaDescription:
      "Tightly packed commercial blocks, viaducts, and parking decks with 81% impervious cover. Nearly every raindrop hits a hard surface and routes immediately to an aging combined sewer. Underground utilities are dense, and available land is extremely scarce (score 22). The sewer network here was built 1890–1930 and regularly surpasses 105% capacity during heavy rain.",
    complaintTypes: [
      "Street flooding",
      "Ponding near drains",
      "Parking lot runoff",
      "Curb inlet backup",
    ],
    constraintSummary:
      "Extremely limited land (score 22) rules out any ground-level green infrastructure requiring open space. Soil infiltration is very low (32) — the ground simply cannot absorb runoff at meaningful rates. Solutions must work within parking lots, under plazas, or along narrow street ROW.",
    nearbyAssets: ["Rail viaducts", "Street storm drains", "Civic plazas"],
    solutions: [
      {
        id: "permeable-pavement",
        name: "Permeable Pavement",
        icon: SOL_ICONS["permeable-pavement"],
        feasibility: "recommended",
        reason:
          "Parking lots and civic plazas can be resurfaced with permeable pavers or concrete. Stores up to 28,000 gal per 8,400 sq ft — directly intercepts the largest runoff source in the zone.",
      },
      {
        id: "smart-storage-network",
        name: "Smart Storage Network",
        icon: SOL_ICONS["smart-storage-network"],
        feasibility: "recommended",
        reason:
          "Underground cisterns beneath parking decks and plazas avoid any land footprint. Connected smart valves can hold water until the sewer drops below capacity — ideal for this constrained urban context.",
      },
      {
        id: "tree-trench",
        name: "Silva Cell Tree Trench",
        icon: SOL_ICONS["tree-trench"],
        feasibility: "feasible",
        reason:
          "Silva cells fit under sidewalks along street ROW without taking buildable land. Also addresses the zone's critically low 12% tree canopy.",
      },
      {
        id: "bioswale",
        name: "Vegetated Bioswale",
        icon: SOL_ICONS["bioswale"],
        feasibility: "limited",
        reason:
          "Very few curb-edge opportunities in this dense block pattern. Any bioswale must compete with loading zones and taxi lanes. Limited to 1–2 blocks where ROW is wide enough.",
      },
      {
        id: "rain-garden",
        name: "Rain Garden",
        icon: SOL_ICONS["rain-garden"],
        feasibility: "not-suitable",
        reason:
          "Soil infiltration is too low (score 32) to support effective rain garden function. No parkways or open ground available at meaningful scale. Would require engineered soil import at prohibitive cost per gallon captured.",
      },
      {
        id: "retention-basin",
        name: "Retention Basin",
        icon: SOL_ICONS["retention-basin"],
        feasibility: "not-suitable",
        reason:
          "Available land score is 22 — the lowest of any zone. A retention basin requires a minimum 1–3 acres. There is simply no open parcel in South Downtown that could accommodate one without demolishing existing buildings.",
      },
    ],
  },
  {
    id: "old-fourth-ward",
    name: "Old Fourth Ward",
    type: "Mixed-Use / Park-Adjacent",
    riskScore: 73,
    complaints: 72,
    imperviousPct: 61,
    availableLand: 48,
    soilInfiltration: 55,
    storagePotential: 82,
    vulnerablePopulation: 46,
    coordinates: "33.77°N, 84.37°W",
    areaDescription:
      "Rapidly redeveloping mixed-use neighborhood adjacent to the BeltLine. Historic Fourth Ward Park already contains a 4.5-acre detention pond designed to hold floodwater from the 10-year storm. The combination of park access, moderate soil quality, and BeltLine green corridors makes this the best-positioned zone for large-scale green infrastructure.",
    complaintTypes: ["Street ponding", "Trail-edge runoff", "Drainage backup"],
    constraintSummary:
      "Moderate land availability (score 48) but offset by the existing detention pond infrastructure. Soil infiltration is the best of any at-risk zone (score 55). The main constraint is coordination with BeltLine development and managing the interface between new construction and storm drainage.",
    nearbyAssets: ["Historic Fourth Ward Park detention pond", "Atlanta BeltLine", "Ponce City Market"],
    solutions: [
      {
        id: "retention-basin",
        name: "Retention Basin",
        icon: SOL_ICONS["retention-basin"],
        feasibility: "recommended",
        reason:
          "Historic Fourth Ward Park's existing 4.5-acre detention pond can be expanded or optimized. Storage potential score is 82 — highest among park-adjacent zones. This is the one zone where a basin is already partially built.",
      },
      {
        id: "bioswale",
        name: "Vegetated Bioswale",
        icon: SOL_ICONS["bioswale"],
        feasibility: "recommended",
        reason:
          "BeltLine trail edges and new mixed-use development setbacks provide linear bioswale corridors that can route runoff directly into the park detention system.",
      },
      {
        id: "rain-garden",
        name: "Rain Garden",
        icon: SOL_ICONS["rain-garden"],
        feasibility: "feasible",
        reason:
          "Moderate soil infiltration (55) and park-adjacent open space support rain gardens along trail edges. Serves as a pre-filter before runoff reaches the detention pond.",
      },
      {
        id: "smart-storage-network",
        name: "Smart Storage Network",
        icon: SOL_ICONS["smart-storage-network"],
        feasibility: "feasible",
        reason:
          "New construction in the redevelopment zone can include underground cisterns tied to smart valves. Works best as a complement to the detention basin — holding rooftop runoff before releasing to the park system.",
      },
      {
        id: "tree-trench",
        name: "Silva Cell Tree Trench",
        icon: SOL_ICONS["tree-trench"],
        feasibility: "feasible",
        reason:
          "BeltLine streetscape is actively being designed with expanded tree canopy. Silva cells integrate directly into the ongoing streetscape build-out.",
      },
      {
        id: "permeable-pavement",
        name: "Permeable Pavement",
        icon: SOL_ICONS["permeable-pavement"],
        feasibility: "limited",
        reason:
          "Lower impervious cover (61%) and moderate lot density mean permeable pavement has less impact than in fully paved zones. Best applied to new surface parking lots in the redevelopment corridor.",
      },
    ],
  },
  {
    id: "vine-city",
    name: "Vine City / English Avenue",
    type: "Vulnerable Residential",
    riskScore: 88,
    complaints: 118,
    imperviousPct: 65,
    availableLand: 58,
    soilInfiltration: 52,
    storagePotential: 72,
    vulnerablePopulation: 86,
    coordinates: "33.76°N, 84.42°W",
    areaDescription:
      "Lower-income residential neighborhood with the highest vulnerable population score of any zone (86). Frequent home and street flooding disproportionately affects residents with limited ability to self-evacuate or absorb flood damage. Proctor Creek tributaries run nearby. The neighborhood has vacant lots from historic disinvestment — those parcels are the primary infrastructure opportunity.",
    complaintTypes: ["Home flooding", "Street flooding", "Blocked drain", "Yard flooding"],
    constraintSummary:
      "Moderate soil infiltration (52) and available land (58) including some vacant lots. The key constraint is maintenance capacity (score 62) — solutions must be low-maintenance. Community co-stewardship models (e.g., Cook Park) are essential for long-term performance. Retention basins would require assembling multiple vacant lots, which is feasible but politically complex.",
    nearbyAssets: ["Cook Park", "Proctor Creek tributaries", "Vacant lots (acquisition opportunities)"],
    solutions: [
      {
        id: "rain-garden",
        name: "Rain Garden",
        icon: SOL_ICONS["rain-garden"],
        feasibility: "recommended",
        reason:
          "Front-yard and parkway rain gardens at the block scale are the most feasible and community-visible intervention. Moderate soil infiltration (52) supports effective function. Cook Park can anchor a larger rain garden node.",
      },
      {
        id: "bioswale",
        name: "Vegetated Bioswale",
        icon: SOL_ICONS["bioswale"],
        feasibility: "recommended",
        reason:
          "Residential street curb lines are available for bioswale retrofits. Routes runoff toward Proctor Creek tributaries through planted channels rather than overwhelmed storm inlets.",
      },
      {
        id: "tree-trench",
        name: "Silva Cell Tree Trench",
        icon: SOL_ICONS["tree-trench"],
        feasibility: "feasible",
        reason:
          "Street trees are critically low (22% canopy). Silva cells under sidewalks capture runoff while providing shade — a direct quality-of-life co-benefit for a high-vulnerability population.",
      },
      {
        id: "smart-storage-network",
        name: "Smart Storage Network",
        icon: SOL_ICONS["smart-storage-network"],
        feasibility: "feasible",
        reason:
          "Cisterns under vacant lots or driveways can serve as distributed neighborhood storage. Requires partnership with Cook Park and a city maintenance commitment — not self-maintaining.",
      },
      {
        id: "permeable-pavement",
        name: "Permeable Pavement",
        icon: SOL_ICONS["permeable-pavement"],
        feasibility: "limited",
        reason:
          "Residential streets have lower impervious cover (65%) than commercial zones, limiting the marginal gain. Best targeted at alley resurfacing where maintenance is simpler and clay subsoil is less of a constraint.",
      },
      {
        id: "retention-basin",
        name: "Retention Basin",
        icon: SOL_ICONS["retention-basin"],
        feasibility: "not-suitable",
        reason:
          "While vacant lots exist, assembling a contiguous 1–3 acre parcel for a retention basin is not feasible without significant land acquisition. The neighborhood's residential fabric and lot pattern mean any basin-scale intervention would displace community space. Cook Park is the closest viable site but is already an active park.",
      },
    ],
  },
  {
    id: "airport-south",
    name: "Airport / South River Headwaters",
    type: "Industrial / Large Paved",
    riskScore: 78,
    complaints: 67,
    imperviousPct: 74,
    availableLand: 72,
    soilInfiltration: 42,
    storagePotential: 88,
    vulnerablePopulation: 50,
    coordinates: "33.64°N, 84.43°W",
    areaDescription:
      "Large-scale industrial and logistics parcels near Hartsfield-Jackson with some of the highest runoff volume of any zone. Enormous paved catchments — service roads, tarmac-adjacent lots, staging areas — drain rapidly to South River headwaters, causing downstream flooding. Available land (score 72) and storage potential (88) are the highest of any zone, making large-footprint solutions viable here where they are not elsewhere.",
    complaintTypes: [
      "Industrial runoff",
      "Road flooding",
      "Storm drain backup",
      "Headwater overflow",
    ],
    constraintSummary:
      "Low soil infiltration (42) from compacted industrial soils limits green infiltration approaches. However, the abundance of large flat parcels, existing impervious surfaces, and adjacency to South River wetland buffers make storage-and-release strategies ideal. Maintenance capacity is moderate (64) — industrial operators can be contracted to manage on-site systems.",
    nearbyAssets: ["South River tributaries", "Industrial parcels", "Wetland buffers"],
    solutions: [
      {
        id: "retention-basin",
        name: "Retention Basin",
        icon: SOL_ICONS["retention-basin"],
        feasibility: "recommended",
        reason:
          "The only zone with sufficient land (score 72) and storage potential (88) to support a full-scale retention basin. Large flat industrial parcels adjacent to South River wetlands are textbook retention basin sites. Can be designed as a wet basin that also recharges South River baseflow during drought.",
      },
      {
        id: "smart-storage-network",
        name: "Smart Storage Network",
        icon: SOL_ICONS["smart-storage-network"],
        feasibility: "recommended",
        reason:
          "Underground cisterns under logistics lots and staging areas can hold millions of gallons before the retention basin fills. Smart valves can coordinate release with weather forecasts — releasing stored water before storms to create capacity.",
      },
      {
        id: "permeable-pavement",
        name: "Permeable Pavement",
        icon: SOL_ICONS["permeable-pavement"],
        feasibility: "feasible",
        reason:
          "Large parking areas and service roads can be repaved with permeable asphalt or pavers. Even modest infiltration rates slow runoff significantly at this scale. FAA coordination required near runway proximity zones.",
      },
      {
        id: "bioswale",
        name: "Vegetated Bioswale",
        icon: SOL_ICONS["bioswale"],
        feasibility: "limited",
        reason:
          "Industrial character and vehicle traffic make vegetation maintenance difficult. Viable only along perimeter roads and property buffers away from active logistics operations.",
      },
      {
        id: "rain-garden",
        name: "Rain Garden",
        icon: SOL_ICONS["rain-garden"],
        feasibility: "not-suitable",
        reason:
          "Very low soil infiltration (42) from decades of compaction and potential contamination means rain gardens cannot function effectively. Volume of runoff also far exceeds what rain gardens can manage at this scale.",
      },
      {
        id: "tree-trench",
        name: "Silva Cell Tree Trench",
        icon: SOL_ICONS["tree-trench"],
        feasibility: "not-suitable",
        reason:
          "Industrial areas lack the pedestrian street network that tree trenches require. Heavy vehicle loads exceed structural load ratings for silva cell systems. Street tree canopy is not a priority in an industrial/logistics zone.",
      },
    ],
  },
];

// ─── Feasibility config ───────────────────────────────────────────────────────

const FEASIBILITY_CONFIG: Record<
  Feasibility,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  recommended: {
    label: "Recommended",
    color: "#00d4d8",
    bg: "rgba(0,212,216,0.08)",
    border: "rgba(0,212,216,0.22)",
    icon: <CheckCircle size={13} />,
  },
  feasible: {
    label: "Feasible",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.07)",
    border: "rgba(34,197,94,0.2)",
    icon: <CheckCircle size={13} />,
  },
  limited: {
    label: "Limited",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.07)",
    border: "rgba(245,158,11,0.2)",
    icon: <AlertCircle size={13} />,
  },
  "not-suitable": {
    label: "Not Suitable",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.07)",
    border: "rgba(239,68,68,0.18)",
    icon: <XCircle size={13} />,
  },
};

// ─── Risk color ───────────────────────────────────────────────────────────────

function riskColor(score: number) {
  if (score >= 85) return "#ef4444";
  if (score >= 75) return "#f97316";
  if (score >= 65) return "#f59e0b";
  return "#22c55e";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "7px 12px",
        background: "rgba(4,14,30,0.6)",
        border: "1px solid rgba(0,212,216,0.1)",
        borderRadius: 6,
        minWidth: 80,
      }}
    >
      <span
        style={{
          fontSize: 9,
          color: "#3a6080",
          fontFamily: "JetBrains Mono, monospace",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color,
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 70 ? "#22c55e" : value >= 45 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 11, color: "#4a7090" }}>{label}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color,
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {value}
        </span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 999,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${value}%`,
            background: color,
            borderRadius: 999,
            boxShadow: `0 0 6px ${color}80`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface FloodZonesPageProps {
  onExploreSolution?: (solutionId: string, zoneId: string) => void;
}

export function FloodZonesPage({ onExploreSolution }: FloodZonesPageProps) {
  const [selectedZoneId, setSelectedZoneId] = useState(ZONES[0].id);
  const zone = ZONES.find((z) => z.id === selectedZoneId) ?? ZONES[0];

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        overflow: "hidden",
        background: "#040d1a",
      }}
    >
      {/* ── Zone selector sidebar ──────────────────────────────────── */}
      <div
        style={{
          width: 230,
          flexShrink: 0,
          borderRight: "1px solid rgba(0,212,216,0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 16px 10px",
            borderBottom: "1px solid rgba(0,212,216,0.07)",
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "#3a6080",
              fontFamily: "JetBrains Mono, monospace",
              letterSpacing: "0.1em",
              marginBottom: 2,
            }}
          >
            DOCUMENTED ZONES
          </div>
          <div style={{ fontSize: 12, color: "#5b8ab0", fontWeight: 500 }}>
            {ZONES.length} high-risk areas · floodRiskScore ≥ 70
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
          {ZONES.map((z) => {
            const active = z.id === selectedZoneId;
            const rc = riskColor(z.riskScore);
            return (
              <button
                key={z.id}
                onClick={() => setSelectedZoneId(z.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  padding: "10px 12px",
                  marginBottom: 4,
                  background: active
                    ? "linear-gradient(90deg, rgba(0,212,216,0.1), rgba(0,212,216,0.04))"
                    : "transparent",
                  border: active
                    ? "1px solid rgba(0,212,216,0.2)"
                    : "1px solid transparent",
                  borderRadius: 7,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s",
                  borderLeft: active ? `3px solid #00d4d8` : "3px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLButtonElement).style.background =
                      "rgba(0,212,216,0.04)";
                }}
                onMouseLeave={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: active ? "#e2f0ff" : "#8ab0cc",
                      lineHeight: 1.3,
                    }}
                  >
                    {z.name}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: rc,
                      fontFamily: "JetBrains Mono, monospace",
                    }}
                  >
                    {z.riskScore}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span
                    style={{ fontSize: 10, color: "#3a6080", fontStyle: "italic" }}
                  >
                    {z.type}
                  </span>
                  <span style={{ fontSize: 10, color: "#4a7090" }}>
                    {z.complaints} complaints
                  </span>
                </div>
                <div
                  style={{
                    height: 2,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.05)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${z.riskScore}%`,
                      background: rc,
                      opacity: 0.7,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Zone profile ───────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
        {/* Profile header */}
        <div
          style={{
            padding: "18px 24px 16px",
            borderBottom: "1px solid rgba(0,212,216,0.08)",
            background: "rgba(4,10,22,0.6)",
            backdropFilter: "blur(8px)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <MapPin size={11} color="#3a6080" />
            <span style={{ fontSize: 10, color: "#3a6080" }}>Atlanta</span>
            <ChevronRight size={10} color="#2d5c7a" />
            <span style={{ fontSize: 10, color: "#3a6080" }}>Flood Zones</span>
            <ChevronRight size={10} color="#2d5c7a" />
            <span style={{ fontSize: 10, color: "#a8c8e8" }}>{zone.name}</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <h1
                style={{
                  margin: "0 0 6px",
                  color: "#e2f0ff",
                  fontSize: 22,
                  letterSpacing: "-0.02em",
                }}
              >
                {zone.name}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Building2 size={11} color="#3a6080" />
                <span style={{ fontSize: 11, color: "#4a7090" }}>{zone.type}</span>
                <span style={{ color: "#2d5c7a", fontSize: 11 }}>·</span>
                <span
                  style={{
                    fontSize: 10,
                    color: "#2d5c7a",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {zone.coordinates}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  background: `${riskColor(zone.riskScore)}18`,
                  border: `1px solid ${riskColor(zone.riskScore)}40`,
                  borderRadius: 5,
                  fontSize: 11,
                  color: riskColor(zone.riskScore),
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={11} />
                Risk Score {zone.riskScore}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  background: "rgba(0,168,243,0.08)",
                  border: "1px solid rgba(0,168,243,0.2)",
                  borderRadius: 5,
                  fontSize: 11,
                  color: "#00a8f3",
                  fontWeight: 600,
                }}
              >
                <Droplets size={11} />
                {zone.complaints} Complaints
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  borderRadius: 5,
                  fontSize: 11,
                  color: "#f59e0b",
                  fontWeight: 600,
                }}
              >
                <Layers size={11} />
                {zone.imperviousPct}% Impervious
              </span>
              <StrategyBadge zoneId={zone.id} />
              {zone.vulnerablePopulation >= 75 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 10px",
                    background: "rgba(239,68,68,0.08)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 5,
                    fontSize: 11,
                    color: "#ef4444",
                    fontWeight: 600,
                  }}
                >
                  <Users size={11} />
                  High Vulnerability
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Profile body */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Stats row */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <StatPill label="Risk Score" value={String(zone.riskScore)} color={riskColor(zone.riskScore)} />
            <StatPill label="Complaints" value={String(zone.complaints)} color="#00a8f3" />
            <StatPill label="Impervious" value={`${zone.imperviousPct}%`} color="#f59e0b" />
            <StatPill label="Available Land" value={`${zone.availableLand}/100`} color={zone.availableLand >= 60 ? "#22c55e" : zone.availableLand >= 40 ? "#f59e0b" : "#ef4444"} />
            <StatPill label="Soil Infiltration" value={`${zone.soilInfiltration}/100`} color={zone.soilInfiltration >= 55 ? "#22c55e" : zone.soilInfiltration >= 38 ? "#f59e0b" : "#ef4444"} />
            <StatPill label="Storage Potential" value={`${zone.storagePotential}/100`} color={zone.storagePotential >= 70 ? "#22c55e" : "#f59e0b"} />
          </div>

          {/* Land/soil-driven strategy */}
          <StrategyCallout zoneId={zone.id} />

          {/* Tank-led, multi-stage treatment train */}
          <TreatmentTrain zoneId={zone.id} />

          {/* Area description */}
          <div
            style={{
              padding: "16px 18px",
              background: "rgba(4,14,30,0.7)",
              border: "1px solid rgba(0,212,216,0.09)",
              borderRadius: 8,
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: "#3a6080",
                fontFamily: "JetBrains Mono, monospace",
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              AREA PROFILE
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#8ab0cc", lineHeight: 1.65 }}>
              {zone.areaDescription}
            </p>
          </div>

          {/* Two-col: complaint types + scores */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            {/* Complaint types */}
            <div
              style={{
                padding: "14px 16px",
                background: "rgba(4,14,30,0.7)",
                border: "1px solid rgba(0,212,216,0.09)",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "#3a6080",
                  fontFamily: "JetBrains Mono, monospace",
                  letterSpacing: "0.1em",
                  marginBottom: 10,
                }}
              >
                311 COMPLAINT TYPES
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {zone.complaintTypes.map((ct) => (
                  <div
                    key={ct}
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "#ef4444",
                        boxShadow: "0 0 5px rgba(239,68,68,0.5)",
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 12, color: "#8ab0cc" }}>{ct}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    fontSize: 9,
                    color: "#3a6080",
                    fontFamily: "JetBrains Mono, monospace",
                    letterSpacing: "0.1em",
                    marginBottom: 8,
                  }}
                >
                  NEARBY ASSETS
                </div>
                {zone.nearbyAssets.map((a) => (
                  <div
                    key={a}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "3px 8px",
                      marginRight: 5,
                      marginBottom: 5,
                      background: "rgba(0,212,216,0.06)",
                      border: "1px solid rgba(0,212,216,0.12)",
                      borderRadius: 4,
                      fontSize: 10,
                      color: "#4a7090",
                    }}
                  >
                    {a}
                  </div>
                ))}
              </div>
            </div>

            {/* Infrastructure scores */}
            <div
              style={{
                padding: "14px 16px",
                background: "rgba(4,14,30,0.7)",
                border: "1px solid rgba(0,212,216,0.09)",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "#3a6080",
                  fontFamily: "JetBrains Mono, monospace",
                  letterSpacing: "0.1em",
                  marginBottom: 12,
                }}
              >
                INFRASTRUCTURE SCORES
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <ScoreBar label="Available Land" value={zone.availableLand} />
                <ScoreBar label="Soil Infiltration" value={zone.soilInfiltration} />
                <ScoreBar label="Storage Potential" value={zone.storagePotential} />
                <ScoreBar label="Vulnerable Population" value={zone.vulnerablePopulation} />
              </div>
            </div>
          </div>

          {/* Key constraint callout */}
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.18)",
              borderRadius: 7,
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
            }}
          >
            <AlertCircle size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div
                style={{
                  fontSize: 9,
                  color: "#92400e",
                  fontFamily: "JetBrains Mono, monospace",
                  letterSpacing: "0.1em",
                  marginBottom: 4,
                }}
              >
                KEY CONSTRAINTS
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#ca8a04", lineHeight: 1.6 }}>
                {zone.constraintSummary}
              </p>
            </div>
          </div>

          {/* GSI Feasibility matrix */}
          <div>
            <div
              style={{
                fontSize: 9,
                color: "#3a6080",
                fontFamily: "JetBrains Mono, monospace",
                letterSpacing: "0.1em",
                marginBottom: 12,
              }}
            >
              GSI SOLUTION FEASIBILITY
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
              {(["recommended", "feasible", "limited", "not-suitable"] as Feasibility[]).map(
                (f) => {
                  const cfg = FEASIBILITY_CONFIG[f];
                  return (
                    <div
                      key={f}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        fontSize: 10,
                        color: cfg.color,
                        opacity: 0.85,
                      }}
                    >
                      {cfg.icon}
                      {cfg.label}
                    </div>
                  );
                },
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {zone.solutions.map((sol) => {
                const cfg = FEASIBILITY_CONFIG[sol.feasibility];
                const canExplore =
                  sol.feasibility === "recommended" || sol.feasibility === "feasible";
                return (
                  <div
                    key={sol.id}
                    style={{
                      padding: "13px 16px",
                      background: cfg.bg,
                      border: `1px solid ${cfg.border}`,
                      borderRadius: 8,
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: 10,
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ color: cfg.color }}>{sol.icon}</span>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: cfg.color,
                          }}
                        >
                          {sol.name}
                        </span>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 7px",
                            background: `${cfg.color}15`,
                            border: `1px solid ${cfg.color}30`,
                            borderRadius: 999,
                            fontSize: 9,
                            color: cfg.color,
                            fontFamily: "JetBrains Mono, monospace",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: 12,
                          color: sol.feasibility === "not-suitable" ? "#6b4040" : "#5b8ab0",
                          lineHeight: 1.6,
                        }}
                      >
                        {sol.reason}
                      </p>
                    </div>
                    {canExplore && onExploreSolution && (
                      <button
                        onClick={() => onExploreSolution(sol.id, zone.id)}
                        style={{
                          padding: "6px 12px",
                          background: "rgba(0,212,216,0.1)",
                          border: "1px solid rgba(0,212,216,0.22)",
                          borderRadius: 5,
                          color: "#00d4d8",
                          fontSize: 10,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          letterSpacing: "0.04em",
                          transition: "all 0.15s",
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.background =
                            "rgba(0,212,216,0.18)")
                        }
                        onMouseLeave={(e) =>
                          ((e.currentTarget as HTMLButtonElement).style.background =
                            "rgba(0,212,216,0.1)")
                        }
                      >
                        Simulate →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom spacer */}
          <div style={{ height: 16 }} />
        </div>
      </div>
    </div>
  );
}
