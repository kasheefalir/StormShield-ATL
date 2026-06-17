import type { AtlantaZone, RainfallScenario } from "../types";

export type ZoneHydrologyEstimate = {
  drainageAreaSqFt: number;
  runoffCoefficient: number;
  runoffVolumeGallons: number;
  pipeCapacityGallons: number;
  waterEnteringPipe: number;
  overflowGallons: number;
  peakFlowPercentOfCapacity: number;
  floodRiskScore: number;
};

export type GsiPlanningInput = {
  capturePercent: number;
  slowPercent: number;
  infiltratePercent: number;
};

export type GsiPlanningEstimate = {
  capturedGallons: number;
  slowedGallons: number;
  infiltratedGallons: number;
  adjustedRunoff: number;
  waterEnteringPipe: number;
  overflowGallons: number;
  peakFlowReductionPercent: number;
  peakFlowPercentOfCapacity: number;
  floodRiskScore: number;
};

// Atlanta's minor storm-drain/combined-sewer system is sized for the 10-year
// design storm. Per NOAA Atlas 14, that is roughly a 2.5 in/hr peak intensity
// for short-duration events. Rainfall above this overwhelms the pipes.
const DESIGN_STORM_INTENSITY_IN_PER_HR = 2.5;

// Planning estimate only. In production this should be replaced with EPA SWMM,
// HEC-HMS, calibrated local IDF curves, surveyed drainage areas, pipe network
// hydraulics, and City of Atlanta asset data.
export function estimateZoneHydrology(
  zone: AtlantaZone,
  scenario: RainfallScenario,
): ZoneHydrologyEstimate {
  const drainageAreaSqFt = estimateDrainageAreaSqFt(zone);
  const runoffCoefficient = estimateRunoffCoefficient(zone);
  const runoffVolumeGallons =
    scenario.totalRainfallInches * drainageAreaSqFt * runoffCoefficient * 0.623;
  const pipeCapacityGallons = estimatePipeCapacityGallons(zone, scenario);
  const waterEnteringPipe = runoffVolumeGallons;
  const overflowGallons = calculateOverflowGallons(waterEnteringPipe, pipeCapacityGallons);
  const peakFlowPercentOfCapacity =
    pipeCapacityGallons > 0 ? (waterEnteringPipe / pipeCapacityGallons) * 100 : 0;

  return {
    drainageAreaSqFt,
    runoffCoefficient,
    runoffVolumeGallons,
    pipeCapacityGallons,
    waterEnteringPipe,
    overflowGallons,
    peakFlowPercentOfCapacity,
    floodRiskScore: estimateFloodRiskScore(
      overflowGallons,
      runoffVolumeGallons,
      zone.floodRiskScore,
      peakFlowPercentOfCapacity,
    ),
  };
}

