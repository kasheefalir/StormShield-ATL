import { Fragment, useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
} from "react-leaflet";
import { divIcon } from "leaflet";
import routeEndpointData from "../data/routeEndpoints.json";
import stormwaterInfrastructureData from "../data/stormwaterInfrastructure.json";
import type {
  AtlantaZone,
  DroughtPrediction,
  RainfallScenario,
  RouteDestination,
  RouteEndpoint,
  StormwaterFailure,
  StormwaterInfrastructureFile,
  StormwaterTapPoint,
  WaterRoute,
} from "../types";
import { calculateScenarioRisk, getRiskColor, getRiskLabel } from "../lib/floodRiskModel";
import { RainAnimation } from "./RainAnimation";

type MapViewProps = {
  zones: AtlantaZone[];
  routes: WaterRoute[];
  scenario: RainfallScenario;
  droughtPrediction: DroughtPrediction;
  selectedZoneId: string;
  afterGsi: boolean;
  showRouting?: boolean;
  onZoneSelect: (zoneId: string) => void;
};

const destinationCoordinates: Record<string, [number, number]> = {
  bioswales: [33.7607, -84.4056],
  rainGardens: [33.7518, -84.3884],
  permeablePavement: [33.7566, -84.3824],
  retention: [33.7709, -84.3652],
  wetlands: [33.7068, -84.3931],
  parksTrees: [33.7853, -84.3735],
  riverRecharge: [33.8179, -84.4467],
  urbanFarms: [33.6922987, -84.3758957],
  reuseStorage: [33.7421, -84.4142],
  stormDrainOverflow: [33.7337, -84.3974],
};

const routeColor: Record<string, string> = {
  bioswales: "#16a34a",
  rainGardens: "#22c55e",
  permeablePavement: "#06b6d4",
  retention: "#0ea5e9",
  wetlands: "#0f766e",
  parksTrees: "#65a30d",
  riverRecharge: "#2563eb",
  urbanFarms: "#84cc16",
  reuseStorage: "#7c3aed",
  stormDrainOverflow: "#ef4444",
};

const destinationLabel: Record<string, string> = {
  bioswales: "Bioswales",
  rainGardens: "Rain gardens",
  permeablePavement: "Permeable pavement",
  retention: "Retention",
  wetlands: "Wetlands",
  parksTrees: "Parks + trees",
  riverRecharge: "Waterway recharge",
  urbanFarms: "Urban farm irrigation",
  reuseStorage: "Reuse storage",
  stormDrainOverflow: "Overflow",
};

const routeEndpoints = routeEndpointData as unknown as Record<string, RouteEndpoint[]>;
const stormwaterInfrastructure =
  stormwaterInfrastructureData as unknown as StormwaterInfrastructureFile;

