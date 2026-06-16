import { CheckCircle2 } from "lucide-react";
import type { AtlantaZone, GsiIntervention } from "../types";

type InterventionCardProps = {
  intervention: GsiIntervention;
  selectedZone?: AtlantaZone;
  isPrimary: boolean;
};

export function InterventionCard({
  intervention,
  selectedZone,
  isPrimary,
}: InterventionCardProps) {
  const reason = selectedZone
    ? buildReason(selectedZone, intervention.name, isPrimary)
    : "Select a zone on the map to see why this recommendation fits local risk conditions.";

  return (
    <article className={`intervention-card ${isPrimary ? "is-primary" : ""}`}>
      <div className="intervention-header">
        <div>
          <p>{isPrimary ? "Primary recommendation" : "Support option"}</p>
          <h4>{intervention.name}</h4>
        </div>
        {isPrimary ? <CheckCircle2 size={19} /> : null}
      </div>
      <p className="intervention-use">{intervention.bestUseCase}</p>
      <div className="intervention-meta">
        <span>Cost: {intervention.estimatedCostLevel}</span>
        <span>Care: {intervention.maintenanceLevel}</span>
      </div>
      <strong>{intervention.waterImpact}</strong>
      <p className="recommendation-reason">{reason}</p>
    </article>
  );
}

function buildReason(zone: AtlantaZone, interventionName: string, isPrimary: boolean) {
  const paved =
    zone.imperviousSurfacePercent >= 70
      ? "high impervious cover"
      : "mixed pavement and open-space conditions";
  const risk = zone.floodRiskScore >= 80 ? "severe flood pressure" : "localized runoff pressure";

  return `${interventionName} ${isPrimary ? "leads" : "supports"} the plan for ${zone.name} because ${paved}, ${risk}, and ${zone.drainageComplaintCount} drainage complaints point to a need for distributed capture.`;
}
