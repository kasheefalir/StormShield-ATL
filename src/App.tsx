import { useEffect, useMemo, useState } from "react";
import { Shield, AlertTriangle, Droplets, MousePointerClick, Play, Pause } from "lucide-react";
import atlantaZones from "./data/atlantaZones.json";
import rainfallHistory from "./data/rainfallHistory.json";
import gsiInterventions from "./data/gsiInterventions.json";
import { MapView } from "./components/MapView";
import { ClimateTechZoneDetail } from "./components/ClimateTechZoneDetail";
import { predictDrought } from "./lib/droughtPredictionModel";
import { routeWaterForScenario } from "./lib/waterRoutingEngine";
import type {
  AtlantaZone,
  GsiIntervention,
  RainfallHistoryFile,
  RainfallRecord,
  RainfallScenario,
} from "./types";

const allZones = atlantaZones as AtlantaZone[];
// Narrow to documented high-complaint flood zones (floodRiskScore >= 70)
const zones = allZones.filter((z) => z.floodRiskScore >= 70);
const rainHistory = rainfallHistory as RainfallHistoryFile;
const rainRecords = rainHistory.records;
const interventions = gsiInterventions as GsiIntervention[];

const TOTAL_COMPLAINTS = zones.reduce((sum, z) => sum + z.drainageComplaintCount, 0);

