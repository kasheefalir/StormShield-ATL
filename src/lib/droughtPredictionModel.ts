import type { DroughtPrediction, RainfallScenario } from "../types";

export function predictDrought(scenario: RainfallScenario): DroughtPrediction {
  const rainDeficitScore = Math.min(1, (1.4 - scenario.recentRainfallInches) / 1.4);
  const heatScore = Math.min(1, Math.max(0, (scenario.averageTemperature - 75) / 25));
  const soilDrynessScore = Math.min(1, Math.max(0, (45 - scenario.soilMoisturePercent) / 45));
  const drySpellScore = Math.min(1, scenario.daysSinceLastRain / 21);

  const droughtProbability = clamp01(
    rainDeficitScore * 0.3 +
      heatScore * 0.22 +
      soilDrynessScore * 0.28 +
      drySpellScore * 0.2,
  );

  const predictedCondition =
    droughtProbability > 0.65
      ? "drought"
      : droughtProbability > 0.42
        ? "watch"
        : "normal";

  const recommendation =
    predictedCondition === "drought"
      ? "Shift routing toward reuse storage, tree trenches, parks, and stream baseflow support."
      : predictedCondition === "watch"
        ? "Hold more captured runoff in neighborhood storage and increase irrigation readiness."
        : "Keep routing balanced while preserving reserve capacity for the next storm.";

  return {
    droughtProbability,
    predictedCondition,
    recommendation,
  };
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}