// Planning estimate only. The requested formula is preserved here:
// adjustedRunoff = runoffVolumeGallons - capturedGallons - infiltratedGallons.
// peakFlowReductionPercent = delayedOrCapturedVolume / originalRunoffVolume * 100.
// overflowGallons = max(0, waterEnteringPipe - pipeCapacityGallons).
export function estimateGsiPlanningImpact(
  zone: AtlantaZone,
  scenario: RainfallScenario,
  input: GsiPlanningInput,
): GsiPlanningEstimate {
  const current = estimateZoneHydrology(zone, scenario);
  const capturePercent = clamp(input.capturePercent, 0, 0.95);
  const slowPercent = clamp(input.slowPercent, 0, 0.95);
  const infiltratePercent = clamp(input.infiltratePercent, 0, 0.95);
  const capturedGallons = current.runoffVolumeGallons * capturePercent;
  const infiltratedGallons = current.runoffVolumeGallons * infiltratePercent;
  const slowedGallons = current.runoffVolumeGallons * slowPercent;
  const adjustedRunoff = Math.max(
    0,
    current.runoffVolumeGallons - capturedGallons - infiltratedGallons,
  );
  const delayedOrCapturedVolume = Math.min(
    current.runoffVolumeGallons,
    capturedGallons + infiltratedGallons + slowedGallons * 0.65,
  );
  const peakFlowReductionPercent =
    current.runoffVolumeGallons > 0
      ? (delayedOrCapturedVolume / current.runoffVolumeGallons) * 100
      : 0;
  const waterEnteringPipe = Math.max(0, adjustedRunoff - slowedGallons * 0.45);
  const overflowGallons = calculateOverflowGallons(waterEnteringPipe, current.pipeCapacityGallons);
  const peakFlowPercentOfCapacity =
    current.pipeCapacityGallons > 0
      ? (waterEnteringPipe / current.pipeCapacityGallons) * 100
      : 0;

  return {
    capturedGallons,
    slowedGallons,
    infiltratedGallons,
    adjustedRunoff,
    waterEnteringPipe,
    overflowGallons,
    peakFlowReductionPercent,
    peakFlowPercentOfCapacity,
    floodRiskScore: estimateFloodRiskScore(
      overflowGallons,
      current.runoffVolumeGallons,
      zone.floodRiskScore,
      peakFlowPercentOfCapacity,
    ),
  };
}

export function estimateDrainageAreaSqFt(zone: AtlantaZone) {
  const acres =
    14 +
    zone.imperviousSurfacePercent * 0.22 +
    zone.drainageComplaintCount * 0.08 +
    zone.elevationRisk * 0.04;

  return Math.round(acres * 43560);
}

// Conveyance capacity of the zone's combined sewer / storm-drain trunk for THIS
// event. The pipe was sized to carry the 10-year design storm (2.5 in/hr) off
// the same contributing area, so its capacity is the design-storm runoff volume
// over the event duration — de-rated by a condition factor so older,
// complaint-heavy zones surcharge before reaching nominal design capacity.
// e.g. South Downtown ≈ 2.7M gal/hr (~100 cfs through a 48" main).
export function estimatePipeCapacityGallons(zone: AtlantaZone, scenario: RainfallScenario) {
  const drainageAreaSqFt = estimateDrainageAreaSqFt(zone);
  const runoffCoefficient = estimateRunoffCoefficient(zone);
  const designStormVolume =
    DESIGN_STORM_INTENSITY_IN_PER_HR *
    scenario.durationHours *
    drainageAreaSqFt *
    runoffCoefficient *
    0.623;

  return Math.round(designStormVolume * pipeConditionFactor(zone));
}

// 1.0 = pipe carries exactly its design storm. Below 1.0 = aged/undersized
// network that surcharges early (higher flood-risk, complaint-heavy zones);
// above 1.0 = relatively newer infrastructure with some headroom.
function pipeConditionFactor(zone: AtlantaZone) {
  const agePenalty = ((zone.floodRiskScore - 70) / 200) * 0.5;
  const complaintPenalty = zone.drainageComplaintCount / 1300;
  return clamp(1.12 - agePenalty - complaintPenalty, 0.8, 1.1);
}

function estimateRunoffCoefficient(zone: AtlantaZone) {
  return clamp(0.18 + zone.imperviousSurfacePercent / 110, 0.28, 0.92);
}

function calculateOverflowGallons(waterEnteringPipe: number, pipeCapacityGallons: number) {
  return Math.max(0, waterEnteringPipe - pipeCapacityGallons);
}

function estimateFloodRiskScore(
  overflowGallons: number,
  runoffVolumeGallons: number,
  baselineRisk: number,
  peakFlowPercentOfCapacity: number,
) {
  const overflowRatio = runoffVolumeGallons > 0 ? overflowGallons / runoffVolumeGallons : 0;
  const capacityPressure = Math.max(0, peakFlowPercentOfCapacity - 80) * 0.18;
  return Math.round(
    clamp(baselineRisk * 0.48 + overflowRatio * 58 + capacityPressure, 0, 100),
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