export function MapView({
  zones,
  routes,
  scenario,
  droughtPrediction,
  selectedZoneId,
  afterGsi,
  showRouting = true,
  onZoneSelect,
}: MapViewProps) {
  const [detailZoneId, setDetailZoneId] = useState<string | null>(null);
  const rainfallIntensity = Math.max(0.2, scenario.rainfallInchesPerHour);
  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? zones[0];
  const zoneRiskData = zones.map((zone) => {
    const risk = calculateScenarioRisk(zone, scenario, droughtPrediction, afterGsi);

    return {
      zone,
      risk,
      color: getRiskColor(risk),
      riskLabel: getRiskLabel(risk),
    };
  });
  const topFloodZoneIds = new Set(
    [...zoneRiskData]
      .sort((a, b) => b.risk - a.risk)
      .slice(0, 3)
      .map(({ zone }) => zone.id),
  );
  const flowingRoutes = routes.filter(
    (route) => route.gallons > 0 && route.zoneId === selectedZoneId,
  );
  const selectedTapPoint = getTapPoint(selectedZoneId);
  const selectedFailures = getNearbyFailures(selectedZone, stormwaterInfrastructure.failures);
  const destinationTotals = flowingRoutes.reduce<Record<string, number>>((totals, route) => {
    totals[route.destination] = (totals[route.destination] ?? 0) + route.gallons;
    return totals;
  }, {});
  const directedDestinationTotals =
    afterGsi
      ? Object.fromEntries(
          Object.entries(destinationTotals).filter(
            ([destination]) => destination !== "stormDrainOverflow",
          ),
        )
      : destinationTotals;
  const maxDestinationGallons = Math.max(1, ...Object.values(directedDestinationTotals));
  const maxRouteGallons = Math.max(1, ...flowingRoutes.map((route) => route.gallons));
  const largestDestination =
    Object.entries(directedDestinationTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "retention";
  const selectedZoneRisk = zoneRiskData.find(({ zone }) => zone.id === selectedZoneId);
  const selectedRouteDetails = flowingRoutes
    .map((route) => ({
      route,
      endpoint: getRouteEndpoint(selectedZoneId, route.destination),
    }))
    .sort((a, b) => b.route.gallons - a.route.gallons);

  function handleZoneSelect(zoneId: string) {
    onZoneSelect(zoneId);
  }

  return (
    <section className="map-shell">
      <RainAnimation intensity={rainfallIntensity} scenarioId={scenario.id} />
      <MapContainer
        center={[33.759, -84.388]}
        className="atl-map"
        maxZoom={14}
        minZoom={10}
        scrollWheelZoom
        zoom={11}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {showRouting ? flowingRoutes
          .map((route) => {
            const zone = zones.find((item) => item.id === route.zoneId);
            if (!zone) return null;
            const endpoint = getRouteEndpoint(route.zoneId, route.destination);
            const destination = endpoint.coordinates;
            const tapPoint = getTapPoint(route.zoneId);
            const routePath = [zone.coordinates, destination];
            const visualDestinationGallons = getVisualDestinationGallons(
              route.destination,
              destinationTotals[route.destination] ?? 0,
              maxDestinationGallons,
              afterGsi,
            );
            const destinationShare =
              Math.min(1, visualDestinationGallons / maxDestinationGallons);
            const routeShare = Math.min(
              1,
              (route.destination === "stormDrainOverflow" && afterGsi
                ? route.gallons * 0.45
                : route.gallons) / maxRouteGallons,
            );
            const isLargestDestination = route.destination === largestDestination;
            const weight =
              1 + Math.sqrt(destinationShare) * 1.45 + Math.sqrt(routeShare) * 0.4;
            const arrowScale = 0.72 + Math.sqrt(destinationShare) * 0.36;
            const arrowOpacity = isLargestDestination ? 0.96 : 0.64;

            return (
              <Fragment key={`${route.zoneId}-${route.destination}-${route.priority}`}>
                <Polyline
                  eventHandlers={{
                    click: () => setDetailZoneId(route.zoneId),
                  }}
                  pathOptions={{
                    className: `route-line ${isLargestDestination ? "is-largest-flow" : ""}`,
                    color: routeColor[route.destination],
                    opacity: isLargestDestination ? 0.9 : 0.54,
                    weight: weight + (isLargestDestination ? 0.35 : 0),
                  }}
                  positions={routePath}
                >
                  <Tooltip className="bubble-tooltip" direction="top" offset={[0, -8]}>
                    <div className="tooltip-stack">
                      <strong>
                        {compactGallons(route.gallons)} to {endpoint.name}
                      </strong>
                      <span>Via {tapPoint?.name ?? "mapped drain access"}</span>
                      <small>{endpoint.reason}</small>
                    </div>
                  </Tooltip>
                </Polyline>
                <MovingRouteArrow
                  color={routeColor[route.destination]}
                  delayMs={route.priority * 850}
                  durationMs={isLargestDestination ? 7800 : 9400}
                  isLargest={isLargestDestination}
                  opacity={arrowOpacity}
                  path={routePath}
                  scale={arrowScale}
                />
              </Fragment>
            );
          }) : null}

        {showRouting ? selectedRouteDetails.map(({ route, endpoint }) => {
          const isLargestDestination = route.destination === largestDestination;
          const isWaterwayEndpoint = route.destination === "riverRecharge";
          const isFarmEndpoint = route.destination === "urbanFarms";

          return (
            <CircleMarker
              center={endpoint.coordinates}
              key={`${endpoint.id}-endpoint`}
              pathOptions={{
                className: `endpoint-marker ${isLargestDestination ? "is-largest-flow" : ""} ${
                  isWaterwayEndpoint ? "is-waterway" : ""
                } ${isFarmEndpoint ? "is-farm" : ""}`,
                color: isWaterwayEndpoint ? "#0369a1" : isFarmEndpoint ? "#3f6212" : routeColor[route.destination],
                fillColor: isWaterwayEndpoint ? "#7dd3fc" : isFarmEndpoint ? "#bef264" : "#ffffff",
                fillOpacity: isWaterwayEndpoint || isFarmEndpoint ? 0.74 : 0.94,
                opacity: 0.95,
                weight: isWaterwayEndpoint || isFarmEndpoint ? 4 : isLargestDestination ? 5 : 3,
              }}
              radius={isWaterwayEndpoint || isFarmEndpoint ? 15 : isLargestDestination ? 13 : 9}
            >
              <Tooltip className="bubble-tooltip" direction="top" offset={[0, -8]}>
                <div className="tooltip-stack">
                  <strong>
                    Drop off: {endpoint.name}
                  </strong>
                  <span>
                    {compactGallons(route.gallons)} routed to {endpoint.placeType}
                  </span>
                  <small>{endpoint.reason}</small>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        }) : null}

        {zoneRiskData.map(({ zone, risk, color, riskLabel }) => {
          const selected = selectedZoneId === zone.id;
          const isHotspot = risk >= 70 || topFloodZoneIds.has(zone.id);
          const radius = selected ? 21 : isHotspot ? 14 : 9;

          return (
            <CircleMarker
              center={zone.coordinates}
              eventHandlers={{
                click: () => handleZoneSelect(zone.id),
              }}
              key={zone.id}
              pathOptions={{
                className: `flood-halo ${selected ? "is-selected" : ""}`,
                color: selected ? "#082f49" : color,
                fillColor: color,
                fillOpacity: selected ? 0.9 : isHotspot ? 0.78 : 0.45,
                opacity: 0.95,
                weight: selected ? 5 : isHotspot ? 3 : 2,
              }}
              radius={radius}
            >
              {(selected || isHotspot) ? (
                <Tooltip
                  className="bubble-tooltip"
                  direction="top"
                  offset={[0, -8]}
                >
                  <div className="tooltip-stack">
                    <strong>{zone.name}</strong>
                    <span>
                      {selected
                        ? `${zone.drainageComplaintCount} complaints - route shown`
                        : `${riskLabel} hotspot`}
                    </span>
                    {!selected ? (
                      <small>{zone.drainageComplaintCount} drainage complaints</small>
                    ) : null}
                  </div>
                </Tooltip>
              ) : null}
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div className="map-legend dark-legend">
        <span className="legend-chip-dark" title="Managed risk"><i className="legend-dot managed" /><span>Managed</span></span>
        <span className="legend-chip-dark" title="High flood risk"><i className="legend-dot high" /><span>High Risk</span></span>
        <span className="legend-chip-dark" title="Severe flood risk"><i className="legend-dot severe" /><span>Severe</span></span>
        <span className="legend-sep" />
        <span className="legend-chip-dark complaint-chip" title="Drainage complaint count drives marker size">
          <i className="legend-dot severe" />
          <span>Marker size = complaint count</span>
        </span>
      </div>
      {detailZoneId ? (
        <aside className="map-detail-panel dark-detail-panel" aria-label="Selected flood source details">
          <button
            aria-label="Close selected area details"
            className="map-detail-close"
            onClick={() => setDetailZoneId(null)}
            type="button"
          >
            x
          </button>
          <div className="section-kicker">Clicked Flood Source</div>
          <h3>{selectedZone.name}</h3>
          <p>{selectedZone.runoffSource}</p>
          <div className="detail-metrics">
            <span>{selectedZone.drainageComplaintCount} complaints</span>
            <span>{selectedZone.imperviousSurfacePercent}% impervious</span>
            <span>{selectedZoneRisk?.riskLabel ?? "Risk"} risk</span>
          </div>
          <p>{selectedZone.sourceEvidence.complaintSummary}</p>
          <p>{selectedZone.sourceEvidence.waterSupplyReason}</p>
          <div className="route-explain-list">
            {selectedRouteDetails.slice(0, 4).map(({ route, endpoint }) => (
              <div className="route-explain-item" key={`${route.destination}-${endpoint.id}`}>
                <strong>
                  {compactGallons(route.gallons)} to {endpoint.name}
                </strong>
                <span>{endpoint.placeType}</span>
                <p>{endpoint.reason}</p>
              </div>
            ))}
          </div>
          {selectedTapPoint ? (
            <div className="route-explain-item tap-explain">
              <strong>Tap point: {selectedTapPoint.name}</strong>
              <span>{selectedTapPoint.accessType}</span>
              <p>{selectedTapPoint.lineContext}</p>
              <p>{selectedTapPoint.overflowRole}</p>
              <p>Confidence: {selectedTapPoint.confidence}</p>
            </div>
          ) : null}
          <div className="route-explain-list">
            <div className="section-kicker">Nearby Imported Failures</div>
            {selectedFailures.length ? (
              selectedFailures.map((failure) => (
                <div className="route-explain-item" key={failure.id}>
                  <strong>{failure.failureType}: {failure.locationName}</strong>
                  <span>{failure.year} - {failure.address}</span>
                  <p>{failure.notes || "Imported ARC stormwater failure record."}</p>
                </div>
              ))
            ) : (
              <p>No ARC stormwater failure points are within the selected zone radius.</p>
            )}
          </div>
        </aside>
      ) : null}
    </section>
  );
}

function getRouteEndpoint(zoneId: string, destination: RouteDestination): RouteEndpoint {
  const endpoint = routeEndpoints[zoneId]?.find((item) => item.destination === destination);

  if (endpoint) return endpoint;

  return {
    id: `${zoneId}-${destination}-fallback`,
    destination,
    name: destinationLabel[destination],
    coordinates: destinationCoordinates[destination],
    placeType: "mapped GSI endpoint",
    reason: "Fallback endpoint used when a zone-specific receiving place is not defined.",
  };
}

function MovingRouteArrow({
  color,
  delayMs,
  durationMs,
  isLargest,
  opacity,
  path,
  scale,
}: {
  color: string;
  delayMs: number;
  durationMs: number;
  isLargest: boolean;
  opacity: number;
  path: [number, number][];
  scale: number;
}) {
  const [progress, setProgress] = useState(0);
  const position = interpolatePath(path, progress);
  const rotation = getPathBearing(path, progress) - 90;
  const icon = useMemo(
    () =>
      divIcon({
        className: "water-arrow-icon",
        html: `<span class="water-arrow-track" style="--arrow-rotation: ${rotation}deg;"><span class="water-arrow ${
          isLargest ? "is-largest-flow" : ""
        }" style="--arrow-color: ${color}; --arrow-scale: ${scale}; --arrow-opacity: ${opacity};"></span></span>`,
        iconAnchor: [36, 18],
        iconSize: [72, 36],
      }),
    [color, isLargest, opacity, rotation, scale],
  );

  useEffect(() => {
    let frameId = 0;

    function animate(time: number) {
      const loopProgress = ((time + delayMs) % durationMs) / durationMs;
      setProgress(loopProgress);
      frameId = window.requestAnimationFrame(animate);
    }

    frameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(frameId);
  }, [delayMs, durationMs]);

  return (
    <Marker
      icon={icon}
      interactive={false}
      position={position}
    />
  );
}

function getTapPoint(zoneId: string): StormwaterTapPoint | undefined {
  return stormwaterInfrastructure.tapPoints.find((tapPoint) => tapPoint.zoneId === zoneId);
}

function getNearbyFailures(zone: AtlantaZone, failures: StormwaterFailure[]) {
  const nearby = failures
    .map((failure) => ({
      failure,
      miles: distanceMiles(zone.coordinates, failure.coordinates),
    }))
    .filter(({ miles }) => miles <= 2.75)
    .sort((a, b) => a.miles - b.miles)
    .map(({ failure }) => failure);

  if (nearby.length) return nearby.slice(0, 4);

  return failures
    .map((failure) => ({
      failure,
      miles: distanceMiles(zone.coordinates, failure.coordinates),
    }))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, 2)
    .map(({ failure }) => failure);
}

function getVisualDestinationGallons(
  destination: string,
  gallons: number,
  maxDirectedGallons: number,
  afterGsi: boolean,
) {
  if (afterGsi && destination === "stormDrainOverflow") {
    return Math.min(gallons * 0.45, maxDirectedGallons * 0.72);
  }

  return gallons;
}

function compactGallons(gallons: number) {
  if (gallons >= 1000000) return `${(gallons / 1000000).toFixed(1)}M gal`;
  if (gallons >= 1000) return `${Math.round(gallons / 1000)}k gal`;
  return `${gallons} gal`;
}

function interpolateCoordinate(
  start: [number, number],
  end: [number, number],
  progress: number,
): [number, number] {
  return [
    start[0] + (end[0] - start[0]) * progress,
    start[1] + (end[1] - start[1]) * progress,
  ];
}

function interpolatePath(path: [number, number][], progress: number): [number, number] {
  if (path.length <= 1) return path[0] ?? [0, 0];
  if (path.length === 2) return interpolateCoordinate(path[0], path[1], progress);

  const segmentCount = path.length - 1;
  const scaledProgress = Math.min(0.999, Math.max(0, progress)) * segmentCount;
  const segmentIndex = Math.min(segmentCount - 1, Math.floor(scaledProgress));
  const segmentProgress = scaledProgress - segmentIndex;

  return interpolateCoordinate(path[segmentIndex], path[segmentIndex + 1], segmentProgress);
}

function getPathBearing(path: [number, number][], progress: number) {
  if (path.length <= 1) return 0;
  if (path.length === 2) return getBearingDegrees(path[0], path[1]);

  const segmentCount = path.length - 1;
  const scaledProgress = Math.min(0.999, Math.max(0, progress)) * segmentCount;
  const segmentIndex = Math.min(segmentCount - 1, Math.floor(scaledProgress));

  return getBearingDegrees(path[segmentIndex], path[segmentIndex + 1]);
}

function getBearingDegrees(start: [number, number], end: [number, number]) {
  const startLat = toRadians(start[0]);
  const endLat = toRadians(end[0]);
  const longitudeDelta = toRadians(end[1] - start[1]);

  const y = Math.sin(longitudeDelta) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(longitudeDelta);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function distanceMiles(start: [number, number], end: [number, number]) {
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = toRadians(end[0] - start[0]);
  const longitudeDelta = toRadians(end[1] - start[1]);
  const startLatitude = toRadians(start[0]);
  const endLatitude = toRadians(end[0]);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMiles * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function toDegrees(value: number) {
  return (value * 180) / Math.PI;
}
