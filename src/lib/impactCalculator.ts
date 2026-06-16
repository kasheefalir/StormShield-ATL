import type { AtlantaZone, ImpactStats, RainfallScenario, WaterRoute } from "../types";
import { estimateRunoffGallons } from "./waterRoutingEngine";

export function calculateImpactStats(
  zones: AtlantaZone[],
  routes: WaterRoute[],
  scenario: RainfallScenario,
): ImpactStats {
  const totalRunoff = zones.reduce((sum, zone) => sum + estimateRunoffGallons(zone, scenario), 0);
  const gallonsCaptured = sumRoutes(routes, (route) => route.destination !== "stormDrainOverflow");
  const gallonsSentToWetlands = sumRoutes(routes, (route) => route.destination === "wetlands");
  const gallonsSentToParksTrees = sumRoutes(routes, (route) => route.destination === "retention" || route.destination === "parksTrees");
  const gallonsSentToRainGardens = sumRoutes(routes, (route) => route.destination === "rainGardens");
  const gallonsSentToRiverRecharge = sumRoutes(routes, (route) => route.destination === "riverRecharge");
  const gallonsSentToUrbanFarms = sumRoutes(routes, (route) => route.destination === "urbanFarms");
  const gallonsStoredForReuse = sumRoutes(routes, (route) => route.destination === "reuseStorage");
  const gallonsRedirectedAwayFromStreets = sumRoutes(
    routes,
    (route) => route.destination !== "stormDrainOverflow" && route.destination !== "riverRecharge",
  );

  const highestRisk = zones.reduce((sum, zone) => sum + zone.floodRiskScore, 0) / zones.length;

  // Hackathon demo estimates: these simple ratios are placeholders for future hydrology,
  // hydraulic network, land cover, and maintenance models.
  const captureRatio = totalRunoff > 0 ? gallonsCaptured / totalRunoff : 0;
  const floodRiskReductionPercent = Math.min(48, captureRatio * 58 + (highestRisk > 80 ? 6 : 0));
  const homesProtected = Math.round(gallonsRedirectedAwayFromStreets / 9800);
  const streetSegmentsProtected = Math.round(gallonsRedirectedAwayFromStreets / 22000);
  const co2SupportedPounds = Math.round((gallonsSentToParksTrees / 748) * 1.6);
  const coolingBenefitDegreesF = Math.min(6.8, 0.8 + gallonsSentToParksTrees / 115000);

  return {
    gallonsCaptured: Math.round(gallonsCaptured),
    gallonsRedirectedAwayFromStreets: Math.round(gallonsRedirectedAwayFromStreets),
    gallonsSentToWetlands: Math.round(gallonsSentToWetlands),
    gallonsSentToParksTrees: Math.round(gallonsSentToParksTrees),
    gallonsSentToRainGardens: Math.round(gallonsSentToRainGardens),
    gallonsSentToRiverRecharge: Math.round(gallonsSentToRiverRecharge),
    gallonsSentToUrbanFarms: Math.round(gallonsSentToUrbanFarms),
    gallonsStoredForReuse: Math.round(gallonsStoredForReuse),
    floodRiskReductionPercent: roundOne(floodRiskReductionPercent),
    co2SupportedPounds,
    coolingBenefitDegreesF: roundOne(coolingBenefitDegreesF),
    homesProtected,
    streetSegmentsProtected,
  };
}

function sumRoutes(routes: WaterRoute[], predicate: (route: WaterRoute) => boolean) {
  return routes.reduce((sum, route) => (predicate(route) ? sum + route.gallons : sum), 0);
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10;
}
