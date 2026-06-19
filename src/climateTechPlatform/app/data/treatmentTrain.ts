// ─── GSI "Treatment Train" — tank-led, multi-stage plan per zone ─────────────
// Every zone's plan starts with the smart tank as the hub at the storm-drain
// pressure points: it slows and stores the peak overshoot, then redirects that
// water through pipes to the GSI destinations the zone has room for. Each stage
// is rendered by a reused canvas animation and captioned with how much it holds,
// its footprint, and how much it absorbs per square foot.
//
// SOLUTION_CAPACITY is the single source of truth for the sizing math, shared by
// the treatment-train captions AND the Solutions page so the numbers always match.

export type CapacityUnit = "sqft" | "linft" | "cuft" | "none";

export interface SolutionCapacity {
  name: string;
  vizId: string;            // which visualization renders this stage
  storageDensity: number;   // gallons held per unit (0 when qualitative)
  unit: CapacityUnit;
  absorbs: string;          // human-readable absorption / storage density
  qualitativeSpace?: string; // used when footprint is not a simple area (recharge)
}

// Storage densities during a 1-hour cloudburst (infiltration is slow, so what
// matters is volume held):
//   retention pond: 7.48 gal/ft²/ft × 4 ft avg depth = ~30 gal/ft²
//   bioswale: 9–18" ponding = 5.6–11.2 gal/ft²; ~8 gal/ft² at 12" typical
//   rain garden: 9" preferred ponding (GA guidance) = 0.75 ft × 7.48 = 5.6 gal/ft²
//   tree trench: 1.5 gal/cu ft soil × 6 ft wide × 3 ft deep = 27 gal/linear ft
//   permeable pavement: 6–18" stone, 40% void = 1.5–4.5 gal/ft²; 3.0 at 12" midpoint
//   tanks: 7.48 gal/cu ft (open vault volume, no void factor)
export const SOLUTION_CAPACITY: Record<string, SolutionCapacity> = {
  "smart-storage-network": {
    name: "Smart Storage Network",
    vizId: "SmartStorageNetworkVisualization",
    storageDensity: 7.48,
    unit: "cuft",
    absorbs: "7.48 gal / ft³ (open vault volume)",
  },
  "retention-basin": {
    name: "Retention Basin",
    vizId: "RetentionBasinVisualization",
    storageDensity: 30,
    unit: "sqft",
    absorbs: "~30 gal / ft² (7.48 × 4 ft avg depth)",
  },
  "bioswale": {
    name: "Vegetated Bioswale",
    vizId: "bioswale",
    storageDensity: 8,
    unit: "sqft",
    absorbs: "~8 gal / ft² (12\" ponding; range 5.6–11.2 gal/ft²)",
  },
  "rain-garden": {
    name: "Rain Garden",
    vizId: "RainGardenVisualization",
    storageDensity: 5.6,
    unit: "sqft",
    absorbs: "~5.6 gal / ft² (9\" preferred ponding depth)",
  },
  "tree-trench": {
    name: "Silva Cell Tree Trench",
    vizId: "TreeTrenchVisualization",
    storageDensity: 27,
    unit: "linft",
    absorbs: "~27 gal / linear ft (1.5 gal/cu ft × 6'×3' cell)",
  },
  "permeable-pavement": {
    name: "Permeable Pavement",
    vizId: "PermeablePavementVisualization",
    storageDensity: 3.0,
    unit: "sqft",
    absorbs: "~3.0 gal / ft² (12\" stone, 40% void; range 1.5–4.5)",
  },
  "reuse-storage": {
    name: "Reuse Storage Tank",
    vizId: "StorageTankVisualization",
    storageDensity: 7.48,
    unit: "cuft",
    absorbs: "7.5 gal / ft³ (held for reuse)",
  },
  "recharge": {
    name: "Groundwater Recharge",
    vizId: "PermeablePavementVisualization",
    storageDensity: 0,
    unit: "none",
    absorbs: "Soil-rate limited (~1–2 in/hr)",
    qualitativeSpace: "Subsurface infiltration gallery / dry wells",
  },
};

