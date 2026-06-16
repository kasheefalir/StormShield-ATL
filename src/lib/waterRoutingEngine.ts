import type {
  AtlantaZone,
  DroughtPrediction,
  GsiIntervention,
  RainfallScenario,
  RouteDestination,
  WaterRoute,
} from "../types";

const farmIrrigationZones = new Set([
  "south-downtown",
  "east-atlanta",
  "airport-south",
]);

export function routeWaterForScenario(
  zones: AtlantaZone[],
  interventions: GsiIntervention[],
  scenario: RainfallScenario,
  droughtPrediction: DroughtPrediction,
  selectedZoneId?: string,
) {
  const interventionById = new Map(interventions.map((item) => [item.id, item]));
  const droughtActive =
    scenario.routingPreference === "drought-recharge" ||
    scenario.routingPreference === "proactive-drought" ||
    droughtPrediction.droughtProbability > 0.65;

  return zones.flatMap((zone) => {
    const primary = interventionById.get(zone.recommendedGsi.primary);
    const secondary = zone.recommendedGsi.secondary
      .map((id) => interventionById.get(id))
      .filter((item): item is GsiIntervention => Boolean(item));

    const runoffGallons = estimateRunoffGallons(zone, scenario);
    const focusMultiplier = selectedZoneId === zone.id ? 1.18 : 1;
    const baseCaptured = runoffGallons * (primary?.captureEfficiency ?? 0.55) * focusMultiplier;
    const storageLimit = zone.storageCapacityGallons * (droughtActive ? 0.9 : 0.72);
    const captured = Math.min(baseCaptured + secondary.length * runoffGallons * 0.06, storageLimit);
    const overflow = Math.max(0, runoffGallons - captured - storageLimit * 0.18);

    return buildDemoRoutes(zone.id, captured, overflow, droughtActive, primary?.name ?? "GSI");
  });
}

export function estimateRunoffGallons(zone: AtlantaZone, scenario: RainfallScenario) {
  const demoCatchmentAcres = 18 + zone.imperviousSurfacePercent / 4 + zone.drainageComplaintCount / 18;
  const runoffCoefficient = 0.35 + zone.imperviousSurfacePercent / 175;
  return scenario.totalRainfallInches * demoCatchmentAcres * 27154 * runoffCoefficient;
}

function buildDemoRoutes(
  zoneId: string,
  captured: number,
  overflow: number,
  droughtActive: boolean,
  primaryName: string,
): WaterRoute[] {
  const totalManaged = captured + overflow * 0.55;
  const parkStorageShare = droughtActive ? 0.28 : 0.42;
  const riverRechargeShare = droughtActive ? 0.38 : 0.18;
  const gardenShare = droughtActive ? 0.16 : 0.22;
  const storageShare = Math.max(0.12, 1 - parkStorageShare - riverRechargeShare - gardenShare);
  const reuseDestination: RouteDestination = farmIrrigationZones.has(zoneId)
    ? "urbanFarms"
    : "reuseStorage";
  const reuseLabel = farmIrrigationZones.has(zoneId)
    ? "Stored first, then reused for urban farm irrigation"
    : "Excess water stored for later reuse";

  return [
    route(zoneId, "retention", totalManaged * parkStorageShare, 1, `Park detention and ${primaryName}`),
    route(
      zoneId,
      "riverRecharge",
      totalManaged * riverRechargeShare,
      2,
      droughtActive ? "Drought priority: refill visible waterway baseflow" : "Controlled creek, lake, or river recharge",
    ),
    route(zoneId, "rainGardens", totalManaged * gardenShare, 3, "Garden and greenway soil soak-in"),
    route(zoneId, reuseDestination, totalManaged * storageShare + overflow * 0.45, 4, reuseLabel),
  ];
}

function route(
  zoneId: string,
  destination: RouteDestination,
  gallons: number,
  priority: number,
  label: string,
): WaterRoute {
  return {
    zoneId,
    destination,
    gallons: Math.max(0, Math.round(gallons)),
    priority,
    label,
  };
}
