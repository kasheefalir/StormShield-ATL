import type { AtlantaZone, InterventionId } from "../types";

export type PlausibilityStatus =
  | "Strong fit"
  | "Possible with constraints"
  | "Not recommended";

export type SuitabilityFactor = {
  label: string;
  value: number;
  note: string;
};

export type SuitabilityResult = {
  score: number;
  status: PlausibilityStatus;
  whyItWorks: string;
  whyItMayNotWork: string;
  constraints: string[];
  factors: SuitabilityFactor[];
};

type WeightedFactor = {
  label: string;
  value: number;
  weight: number;
  note: string;
};

// Planning screen model only. Production recommendations should be replaced with
// field-verified site constraints, utility records, geotechnical data, hydraulic
// modeling, and maintenance commitments from local agencies.
export function analyzeSuitability(
  zone: AtlantaZone,
  solutionId: InterventionId,
): SuitabilityResult {
  const complaintsScore = clamp((zone.drainageComplaintCount / 140) * 100, 0, 100);
  const common = {
    floodRisk: zone.floodRiskScore,
    impervious: zone.imperviousSurfacePercent,
    roadDensity: zone.roadDensityScore,
    availableLand: zone.availableLandScore,
    treeGap: 100 - zone.treeCanopyPercent,
    slopeRisk: zone.slopeRiskScore,
    soilInfiltration: zone.soilInfiltrationScore,
    complaints: complaintsScore,
    vulnerability: zone.vulnerablePopulationScore,
    maintenance: zone.maintenanceCapacityScore,
    roofCapture: zone.roofCapturePotential,
    storage: zone.storagePotential,
    pipeOverload: clamp(
      zone.floodRiskScore * 0.38 +
        zone.imperviousSurfacePercent * 0.22 +
        complaintsScore * 0.25 +
        zone.elevationRisk * 0.15,
      0,
      100,
    ),
    limitedSurfaceLand: 100 - zone.availableLandScore,
    groundwaterConflict: clamp(
      (100 - zone.soilInfiltrationScore) * 0.55 + zone.elevationRisk * 0.45,
      0,
      100,
    ),
  };
  const factors = getWeightedFactors(solutionId, common);
  const weightedScore =
    factors.reduce((sum, factor) => sum + factor.value * factor.weight, 0) /
    factors.reduce((sum, factor) => sum + factor.weight, 0);
  const penalties = getRulePenalties(zone, solutionId);
  const rawScore = weightedScore - penalties.reduce((sum, penalty) => sum + penalty.points, 0);
  const hardCap = getHardCap(zone, solutionId);
  const score = Math.round(clamp(Math.min(rawScore, hardCap), 0, 98));
  const status = getStatus(score);

  return {
    score,
    status,
    whyItWorks: getWhyItWorks(zone, solutionId, status),
    whyItMayNotWork: getWhyItMayNotWork(zone, solutionId, penalties),
    constraints: getConstraints(zone, solutionId, penalties),
    factors: factors
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
      .map(({ label, note, value }) => ({
        label,
        note,
        value: Math.round(value),
      })),
  };
}

