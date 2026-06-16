# StormShield ATL

**StormShield ATL: Smart Green Infrastructure for Flood Resilience and Water Reuse**

StormShield ATL is a hackathon-ready civic-tech demo that visualizes how smart green stormwater infrastructure can absorb, slow, store, redirect, and reuse stormwater before it floods Atlanta homes and streets.

## Hackathon Track

Climate resilience, civic technology, urban infrastructure, environmental justice, and water reuse.

## Problem Statement

Atlanta's aging stormwater infrastructure is not built for increasingly intense rainfall. Paved surfaces, low-lying neighborhoods, and overloaded drainage systems can push runoff toward homes, streets, and creeks faster than gray infrastructure can handle it. At the same time, hotter and drier periods create a need to conserve captured water for trees, parks, gardens, wetlands, and stream health.

## Solution

StormShield ATL combines a map-based risk dashboard, scenario controls, rule-based routing, drought prediction, and impact estimates. The MVP uses mock data to show where flooding is likely, what green stormwater infrastructure fits each zone, and how captured runoff can be redirected for flood prevention or drought response.

The zone-detail demo includes a combined **Smart Storage Network** solution. It merges sensors, smart valves, underground detention/storage, and slow release into one strategy: when pipe utilization nears overload, the valve diverts excess peak stormwater into underground storage; after the storm peak passes, stored water is released slowly or routed for reuse.

## Features

- Interactive Atlanta-focused Leaflet map with zone markers
- Color and marker size based on scenario-adjusted flood risk
- Rainfall animation for normal rain, extreme storms, drought mode, and predicted drought
- Animated water routing lines toward a fixed demo set: park detention, river or creek recharge, garden soak-in, and stored excess water
- Before/after toggle for baseline risk versus GSI plus smart routing
- Two-year Atlanta rainfall history timeline using local Open-Meteo archive data
- AI drought routing switch that keeps the same destinations but shifts more gallons toward river and creek baseflow recharge
- Mock drought prediction model based on rainfall, temperature, soil moisture, and dry days
- Simplified impact stats for captured gallons, park detention, river recharge, garden soak-in, and stored excess water
- Reusable intervention cards for recommended GSI strategies
- Smart Storage Network demo combining overload sensors, valves, underground detention, and slow release
- Local JSON data for zones, scenarios, and interventions

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Leaflet and React Leaflet
- Recharts
- Lucide React icons
- Local JSON demo data
- Open-Meteo historical rainfall archive exported to local JSON
- Atlanta Regional Commission stormwater failure records imported from ArcGIS FeatureServer

## Run Locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite, usually:

```text
http://localhost:5173
```

Build for production:

```bash
npm run build
```

## Project Structure

```text
stormshield-atl/
  public/
  src/
    components/
      MapView.tsx
      RainAnimation.tsx
      WaterFlowSimulation.tsx
      ScenarioToggle.tsx
      StatsPanel.tsx
      InterventionCard.tsx
      TimelineControls.tsx
    data/
      atlantaZones.json
      rainfallScenarios.json
      gsiInterventions.json
    lib/
      floodRiskModel.ts
      waterRoutingEngine.ts
      droughtPredictionModel.ts
      impactCalculator.ts
    types/
      index.ts
    App.tsx
    main.tsx
    index.css
  README.md
  package.json
  .gitignore
```

## Demo Data Notes

The rainfall timeline uses Open-Meteo historical daily precipitation and temperature data for Atlanta from `2024-06-15` through `2026-06-14`, stored in `src/data/rainfallHistory.json`. Routing fields such as soil moisture estimate, drought-watch category, and routing preference are StormShield ATL demo derivations.

Stormwater infrastructure evidence uses the Atlanta Regional Commission / Metropolitan North Georgia Water Planning District public `Stormwater_Failures` FeatureServer, normalized into `src/data/stormwaterInfrastructure.json`. The imported records are real reported stormwater failures, but they are not a full city pipe, inlet, or manhole inventory. Tap/diversion points in the same file are modeled access points tied to known Atlanta drainage corridors and should be replaced with official City of Atlanta stormwater asset data when available.

The hydrology models are still intentionally approximate for hackathon storytelling. The formulas in `impactCalculator.ts`, `floodRiskModel.ts`, `waterRoutingEngine.ts`, and `droughtPredictionModel.ts` are designed to be easy to explain and replace later with real hydrology, GIS, and infrastructure data.

The zone analysis panel uses `src/lib/hydrologyModel.ts` for planning estimates:
runoff volume is estimated as `rainfallInches * drainageAreaSqFt * runoffCoefficient * 0.623`,
pipe overflow is estimated as `max(0, waterEnteringPipe - pipeCapacityGallons)`, and GSI impacts
are shown as estimated ranges. These calculations are presentation-grade only and should be replaced
with EPA SWMM, HEC-HMS, surveyed drainage areas, pipe network hydraulics, and local engineering
models before design or procurement decisions.

GSI default ranges live in `src/data/gsiSolutions.json`. They are source-backed planning ranges
based on EPA green infrastructure practice guidance, EPA stormwater modeling references, and common
stormwater BMP design assumptions. The UI labels these values as estimated ranges.

For demonstration clarity, the map now uses a fixed destination set instead of changing route categories during playback. Destination anchors are based on local Atlanta places and public references, including Historic Fourth Ward Park's 2-acre lake/stormwater retention basin, Rodney Cook Sr. Park / City of Atlanta Watershed Management, Proctor Creek / Chattahoochee recharge context, and Drought.gov's Georgia drought monitor context. Rainfall changes the gallon amounts; the route categories stay stable for presentation.

The active route endpoints in `src/data/routeEndpoints.json` were audited against visible real-world anchors using OpenStreetMap/Nominatim and Overpass waterway data. Active demo arrows now route to named parks, documented storage/reuse anchors, visible lakes/basins, or mapped stream/river reaches instead of modeled street points.

Urban farm routing is modeled as stored reuse, not raw overflow irrigation. The demo sends a managed reuse share to the Urban Food Forest at Browns Mill for eligible southeast/south Atlanta zones. Cost-wise, the preferred strategy is to capture water near flood-prone streets, use gravity or short conveyance where possible, store it in modular underground storage or basins, and release it for nearby irrigation demand. Long dedicated pipes from every overflow zone to a distant farm would usually be harder to justify than distributed storage plus targeted reuse.

## Future Data Sources To Add

- NOAA rainfall data
- Atlanta watershed and stormwater GIS data
- Official City of Atlanta storm drain, inlet, manhole, pipe, and outfall inventory
- Atlanta 311 drainage complaints
- FEMA flood maps
- USGS stream gauge data
- Impervious surface datasets
- Elevation and slope data
- Tree canopy and urban heat island data

## Future Improvements

1. Connect real GIS layers and watershed boundaries for more accurate routing.
2. Replace demo formulas with calibrated hydrology and storage-capacity models.
3. Add exportable scenario reports for city staff, community groups, and hackathon judges.

## Screenshots

Add screenshots or a short demo GIF here after running the project locally.

## Team

Add team members, roles, acknowledgments, and hackathon submission links here.
