import { ArrowRight, Waves } from "lucide-react";
import type { WaterRoute } from "../types";

type WaterFlowSimulationProps = {
  routes: WaterRoute[];
  selectedZoneId: string;
};

const labelByDestination: Record<string, string> = {
  bioswales: "Bioswales",
  rainGardens: "Garden soak-in",
  permeablePavement: "Permeable pavement",
  retention: "Park detention",
  wetlands: "Wetlands",
  parksTrees: "Parks + trees",
  riverRecharge: "Waterway recharge",
  urbanFarms: "Urban farm irrigation",
  reuseStorage: "Stored excess",
  stormDrainOverflow: "Overflow",
};

export function WaterFlowSimulation({
  routes,
  selectedZoneId,
}: WaterFlowSimulationProps) {
  const zoneRoutes = routes
    .filter((route) => route.zoneId === selectedZoneId && route.gallons > 0)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 4);

  return (
    <div className="panel-section flow-section">
      <div className="section-row">
        <div>
          <div className="section-kicker">Water Routing</div>
          <h3>Smart flow path</h3>
        </div>
        <Waves size={20} />
      </div>
      <div className="flow-list">
        {zoneRoutes.map((route) => (
          <div className="flow-step" key={`${route.zoneId}-${route.destination}-${route.priority}`}>
            <div className="flow-priority">{route.priority}</div>
            <div>
              <strong>{labelByDestination[route.destination]}</strong>
              <p>{route.label}</p>
            </div>
            <ArrowRight size={16} />
            <span>{compactGallons(route.gallons)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function compactGallons(gallons: number) {
  if (gallons >= 1000000) return `${(gallons / 1000000).toFixed(1)}M gal`;
  if (gallons >= 1000) return `${Math.round(gallons / 1000)}k gal`;
  return `${gallons} gal`;
}