// ─── Rational Method (50-acre catchment, C=0.90) ─────────────────────────────
// Storm intensity:  3.0 in/hr  →  Q_storm = 0.90 × 3.0 × 50 = 135 cfs = ~60,750 gpm
// Drain capacity:   2.5 in/hr  →  Q_drain = 0.90 × 2.5 × 50 = 112.5 cfs = ~50,625 gpm
// Excess diverted:              →  Q_excess = 22.5 cfs = ~10,125 gpm
// Over 1 hour:                  →  ~607,500 gal intercepted at peak rate

export const MODEL = {
  stormFlowGpm: 60_750,
  drainCapacityGpm: 50_625,
  excessFlowGpm: 10_125,
  excessGalPerHour: 607_500,
} as const;

export type StageFate = "store-redirect" | "infiltrate" | "recharge" | "reuse";

export interface TrainStage {
  solutionId: string;     // key into SOLUTION_CAPACITY
  role: "hub" | "destination";
  sharePercent: number;   // % of the tank's intercepted water sent here (hub = 100)
  fate: StageFate;
  caption: string;
}

export interface ZoneTrain {
  interceptGallons: number; // the peak overshoot the tank grabs at the pressure points
  interceptFlowGpm: number; // peak excess flow rate (gpm) — primary metric
  stages: TrainStage[];     // stages[0] is always the smart-tank hub
}

export const ZONE_TRAIN: Record<string, ZoneTrain> = {
  "south-downtown": {
    interceptGallons: 607_500,
    interceptFlowGpm: 10_125,
    stages: [
      {
        solutionId: "smart-storage-network",
        role: "hub",
        sharePercent: 100,
        fate: "store-redirect",
        caption:
          "At the storm-drain pressure points a distributed smart-tank network intercepts ~10,125 gpm of excess flow (the ~22.5 cfs overshoot beyond pipe capacity), slows it, and holds it — then meters it out to the destinations below. Dense core: no land for surface green, so the tank does the heavy lifting.",
      },
      {
        solutionId: "permeable-pavement",
        role: "destination",
        sharePercent: 40,
        fate: "infiltrate",
        caption:
          "~40% is released into permeable pavement on existing parking decks, infiltrating slowly through the 18\" stone base — the only surface infiltration the dense, clay-soil core can offer.",
      },
      {
        solutionId: "reuse-storage",
        role: "destination",
        sharePercent: 60,
        fate: "reuse",
        caption:
          "The remaining ~60% is banked in a dedicated storage tank for non-potable reuse (irrigation, cooling, street cleaning) — kept out of the combined sewer entirely rather than infiltrated, since clay soil won't take it.",
      },
    ],
  },

  "westside-proctor": {
    interceptGallons: 607_500,
    interceptFlowGpm: 10_125,
    stages: [
      {
        solutionId: "smart-storage-network",
        role: "hub",
        sharePercent: 100,
        fate: "store-redirect",
        caption:
          "Smart tanks at the curb-inlet pressure points intercept ~10,125 gpm of excess runoff and slow it. Moderate land and fair soil here mean the tank can then hand most of the water to green GSI.",
      },
      {
        solutionId: "bioswale",
        role: "destination",
        sharePercent: 40,
        fate: "infiltrate",
        caption:
          "~40% flows to a vegetated bioswale corridor along the Proctor Creek drainage, where it ponds, filters, and infiltrates toward the creek.",
      },
      {
        solutionId: "rain-garden",
        role: "destination",
        sharePercent: 35,
        fate: "infiltrate",
        caption:
          "~35% is spread across distributed rain gardens on residential lots, soaking into amended soil over the hours after the peak.",
      },
      {
        solutionId: "tree-trench",
        role: "destination",
        sharePercent: 25,
        fate: "infiltrate",
        caption:
          "~25% is piped from the smart tank into Silva Cell tree trenches under the existing street ROW. Each six-tree cell holds ~3,000 gal in the engineered soil vault — infiltrating slowly while doubling canopy cover and reducing the urban heat island.",
      },
    ],
  },

  "old-fourth-ward": {
    interceptGallons: 607_500,
    interceptFlowGpm: 10_125,
    stages: [
      {
        solutionId: "smart-storage-network",
        role: "hub",
        sharePercent: 100,
        fate: "store-redirect",
        caption:
          "Smart tanks intercept ~10,125 gpm of excess flow. With the best soil among at-risk zones and an existing park pond nearby, the tank routes water to genuinely effective green storage.",
      },
      {
        solutionId: "retention-basin",
        role: "destination",
        sharePercent: 55,
        fate: "store-redirect",
        caption:
          "~55% is directed to the existing park detention basin, which holds it in deep storage (~30 gal/ft²) and releases slowly through a controlled outlet.",
      },
      {
        solutionId: "rain-garden",
        role: "destination",
        sharePercent: 45,
        fate: "infiltrate",
        caption:
          "~45% feeds rain gardens woven into the BeltLine green corridor, infiltrating into the zone's relatively good soil over 24–48 hours.",
      },
    ],
  },

  "vine-city": {
    interceptGallons: 607_500,
    interceptFlowGpm: 10_125,
    stages: [
      {
        solutionId: "smart-storage-network",
        role: "hub",
        sharePercent: 100,
        fate: "store-redirect",
        caption:
          "Smart tanks intercept ~10,125 gpm of excess runoff at the inlets. Residential lots give the tank plenty of distributed green destinations to hand water to.",
      },
      {
        solutionId: "rain-garden",
        role: "destination",
        sharePercent: 40,
        fate: "infiltrate",
        caption:
          "~40% is spread across rain gardens on residential parcels — many small cells absorbing runoff close to where it falls.",
      },
      {
        solutionId: "bioswale",
        role: "destination",
        sharePercent: 35,
        fate: "infiltrate",
        caption:
          "~35% flows to curbside bioswales that pond, filter, and infiltrate along the street edge.",
      },
      {
        solutionId: "recharge",
        role: "destination",
        sharePercent: 25,
        fate: "recharge",
        caption:
          "The remaining ~25% recharges groundwater through subsurface infiltration galleries, taking it permanently out of the combined sewer.",
      },
    ],
  },

  "airport-south": {
    interceptGallons: 607_500,
    interceptFlowGpm: 10_125,
    stages: [
      {
        solutionId: "smart-storage-network",
        role: "hub",
        sharePercent: 100,
        fate: "store-redirect",
        caption:
          "Around College Park there's abundant land but compacted clay soil. Smart tanks intercept ~10,125 gpm of excess flow, then route it to storage — not infiltration — because the soil won't take it.",
      },
      {
        solutionId: "retention-basin",
        role: "destination",
        sharePercent: 65,
        fate: "store-redirect",
        caption:
          "~65% goes to large surface/subsurface retention basins on the open parcels — deep storage (~30 gal/ft²) with slow controlled release, the right move where clay limits infiltration.",
      },
      {
        solutionId: "reuse-storage",
        role: "destination",
        sharePercent: 35,
        fate: "reuse",
        caption:
          "~35% is banked in reuse storage for airport/logistics non-potable demand and South River buffer irrigation — turning the captured peak into a resource.",
      },
    ],
  },
};