function App() {
  const [rainIndex, setRainIndex] = useState(rainRecords.length - 1);
  const [selectedZoneId, setSelectedZoneId] = useState(zones[0].id);
  const [analysisZoneId, setAnalysisZoneId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const selectedRainRecord = rainRecords[rainIndex] ?? rainRecords[rainRecords.length - 1];

  const scenario = useMemo(
    () => scenarioFromRainRecord(selectedRainRecord, false),
    [selectedRainRecord],
  );

  const analysisZone = useMemo(
    () => zones.find((zone) => zone.id === analysisZoneId) ?? null,
    [analysisZoneId],
  );

  const droughtPrediction = useMemo(() => predictDrought(scenario), [scenario]);

  const fullRoutes = useMemo(
    () =>
      routeWaterForScenario(
        allZones,
        interventions,
        scenario,
        droughtPrediction,
        selectedZoneId,
      ),
    [scenario, droughtPrediction, selectedZoneId],
  );

  const visibleRoutes = useMemo(
    () => fullRoutes.map((route) => ({ ...route, gallons: Math.round(route.gallons * 1) })),
    [fullRoutes],
  );

  useEffect(() => {
    if (!isPlaying) return;
    const intervalId = window.setInterval(() => {
      setRainIndex((current) => (current >= rainRecords.length - 1 ? 0 : current + 1));
    }, 2200);
    return () => window.clearInterval(intervalId);
  }, [isPlaying]);

  function handleZoneSelect(zoneId: string) {
    setSelectedZoneId(zoneId);
    setAnalysisZoneId(zoneId);
  }

  const categoryLabel = labelFromRecord(selectedRainRecord, false);

  return (
    <div className="flood-map-fullscreen">
      {/* Floating cyberpunk header */}
      <header className="flood-map-header">
        {/* Brand */}
        <div className="flood-map-brand">
          <div className="flood-map-logo-box">
            <Shield size={14} color="#040d1a" strokeWidth={2.5} />
          </div>
          <div>
            <span className="flood-map-brand-label">STORMSHIELD ATL</span>
            <span className="flood-map-brand-tagline">Infrastructure Intelligence</span>
          </div>
        </div>

        {/* Center title */}
        <div className="flood-map-center">
          <h1 className="flood-map-title">Flood Complaint Areas</h1>
          <span className="flood-map-subtitle">Atlanta Documented High-Risk Stormwater Zones</span>
        </div>

        {/* Right stats + controls */}
        <div className="flood-map-header-right">
          <div className="flood-map-stat">
            <AlertTriangle size={12} />
            <span>{zones.length} HIGH-RISK ZONES</span>
          </div>
          <div className="flood-map-stat">
            <span style={{ color: "#ef4444" }}>▲</span>
            <span>{TOTAL_COMPLAINTS} 311 COMPLAINTS (DEMO)</span>
          </div>
          <div className="flood-map-stat rain-stat">
            <Droplets size={12} />
            <span>
              {selectedRainRecord.precipitationInches.toFixed(2)}"
              &nbsp;·&nbsp;
              {selectedRainRecord.date}
              &nbsp;·&nbsp;
              {categoryLabel}
            </span>
            <button
              className="flood-map-play-btn"
              onClick={() => setIsPlaying((p) => !p)}
              title={isPlaying ? "Pause rain timeline" : "Play rain timeline"}
            >
              {isPlaying ? <Pause size={10} /> : <Play size={10} />}
            </button>
          </div>
          <div className="flood-map-demo-badge">
            <span>DEMO</span>
          </div>
        </div>
      </header>

      {/* System alert ribbon */}
      <div className="flood-map-alert-ribbon">
        <span className="flood-map-alert-dot" />
        <span>SIMULATED ANALYSIS</span>
        <span className="flood-map-alert-sep">·</span>
        <span>
          {zones.filter((z) => z.floodRiskScore >= 85).length} critical zones
        </span>
        <span className="flood-map-alert-sep">·</span>
        <span>Combined sewer system 95–130 yrs old</span>
        <span className="flood-map-alert-sep">·</span>
        <span>Complaint data patterned after Atlanta 311 records</span>
        <span className="flood-map-alert-sep">·</span>
        <span>Click any zone for GSI analysis</span>
      </div>

      {/* Full-viewport Leaflet map */}
      <MapView
        afterGsi={false}
        droughtPrediction={droughtPrediction}
        onZoneSelect={handleZoneSelect}
        routes={visibleRoutes}
        scenario={scenario}
        selectedZoneId={selectedZoneId}
        showRouting={false}
        zones={zones}
      />

      {/* Click prompt – shown when no overlay is open */}
      {!analysisZone && (
        <div className="flood-map-click-prompt">
          <MousePointerClick size={13} />
          <span>Click a flood zone to analyze GSI solutions</span>
        </div>
      )}

      {/* Zone detail overlay */}
      {analysisZone ? (
        <ClimateTechZoneDetail
          onClose={() => setAnalysisZoneId(null)}
          scenario={scenario}
          selectedZone={analysisZone}
        />
      ) : null}
    </div>
  );
}

export default App;

function scenarioFromRainRecord(
  record: RainfallRecord,
  aiDroughtShift: boolean,
): RainfallScenario {
  const droughtLike =
    record.eventCategory === "drought-watch" ||
    record.daysSinceLastRain >= 12 ||
    record.soilMoisturePercent < 32;
  const availableRainfall =
    record.precipitationInches > 0
      ? record.precipitationInches
      : droughtLike
        ? Math.min(0.35, Math.max(0.05, record.recentRainfallInches / 7))
        : 0.02;
  const routingPreference = aiDroughtShift ? "proactive-drought" : record.routingPreference;
  const id =
    routingPreference === "proactive-drought"
      ? "ai-predicted-drought"
      : routingPreference === "drought-recharge"
        ? "drought-mode"
        : record.eventCategory === "extreme-rain"
          ? "extreme-storm"
          : "normal-rain";

  return {
    id,
    label: labelFromRecord(record, aiDroughtShift),
    rainfallInchesPerHour: Math.max(0.02, record.rainfallInchesPerHour),
    totalRainfallInches: availableRainfall,
    durationHours: record.precipitationInches >= 1.5 ? 6 : record.precipitationInches > 0 ? 4 : 2,
    recentRainfallInches: record.recentRainfallInches,
    averageTemperature: record.averageTemperature,
    soilMoisturePercent: record.soilMoisturePercent,
    daysSinceLastRain: record.daysSinceLastRain,
    routingPreference,
    description: `Open-Meteo historical rainfall for Atlanta on ${record.date}: ${record.precipitationInches.toFixed(
      2,
    )} inches, ${record.recentRainfallInches.toFixed(2)} inches in the prior 7 days, and ${record.daysSinceLastRain} dry days.`,
  };
}

function labelFromRecord(record: RainfallRecord, aiDroughtShift: boolean) {
  if (aiDroughtShift) return "AI Drought Shift";
  if (record.eventCategory === "extreme-rain") return "Extreme Rain";
  if (record.eventCategory === "heavy-rain") return "Heavy Rain";
  if (record.eventCategory === "drought-watch") return "Drought Watch";
  if (record.eventCategory === "dry-day") return "Dry Day";
  return "Normal Rain";
}
