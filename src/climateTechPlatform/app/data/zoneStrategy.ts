// ─── Land/soil-driven GSI strategy per zone ──────────────────────────────────
// The right stormwater strategy is not the same everywhere — it is driven by how
// much LAND a zone has and how well its SOIL infiltrates:
//   • Dense urban cores (little land) → underground smart tanks carry the load;
//     nature-based GSI is a marginal bonus.
//   • Mixed urban zones (moderate land/soil) → smart-tank backbone + nature-based
//     GSI as meaningful support.
//   • Land-available zones (lots of room) → a hybrid of smart tanks + retention
//     basins; wide-area nature-based GSI is viable ONLY where the soil infiltrates
//     well — otherwise the play is storage, not infiltration.
//
// This module is the single source of truth consumed by the Overview, Flood Zones,
// and Solutions surfaces so the recommendation reads the same everywhere.

export type Archetype = "dense-core" | "mixed-urban" | "land-available";

export interface ArchetypeMeta {
  label: string;
  tagline: string;
  accent: string;
}

export const ARCHETYPE_META: Record<Archetype, ArchetypeMeta> = {
  "dense-core": {
    label: "DENSE CORE",
    tagline: "Tank-led · no land for green",
    accent: "#00a8f3",
  },
  "mixed-urban": {
    label: "MIXED URBAN",
    tagline: "Tank backbone + green support",
    accent: "#00c878",
  },
  "land-available": {
    label: "LAND-AVAILABLE",
    tagline: "Hybrid · tanks + retention basins",
    accent: "#22c55e",
  },
};

export const SOLUTION_NAMES: Record<string, string> = {
  "smart-storage-network": "Smart Storage Network",
  "retention-basin": "Retention Basin",
  "permeable-pavement": "Permeable Pavement",
  "bioswale": "Vegetated Bioswale",
  "rain-garden": "Rain Garden",
  "tree-trench": "Silva Cell Tree Trench",
};

export interface ZoneStrategy {
  archetype: Archetype;
  headline: string;       // one strong sentence — the recommendation in plain terms
  rationale: string;      // the land/soil reasoning behind it
  primary: string[];      // solution ids that carry the load
  support: string[];      // solution ids in a supporting role
  greenViability: string; // explicit note on wide-area nature-based plausibility
}

export const ZONE_STRATEGY: Record<string, ZoneStrategy> = {
  "south-downtown": {
    archetype: "dense-core",
    headline:
      "Underground smart tanks carry ~100% of the load; nature-based GSI is a marginal bonus.",
    rationale:
      "Land score 22 — the tightest in the network — and clay soil (32) leave no room for surface green infrastructure at scale. The play is underground: a distributed smart-tank network beneath parking decks and plazas shaves the peak, with permeable pavement on existing decks as a secondary surface measure.",
    primary: ["smart-storage-network"],
    support: ["permeable-pavement", "tree-trench"],
    greenViability: "Not viable at scale — no open land and poor infiltration.",
  },
  "midtown": {
    archetype: "dense-core",
    headline:
      "Smart tanks beneath the high-rise core do the volume control; green GSI is incidental.",
    rationale:
      "The lowest land score in the city (18) and poor soil (34) rule out wide-area green infrastructure. Underground storage under streets and plazas is the only way to shave the peak here.",
    primary: ["smart-storage-network"],
    support: ["permeable-pavement", "tree-trench"],
    greenViability: "Not viable — densest core, effectively no open land.",
  },
  "westside-proctor": {
    archetype: "mixed-urban",
    headline:
      "Smart tanks form the backbone; moderate land and fair soil make green GSI a meaningful supporting layer.",
    rationale:
      "Land (54) and soil (48) are moderate — enough for curbside bioswales and distributed rain gardens to genuinely contribute, but not enough to carry the peak alone. Smart tanks anchor the system while green GSI trims flow at the source and adds creek-corridor benefits toward Proctor Creek.",
    primary: ["smart-storage-network"],
    support: ["bioswale", "rain-garden", "tree-trench"],
    greenViability: "Partial — fits curb ROW and small lots in a supporting role.",
  },
  "old-fourth-ward": {
    archetype: "mixed-urban",
    headline:
      "Smart tanks anchor the peak, but an existing park/pond and the best at-risk soil let a retention basin and rain gardens genuinely contribute.",
    rationale:
      "The best soil among at-risk zones (55) plus existing park/detention-pond infrastructure mean a retention basin and rain gardens do real work here. BeltLine land competition keeps smart tanks as the reliable backbone.",
    primary: ["smart-storage-network"],
    support: ["retention-basin", "rain-garden", "bioswale"],
    greenViability: "Good for its size — leverage the existing pond and park.",
  },
  "vine-city": {
    archetype: "mixed-urban",
    headline:
      "Smart tanks handle the storm peak; residential lots support distributed rain gardens and bioswales.",
    rationale:
      "Residential lots (land 58) and fair soil (52) support distributed rain gardens and bioswales as real support across many small parcels, with smart tanks holding the peak.",
    primary: ["smart-storage-network"],
    support: ["rain-garden", "bioswale", "tree-trench"],
    greenViability: "Partial — distributed across residential lots.",
  },
  "east-atlanta": {
    archetype: "land-available",
    headline:
      "The one zone where wide-area nature-based GSI is genuinely viable — co-led with smart tanks and a retention basin.",
    rationale:
      "The best soil in the network (68) plus ample land (62) and a creek-fed corridor make wide-area rain gardens, bioswales, and wetlands a real volume-control option, not just amenity. Pair them with smart tanks and a retention basin for the peak.",
    primary: ["smart-storage-network", "rain-garden", "retention-basin"],
    support: ["bioswale", "tree-trench"],
    greenViability: "Strong — land plus good soil; nature-based can co-lead.",
  },
  "airport-south": {
    archetype: "land-available",
    headline:
      "Plenty of room around College Park — but clay soil limits infiltration, so storage leads: smart tanks + large retention basins.",
    rationale:
      "Around College Park and the South River headwaters there is the most land in the network (72) — but compacted clay soil (42) limits how much water can infiltrate. Wide-area green GSI has the room but not the soil for primary volume control, so the play is storage-and-release: smart tanks plus large surface/subsurface retention basins on the open parcels, with green GSI reserved for water quality and habitat along the South River buffers.",
    primary: ["smart-storage-network", "retention-basin"],
    support: ["permeable-pavement", "bioswale"],
    greenViability:
      "Room but soil-limited — green works for quality/habitat, not primary volume control.",
  },
};

export function getZoneStrategy(zoneId: string): ZoneStrategy | undefined {
  return ZONE_STRATEGY[zoneId];
}

export function solutionName(id: string): string {
  return SOLUTION_NAMES[id] ?? id;
}