export function getZoneTrain(zoneId: string): ZoneTrain | undefined {
  return ZONE_TRAIN[zoneId];
}

// Footprint required for a given solution to hold `gallons` during the peak.
export function spaceForGallons(solutionId: string, gallons: number): string {
  const cap = SOLUTION_CAPACITY[solutionId];
  if (!cap) return "—";
  if (cap.qualitativeSpace) return cap.qualitativeSpace;
  const qty = gallons / cap.storageDensity;
  if (cap.unit === "sqft") {
    if (qty >= 43560) return `~${(qty / 43560).toFixed(2)} acre`;
    return `~${(Math.round(qty / 100) * 100).toLocaleString()} sq ft`;
  }
  if (cap.unit === "linft") {
    if (qty >= 5280) return `~${(qty / 5280).toFixed(2)} mi of trench`;
    return `~${(Math.round(qty / 10) * 10).toLocaleString()} linear ft`;
  }
  // cuft → underground vault volume
  return `~${(Math.round(qty / 100) * 100).toLocaleString()} ft³ vault`;
}

export function holdGallonsForStage(train: ZoneTrain, stage: TrainStage): number {
  if (stage.role === "hub") return train.interceptGallons;
  return Math.round((stage.sharePercent / 100) * train.interceptGallons);
}