function getWeightedFactors(
  solutionId: InterventionId,
  common: Record<string, number>,
): WeightedFactor[] {
  switch (solutionId) {
    case "bioswale":
      return [
        factor("Road density", common.roadDensity, 0.26, "needs curbside runoff corridors"),
        factor("Available right-of-way", common.availableLand, 0.2, "needs space beside streets"),
        factor("Impervious runoff", common.impervious, 0.18, "works best where pavement sheds fast runoff"),
        factor("Flood risk", common.floodRisk, 0.12, "targets places with repeated overload"),
        factor("Soil infiltration", common.soilInfiltration, 0.12, "needs soil that can absorb some water"),
        factor("Maintenance feasibility", common.maintenance, 0.12, "needs sediment and vegetation upkeep"),
      ];
    case "rain-garden":
      return [
        factor("Soil infiltration", common.soilInfiltration, 0.3, "needs absorbent planting soil"),
        factor("Small open space", common.availableLand, 0.22, "needs distributed pockets of land"),
        factor("Flood risk", common.floodRisk, 0.13, "helps where runoff starts near homes"),
        factor("Population vulnerability", common.vulnerability, 0.12, "prioritizes blocks with higher exposure"),
        factor("Drainage complaints", common.complaints, 0.11, "targets known nuisance flooding"),
        factor("Maintenance feasibility", common.maintenance, 0.12, "needs landscape care"),
      ];
    case "permeable-pavement":
      return [
        factor("Impervious surface", common.impervious, 0.3, "needs paved parking, sidewalk, or plaza area"),
        factor("Road density", common.roadDensity, 0.24, "fits streets and pedestrian corridors"),
        factor("Maintenance feasibility", common.maintenance, 0.16, "needs vacuum sweeping and clogging control"),
        factor("Drainage complaints", common.complaints, 0.12, "works where pavement contributes to ponding"),
        factor("Flood risk", common.floodRisk, 0.1, "reduces fast inflow to drains"),
        factor("Available retrofit area", common.availableLand, 0.08, "needs constructible surface area"),
      ];
    case "tree-trench":
      return [
        factor("Tree canopy gap", common.treeGap, 0.26, "stronger fit where canopy is low"),
        factor("Road density", common.roadDensity, 0.24, "needs street or sidewalk corridors"),
        factor("Impervious runoff", common.impervious, 0.16, "captures runoff from hardscape"),
        factor("Available verge space", common.availableLand, 0.12, "needs planting trench space"),
        factor("Population vulnerability", common.vulnerability, 0.1, "adds cooling and flood benefits"),
        factor("Maintenance feasibility", common.maintenance, 0.12, "needs tree and inlet maintenance"),
      ];
    case "retention-pond":
      return [
        factor("Available land", common.availableLand, 0.36, "requires a larger footprint"),
        factor("Storage potential", common.storage, 0.2, "needs detention volume"),
        factor("Flood risk", common.floodRisk, 0.14, "best where peak flows are high"),
        factor("Slope risk", common.slopeRisk, 0.1, "can intercept downhill runoff"),
        factor("Drainage complaints", common.complaints, 0.1, "targets known overflow clusters"),
        factor("Maintenance feasibility", common.maintenance, 0.1, "needs sediment and outlet upkeep"),
      ];
    case "smart-storage-network":
      return [
        factor("Pipe overload", common.pipeOverload, 0.24, "best where peak flows exceed pipe capacity"),
        factor("Storage potential", common.storage, 0.22, "needs feasible underground storage volume"),
        factor("Limited surface land", common.limitedSurfaceLand, 0.16, "fits dense areas without large surface GSI space"),
        factor("Drainage complaints", common.complaints, 0.14, "targets recurring sewer backup and ponding"),
        factor("Maintenance feasibility", common.maintenance, 0.14, "requires sensors, valves, telemetry, and backup power"),
        factor("Groundwater compatibility", 100 - common.groundwaterConflict, 0.1, "lower groundwater conflict improves storage feasibility"),
      ];
    case "wetland":
      return [
        factor("Available land", common.availableLand, 0.32, "requires connected low open land"),
        factor("Storage potential", common.storage, 0.2, "needs floodplain or basin capacity"),
        factor("Soil infiltration", common.soilInfiltration, 0.14, "needs hydrologically suitable soils"),
        factor("Flood risk", common.floodRisk, 0.14, "buffers repeated flooding"),
        factor("Slope risk", common.slopeRisk, 0.1, "captures downhill runoff"),
        factor("Maintenance feasibility", common.maintenance, 0.1, "needs invasive species and outlet upkeep"),
      ];
    default:
      return [factor("Flood risk", common.floodRisk, 1, "baseline flood pressure")];
  }
}

function getRulePenalties(zone: AtlantaZone, solutionId: InterventionId) {
  const penalties: Array<{ reason: string; points: number }> = [];

  if (solutionId === "bioswale") {
    if (zone.roadDensityScore < 45) penalties.push({ reason: "limited road runoff corridor", points: 18 });
    if (zone.availableLandScore < 35) penalties.push({ reason: "limited right-of-way", points: 18 });
  }
  if (solutionId === "rain-garden") {
    if (zone.soilInfiltrationScore < 40) penalties.push({ reason: "poor soil infiltration", points: 18 });
    if (zone.availableLandScore < 35) penalties.push({ reason: "too little distributed open space", points: 16 });
  }
  if (solutionId === "permeable-pavement") {
    if (zone.imperviousSurfacePercent < 55) penalties.push({ reason: "not enough paved retrofit area", points: 18 });
    if (zone.roadDensityScore < 55) penalties.push({ reason: "limited street or parking corridor", points: 12 });
  }
  if (solutionId === "tree-trench") {
    if (zone.treeCanopyPercent > 45) penalties.push({ reason: "existing canopy is already relatively high", points: 14 });
    if (zone.roadDensityScore < 40) penalties.push({ reason: "limited sidewalk or street corridor", points: 16 });
  }
  if (solutionId === "retention-pond" && zone.availableLandScore < 55) {
    penalties.push({ reason: "retention basin requires a larger land footprint", points: 24 });
  }
  if (solutionId === "smart-storage-network") {
    const pipeOverload = clamp(
      zone.floodRiskScore * 0.38 +
        zone.imperviousSurfacePercent * 0.22 +
        clamp((zone.drainageComplaintCount / 140) * 100, 0, 100) * 0.25 +
        zone.elevationRisk * 0.15,
      0,
      100,
    );
    const groundwaterConflict = clamp(
      (100 - zone.soilInfiltrationScore) * 0.55 + zone.elevationRisk * 0.45,
      0,
      100,
    );
    if (zone.storagePotential < 55) penalties.push({ reason: "limited underground storage potential", points: 24 });
    if (zone.maintenanceCapacityScore < 45) penalties.push({ reason: "low maintenance capacity for sensors and valves", points: 22 });
    if (groundwaterConflict > 70) penalties.push({ reason: "high groundwater conflict risk", points: 18 });
    if (pipeOverload < 55) penalties.push({ reason: "pipe overload is not high enough to justify controls", points: 18 });
  }

  return penalties;
}

