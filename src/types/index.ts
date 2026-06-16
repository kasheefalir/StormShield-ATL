export type ScenarioId =
  | "normal-rain"
  | "extreme-storm"
  | "drought-mode"
  | "ai-predicted-drought";

export type InterventionId =
  | "bioswale"
  | "rain-garden"
  | "permeable-pavement"
  | "tree-trench"
  | "retention-pond"
  | "wetland"
  | "smart-storage-network";

export type RecommendedGsi = {
  primary: InterventionId;
  secondary: InterventionId[];
};

export type AtlantaZone = {
  id: string;
  name: string;
  neighborhoodType: string;
  coordinates: [number, number];
  runoffSource: string;
  sourceEvidence: {
    complaintDataset: string;
    complaintSummary: string;
    complaintTypes: string[];
    waterSupplyReason: string;
  };
  floodRiskScore: number;
  imperviousSurfacePercent: number;
  elevationRisk: number;
  drainageComplaintCount: number;
  roadDensityScore: number;
  availableLandScore: number;
  soilInfiltrationScore: number;
  treeCanopyPercent: number;
  slopeRiskScore: number;
  roofCapturePotential: number;
  storagePotential: number;
  maintenanceCapacityScore: number;
  vulnerablePopulationScore: number;
  currentWaterLevel: number;
  storageCapacityGallons: number;
  nearbyAssets: string[];
  recommendedGsi: RecommendedGsi;
};

export type RainfallScenario = {
  id: ScenarioId;
  label: string;
  rainfallInchesPerHour: number;
  totalRainfallInches: number;
  durationHours: number;
  recentRainfallInches: number;
  averageTemperature: number;
  soilMoisturePercent: number;
  daysSinceLastRain: number;
  routingPreference: "balanced" | "flood-prevention" | "drought-recharge" | "proactive-drought";
  description: string;
};

export type RainfallRecord = {
  date: string;
  precipitationInches: number;
  rainfallInchesPerHour: number;
  recentRainfallInches: number;
  rolling30DayRainfallInches: number;
  averageTemperature: number;
  maxTemperature: number;
  soilMoisturePercent: number;
  daysSinceLastRain: number;
  eventCategory: "dry-day" | "normal-rain" | "heavy-rain" | "extreme-rain" | "drought-watch";
  routingPreference: RainfallScenario["routingPreference"];
};

export type RainfallHistoryFile = {
  source: {
    provider: string;
    url: string;
    latitude: number;
    longitude: number;
    timezone: string;
    retrievedAt: string;
    note: string;
  };
  records: RainfallRecord[];
};

export type GsiIntervention = {
  id: InterventionId;
  name: string;
  bestUseCase: string;
  estimatedCostLevel: "Low" | "Medium" | "High";
  waterImpact: string;
  maintenanceLevel: "Low" | "Medium" | "High";
  captureEfficiency: number;
  droughtBenefit: number;
};

export type DroughtPrediction = {
  droughtProbability: number;
  predictedCondition: "normal" | "watch" | "drought";
  recommendation: string;
};

export type RouteDestination =
  | "bioswales"
  | "rainGardens"
  | "permeablePavement"
  | "retention"
  | "wetlands"
  | "parksTrees"
  | "riverRecharge"
  | "urbanFarms"
  | "reuseStorage"
  | "stormDrainOverflow";

export type WaterRoute = {
  zoneId: string;
  destination: RouteDestination;
  gallons: number;
  priority: number;
  label: string;
};

export type RouteEndpoint = {
  id: string;
  destination: RouteDestination;
  name: string;
  coordinates: [number, number];
  placeType: string;
  reason: string;
  droughtPriority?: boolean;
};

export type StormwaterFailure = {
  id: string;
  locationName: string;
  address: string;
  failureType: string;
  year: string;
  date: string | null;
  city: string;
  county: string;
  source: string;
  notes: string;
  coordinates: [number, number];
};

export type StormwaterTapPoint = {
  id: string;
  zoneId: string;
  name: string;
  coordinates: [number, number];
  accessType: string;
  lineContext: string;
  overflowRole: string;
  divertsTo: RouteDestination[];
  confidence: string;
};

export type StormwaterInfrastructureFile = {
  source: {
    name: string;
    provider: string;
    url: string;
    serviceItemId: string;
    importedAt: string;
    note: string;
  };
  failures: StormwaterFailure[];
  tapPoints: StormwaterTapPoint[];
};

export type ImpactStats = {
  gallonsCaptured: number;
  gallonsRedirectedAwayFromStreets: number;
  gallonsSentToWetlands: number;
  gallonsSentToParksTrees: number;
  gallonsSentToRainGardens: number;
  gallonsSentToRiverRecharge: number;
  gallonsSentToUrbanFarms: number;
  gallonsStoredForReuse: number;
  floodRiskReductionPercent: number;
  co2SupportedPounds: number;
  coolingBenefitDegreesF: number;
  homesProtected: number;
  streetSegmentsProtected: number;
};
