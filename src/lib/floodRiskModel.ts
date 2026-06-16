import type { AtlantaZone, DroughtPrediction, RainfallScenario } from "../types";

export function calculateScenarioRisk(
  zone: AtlantaZone,
  scenario: RainfallScenario,
  droughtPrediction: DroughtPrediction,
  afterGsi: boolean,
) {
  const rainfallPressure = Math.min(36, scenario.rainfallInchesPerHour * 13);
  const pavedPressure = zone.imperviousSurfacePercent * 0.18;
  const complaintPressure = Math.min(14, zone.drainageComplaintCount / 10);
  const waterPressure = zone.currentWaterLevel * 0.16;
  const droughtRelief =
    scenario.routingPreference.includes("drought") || droughtPrediction.predictedCondition === "drought"
      ? -8
      : 0;

  const gsiReduction = afterGsi
    ? 10 + zone.storageCapacityGallons / 45000 + zone.recommendedGsi.secondary.length * 1.8
    : 0;

  return clamp(
    zone.floodRiskScore * 0.48 +
      zone.elevationRisk * 0.18 +
      rainfallPressure +
      pavedPressure +
      complaintPressure +
      waterPressure +
      droughtRelief -
      gsiReduction,
    8,
    99,
  );
}

export function getRiskColor(risk: number) {
  if (risk >= 85) return "#dc2626";
  if (risk >= 70) return "#f97316";
  if (risk >= 55) return "#f59e0b";
  if (risk >= 40) return "#0ea5e9";
  return "#16a34a";
}

export function getRiskLabel(risk: number) {
  if (risk >= 85) return "Severe";
  if (risk >= 70) return "High";
  if (risk >= 55) return "Elevated";
  if (risk >= 40) return "Moderate";
  return "Managed";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