function getHardCap(zone: AtlantaZone, solutionId: InterventionId) {
  if (solutionId === "retention-pond" && zone.availableLandScore < 55) return 49;
  if (solutionId === "smart-storage-network" && zone.storagePotential < 45) return 44;
  if (solutionId === "smart-storage-network" && zone.maintenanceCapacityScore < 40) return 48;
  if (solutionId === "rain-garden" && (zone.soilInfiltrationScore < 40 || zone.availableLandScore < 35)) {
    return 58;
  }
  return 98;
}

function getStatus(score: number): PlausibilityStatus {
  if (score >= 75) return "Strong fit";
  if (score >= 50) return "Possible with constraints";
  return "Not recommended";
}

function getWhyItWorks(
  zone: AtlantaZone,
  solutionId: InterventionId,
  status: PlausibilityStatus,
) {
  const prefix =
    status === "Strong fit"
      ? "Strong fit because"
      : status === "Possible with constraints"
        ? "Possible because"
        : "Limited fit because";

  switch (solutionId) {
    case "bioswale":
      return `${prefix} ${zone.name} has road runoff corridors and repeated drainage complaints that can be intercepted before water reaches inlets.`;
    case "rain-garden":
      return `${prefix} small planted capture areas can hold neighborhood runoff where soils and open pockets can support infiltration.`;
    case "permeable-pavement":
      return `${prefix} high impervious surfaces create paved retrofit opportunities that can reduce fast runoff from sidewalks, lots, and plazas.`;
    case "tree-trench":
      return `${prefix} low canopy and street corridors allow trench storage to add cooling while slowing runoff near drains.`;
    case "retention-pond":
      return `${prefix} larger open land or park-adjacent storage can detain peak stormwater before it enters the pipe network.`;
    case "smart-storage-network":
      return `${prefix} sensors, smart valves, and underground storage can remove excess peak stormwater from overloaded pipes and release it later when capacity returns.`;
    case "wetland":
      return `${prefix} connected low open space can receive overflow and support slower watershed recharge.`;
    default:
      return `${prefix} the area has flood pressure that warrants closer study.`;
  }
}

function getWhyItMayNotWork(
  zone: AtlantaZone,
  solutionId: InterventionId,
  penalties: Array<{ reason: string; points: number }>,
) {
  if (penalties.length > 0) {
    return `May not work without solving: ${penalties.map((penalty) => penalty.reason).join(", ")}.`;
  }

  switch (solutionId) {
    case "bioswale":
      return "May be constrained by utilities, narrow curbs, driveway conflicts, or sediment maintenance.";
    case "rain-garden":
      return "May be constrained by compacted soil, utility conflicts, or not enough distributed open space.";
    case "permeable-pavement":
      return "May be constrained by heavy traffic loads, clogging risk, or utility cuts.";
    case "tree-trench":
      return "May be constrained by underground utilities, narrow sidewalks, or long-term tree care.";
    case "retention-pond":
      return "May be constrained by land acquisition, grading, safety, and outlet maintenance.";
    case "smart-storage-network":
      return "May be constrained by underground storage space, groundwater conflicts, telemetry reliability, backup power, and long-term valve maintenance.";
    default:
      return `May be constrained by local site access and maintenance capacity in ${zone.name}.`;
  }
}

function getConstraints(
  zone: AtlantaZone,
  solutionId: InterventionId,
  penalties: Array<{ reason: string; points: number }>,
) {
  const constraints = [
    `${zone.imperviousSurfacePercent}% impervious surface`,
    `${zone.roadDensityScore}/100 road density`,
    `${zone.availableLandScore}/100 available land`,
    `${zone.soilInfiltrationScore}/100 soil infiltration`,
  ];

  if (solutionId === "tree-trench") constraints.push(`${zone.treeCanopyPercent}% existing tree canopy`);
  if (solutionId === "smart-storage-network") {
    constraints.push(`${zone.storagePotential}/100 storage potential`);
    constraints.push(`${zone.maintenanceCapacityScore}/100 maintenance capacity`);
  }
  if (penalties.length > 0) constraints.unshift(...penalties.map((penalty) => penalty.reason));

  return constraints.slice(0, 6);
}

function factor(label: string, value: number, weight: number, note: string): WeightedFactor {
  return {
    label,
    value: clamp(value, 0, 100),
    weight,
    note,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
