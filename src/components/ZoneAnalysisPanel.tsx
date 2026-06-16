import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Droplets,
  Leaf,
  MoveDown,
  MoveRight,
  Waves,
} from "lucide-react";
import gsiSolutionData from "../data/gsiSolutions.json";
import {
  estimateGsiPlanningImpact,
  estimatePipeCapacityGallons,
  estimateZoneHydrology,
} from "../lib/hydrologyModel";
import {
  analyzeSuitability,
  type PlausibilityStatus,
  type SuitabilityResult,
} from "../lib/suitabilityModel";
import type { AtlantaZone, InterventionId, RainfallScenario } from "../types";

type GsiSolution = {
  id: InterventionId;
  name: string;
  minCapturePercent: number;
  maxCapturePercent: number;
  minPeakFlowReductionPercent: number;
  maxPeakFlowReductionPercent: number;
  bestFor: string[];
  notGoodFor: string[];
  maintenanceNeeds: string;
  sourceNote: string;
};

type SolutionAnalysis = {
  solution: GsiSolution;
  suitabilityScore: number;
  whyViable: string;
  siteConstraints: string[];
  estimatedCapturedRange: [number, number];
  estimatedSlowedRange: [number, number];
  estimatedInfiltratedRange: [number, number];
  estimatedPeakFlowReductionRange: [number, number];
  remainingSewerRange: [number, number];
  remainingOverflowRange: [number, number];
  planningImpact: ReturnType<typeof estimateGsiPlanningImpact>;
  plausibilityStatus: PlausibilityStatus;
  whyMayNotWork: string;
  suitabilityFactors: SuitabilityResult["factors"];
};

const gsiSolutions = gsiSolutionData as GsiSolution[];
const demoGsiSolutions = gsiSolutions.filter(({ id }) => id !== "wetland");

export function ZoneAnalysisPanel({
  scenario,
  selectedZone,
}: {
  scenario: RainfallScenario;
  selectedZone: AtlantaZone;
}) {
  const [selectedSolutionId, setSelectedSolutionId] = useState<InterventionId>(
    getInitialSolutionId(selectedZone),
  );
  const [systemMode, setSystemMode] = useState<"current" | "after">("current");

  useEffect(() => {
    setSelectedSolutionId(getInitialSolutionId(selectedZone));
    setSystemMode("current");
  }, [selectedZone.id, selectedZone.recommendedGsi.primary]);

  const currentHydrology = useMemo(
    () => estimateZoneHydrology(selectedZone, scenario),
    [scenario, selectedZone],
  );
  const solutionAnalyses = useMemo(
    () =>
      gsiSolutions
        .filter(({ id }) => id !== "wetland")
        .map((solution) => analyzeSolution(selectedZone, scenario, solution))
        .sort((a, b) => b.suitabilityScore - a.suitabilityScore),
    [scenario, selectedZone],
  );
  const selectedAnalysis =
    solutionAnalyses.find(({ solution }) => solution.id === selectedSolutionId) ??
    solutionAnalyses[0];
  const selectedImpact = selectedAnalysis.planningImpact;
  const targetPeakFlow = getDemoPeakFlowTarget(selectedAnalysis.solution.id);

  return (
    <section className="zone-analysis-panel" aria-label="Detailed zone analysis">
      <div className="detail-workspace">
        <div className="detail-main-column">
          <div className="analysis-message scene-title-card">
            <div className="back-copy">← Back to Map</div>
            <h2>{selectedZone.name}</h2>
            <div className="zone-risk-pills">
              <span className="risk-high">High Flood Risk</span>
              <span>{selectedZone.imperviousSurfacePercent}% Impervious</span>
              <span>{selectedZone.drainageComplaintCount} Complaints</span>
            </div>
          </div>

          <section className="analysis-card animation-stage-card">
            <div className="analysis-section-row">
              <div>
                <div className="section-kicker">Visual Demo</div>
                <h3>
                  {systemMode === "current"
                    ? "Street overflow under the current system"
                    : `${selectedAnalysis.solution.name} reduces the storm peak`}
                </h3>
              </div>
              <div className="analysis-toggle" role="tablist" aria-label="Animation mode">
                <button
                  aria-selected={systemMode === "current"}
                  className={systemMode === "current" ? "is-active" : ""}
                  onClick={() => setSystemMode("current")}
                  role="tab"
                  type="button"
                >
                  Current System
                </button>
                <button
                  aria-selected={systemMode === "after"}
                  className={systemMode === "after" ? "is-active" : ""}
                  onClick={() => setSystemMode("after")}
                  role="tab"
                  type="button"
                >
                  With Selected GSI
                </button>
              </div>
            </div>
            <FloodStreetAnimation
              afterPeakPercent={targetPeakFlow}
              mode={systemMode}
              reductionRange={selectedAnalysis.estimatedPeakFlowReductionRange}
              solutionId={selectedAnalysis.solution.id}
              solutionName={selectedAnalysis.solution.name}
            />
            <FlowLegend />
          </section>

          <div className="simulation-strip">
            <button aria-label="Pause simulation" type="button">Ⅱ</button>
            <span>Simulation Speed</span>
            <strong>1.0x</strong>
            <div><i /></div>
            <time>00:14 / 00:30</time>
          </div>
        </div>

        <ZoneStatusPanel
          currentHydrology={currentHydrology}
          scenario={scenario}
          selectedAnalysis={selectedAnalysis}
          selectedZone={selectedZone}
          systemMode={systemMode}
          targetPeakFlow={targetPeakFlow}
        />
      </div>

      <section className="analysis-card">
        <div className="analysis-section-row">
          <div>
            <div className="section-kicker">Choose The Fix</div>
            <h3>Select a GSI option to change the animation</h3>
          </div>
          <span className="estimate-pill">Typical ranges are estimated</span>
        </div>
        <div className="solution-tabs" role="tablist" aria-label="GSI solutions">
          {solutionAnalyses.map((analysis) => (
            <button
              aria-selected={analysis.solution.id === selectedAnalysis.solution.id}
              className={`solution-tab ${
                analysis.solution.id === selectedAnalysis.solution.id ? "is-selected" : ""
              }`}
              key={analysis.solution.id}
              onClick={() => setSelectedSolutionId(analysis.solution.id)}
              role="tab"
              type="button"
            >
              <strong>{analysis.solution.name}</strong>
              <span>{analysis.plausibilityStatus}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="animation-support-grid">
        <section className="analysis-card solution-story-card">
          <div className="section-kicker">What Changes Visually</div>
          <h3>{selectedAnalysis.solution.name}</h3>
          <div className={`plausibility-pill ${statusClass(selectedAnalysis.plausibilityStatus)}`}>
            {selectedAnalysis.plausibilityStatus} · {selectedAnalysis.suitabilityScore}/100 suitability
          </div>
          <p>
            <strong>Why it works here:</strong> {selectedAnalysis.whyViable}
          </p>
          <p>
            <strong>Why it may not work here:</strong> {selectedAnalysis.whyMayNotWork}
          </p>
          <div className="visual-change-list">
            <span><Leaf size={16} /> Captures water before it reaches the drain</span>
            <span><MoveDown size={16} /> Lets part of the runoff soak into soil</span>
            <span><Droplets size={16} /> Stores peak stormwater temporarily</span>
            <span><MoveRight size={16} /> Releases remaining water slowly after the peak</span>
          </div>
        </section>

        <section className="analysis-card proof-card">
          <div className="section-kicker">Planning Estimate</div>
          <h3>Less water hits the pipe during the peak</h3>
          <div className="peak-flow-strip">
            <span>Current Peak Flow: 120%</span>
            <span>After Bioswale: 95%</span>
            <span>After Rain Garden: 88%</span>
            <span>
              After {selectedAnalysis.solution.name}: {targetPeakFlow}%
            </span>
          </div>
          <div className="mini-estimate-grid">
            <Metric
              label="Runoff captured"
              value={formatRange(selectedAnalysis.estimatedCapturedRange, "gal")}
            />
            <Metric
              label="Runoff slowed"
              value={formatRange(selectedAnalysis.estimatedSlowedRange, "gal")}
            />
            <Metric
              label="Peak-flow reduction"
              value={formatRange(selectedAnalysis.estimatedPeakFlowReductionRange, "%")}
            />
            <Metric
              label="Remaining overflow"
              value={formatRange(selectedAnalysis.remainingOverflowRange, "gal")}
            />
          </div>
        </section>
      </div>

      <section className="analysis-card compact-proof-card">
        <div>
          <div className="section-kicker">Why This Zone Floods</div>
          <p>
            {selectedZone.imperviousSurfacePercent}% impervious surface,{" "}
            {selectedZone.drainageComplaintCount} drainage complaints, and low/slope
            risk of {selectedZone.elevationRisk}/100 mean water reaches pipes faster
            than they can carry it away.
          </p>
        </div>
        <div className="compact-proof-metrics">
          <Metric
            label="Estimated runoff"
            value={`${formatNumber(currentHydrology.runoffVolumeGallons)} gal`}
          />
          <Metric
            label="Pipe capacity"
            value={`${formatNumber(currentHydrology.pipeCapacityGallons)} gal`}
          />
          <Metric
            label="Current overflow"
            value={`${formatNumber(currentHydrology.overflowGallons)} gal`}
          />
          <Metric
            label="After GSI overflow"
            value={`${formatNumber(selectedImpact.overflowGallons)} gal`}
          />
        </div>
      </section>
    </section>
  );
}

function FlowLegend() {
  const steps = [
    ["1", "Rainfall", "Rain falls on roofs, roads, and pavement"],
    ["2", "Runoff", "Water flows across hard surfaces"],
    ["3", "Inlet", "Water enters the storm drain"],
    ["4", "Downstream", "Water drops through underground pipes"],
    ["5", "Pipe Capacity", "Pipe fills as more water enters"],
    ["6", "Backup", "Excess water backs up and floods streets"],
  ];

  return (
    <div className="flow-legend-strip" aria-label="Flood sequence">
      {steps.map(([number, title, copy]) => (
        <div className={number === "6" ? "is-backup" : ""} key={number}>
          <span>{number}</span>
          <strong>{title}</strong>
          <small>{copy}</small>
        </div>
      ))}
    </div>
  );
}

function ZoneStatusPanel({
  currentHydrology,
  scenario,
  selectedAnalysis,
  selectedZone,
  systemMode,
  targetPeakFlow,
}: {
  currentHydrology: ReturnType<typeof estimateZoneHydrology>;
  scenario: RainfallScenario;
  selectedAnalysis: SolutionAnalysis;
  selectedZone: AtlantaZone;
  systemMode: "current" | "after";
  targetPeakFlow: number;
}) {
  const overloaded = systemMode === "current";
  const overflowPerMinute = Math.max(
    900,
    Math.round(currentHydrology.overflowGallons / Math.max(6, scenario.durationHours * 60)),
  );
  const flowPerMinute = Math.round(
    currentHydrology.waterEnteringPipe / Math.max(6, scenario.durationHours * 60),
  );

  return (
    <aside className="system-status-panel" aria-label="System status">
      <h3>System Status</h3>
      <strong className={overloaded ? "status-overloaded" : "status-managed"}>
        {overloaded ? "OVERLOADED" : "MANAGED"}
      </strong>
      <div className="status-meter">
        <span>Pipe Capacity</span>
        <strong>{overloaded ? "130%" : `${targetPeakFlow}%`} / {formatNumber(Math.round(currentHydrology.pipeCapacityGallons / 60))} gal/min</strong>
        <i><b style={{ width: overloaded ? "92%" : `${Math.max(42, targetPeakFlow * 0.72)}%` }} /></i>
      </div>
      <dl className="status-list">
        <div>
          <dt>Current Flow</dt>
          <dd>{formatNumber(flowPerMinute)} gal/min</dd>
        </div>
        <div>
          <dt>Overflow</dt>
          <dd>{overloaded ? `${formatNumber(overflowPerMinute)} gal/min` : "Reduced"}</dd>
        </div>
        <div>
          <dt>Flood Risk</dt>
          <dd>{overloaded ? "Very High" : "Lowered"}</dd>
        </div>
      </dl>
      <div className="status-story">
        <h4>What's Happening?</h4>
        <p>
          {overloaded
            ? "More water is entering the storm drain system than the pipes can handle. The sewer line fills, forcing water back up through inlets and onto streets."
            : `${selectedAnalysis.solution.name} captures, stores, infiltrates, or slowly releases runoff so less water reaches the pipe during the storm peak.`}
        </p>
      </div>
      <div className="key-driver-list">
        <h4>Key Drivers</h4>
        <span><b>High impervious surface</b>{selectedZone.imperviousSurfacePercent}%</span>
        <span><b>Rainfall event</b>{scenario.totalRainfallInches.toFixed(1)} in</span>
        <span><b>Aging infrastructure</b>Built 1960s</span>
        <span><b>Low elevation areas</b>{selectedZone.elevationRisk > 65 ? "Yes" : "Some"}</span>
      </div>
      <div className="solution-cta">
        <strong>Reduce peak flow with GSI to keep water below pipe capacity.</strong>
        <span>Explore Solutions →</span>
      </div>
    </aside>
  );
}

function getInitialSolutionId(zone: AtlantaZone): InterventionId {
  if (demoGsiSolutions.some(({ id }) => id === zone.recommendedGsi.primary)) {
    return zone.recommendedGsi.primary;
  }

  const secondaryMatch = zone.recommendedGsi.secondary.find((solutionId) =>
    demoGsiSolutions.some(({ id }) => id === solutionId),
  );

  return secondaryMatch ?? "bioswale";
}

function statusClass(status: PlausibilityStatus) {
  if (status === "Strong fit") return "is-strong";
  if (status === "Possible with constraints") return "is-possible";
  return "is-not-recommended";
}

function analyzeSolution(
  zone: AtlantaZone,
  scenario: RainfallScenario,
  solution: GsiSolution,
): SolutionAnalysis {
  const hydrology = estimateZoneHydrology(zone, scenario);
  const suitability = analyzeSuitability(zone, solution.id);
  const captureMid = (solution.minCapturePercent + solution.maxCapturePercent) / 2;
  const peakMid =
    (solution.minPeakFlowReductionPercent + solution.maxPeakFlowReductionPercent) / 2 / 100;
  const infiltratePercent = estimateInfiltrationShare(solution, zone);
  const planningImpact = estimateGsiPlanningImpact(zone, scenario, {
    capturePercent: captureMid,
    slowPercent: peakMid,
    infiltratePercent,
  });
  const minCaptured = hydrology.runoffVolumeGallons * solution.minCapturePercent;
  const maxCaptured = hydrology.runoffVolumeGallons * solution.maxCapturePercent;
  const minSlowed =
    hydrology.runoffVolumeGallons * (solution.minPeakFlowReductionPercent / 100) * 0.48;
  const maxSlowed =
    hydrology.runoffVolumeGallons * (solution.maxPeakFlowReductionPercent / 100) * 0.48;
  const minInfiltrated = minCaptured * estimateInfiltrationShare(solution, zone) * 0.75;
  const maxInfiltrated = maxCaptured * estimateInfiltrationShare(solution, zone);
  const minSewer = Math.max(0, hydrology.runoffVolumeGallons - maxCaptured - maxInfiltrated);
  const maxSewer = Math.max(0, hydrology.runoffVolumeGallons - minCaptured - minInfiltrated);
  const minOverflow = Math.max(0, minSewer - hydrology.pipeCapacityGallons);
  const maxOverflow = Math.max(0, maxSewer - hydrology.pipeCapacityGallons);

  return {
    solution,
    suitabilityScore: suitability.score,
    whyViable: suitability.whyItWorks,
    siteConstraints: suitability.constraints,
    estimatedCapturedRange: [minCaptured, maxCaptured],
    estimatedSlowedRange: [minSlowed, maxSlowed],
    estimatedInfiltratedRange: [minInfiltrated, maxInfiltrated],
    estimatedPeakFlowReductionRange: [
      solution.minPeakFlowReductionPercent,
      solution.maxPeakFlowReductionPercent,
    ],
    remainingSewerRange: [minSewer, maxSewer],
    remainingOverflowRange: [minOverflow, maxOverflow],
    planningImpact,
    plausibilityStatus: suitability.status,
    whyMayNotWork: suitability.whyItMayNotWork,
    suitabilityFactors: suitability.factors,
  };
}

function estimateInfiltrationShare(solution: GsiSolution, zone: AtlantaZone) {
  const soilPenalty = zone.imperviousSurfacePercent > 72 ? 0.72 : 1;
  const base =
    solution.id === "permeable-pavement"
      ? 0.42
      : solution.id === "rain-garden" || solution.id === "bioswale"
        ? 0.36
        : solution.id === "tree-trench"
          ? 0.3
          : solution.id === "wetland"
            ? 0.22
            : 0.08;

  return base * soilPenalty;
}

function getDemoPeakFlowTarget(solutionId: InterventionId) {
  if (solutionId === "bioswale") return 95;
  if (solutionId === "rain-garden") return 88;
  return 70;
}

function FloodStreetAnimation({
  afterPeakPercent,
  mode,
  reductionRange,
  solutionId,
  solutionName,
}: {
  afterPeakPercent: number;
  mode: "current" | "after";
  reductionRange: [number, number];
  solutionId: InterventionId;
  solutionName: string;
}) {
  const isAfter = mode === "after";
  const pipeWaterHeight = isAfter ? `${Math.max(34, Math.min(68, afterPeakPercent * 0.62))}%` : "96%";
  const shaftWaterHeight = isAfter ? "56%" : "126%";

  return (
    <div
      className={`street-animation ${isAfter ? "is-after" : "is-current"}`}
      style={{
        "--pipe-water-height": pipeWaterHeight,
        "--shaft-water-height": shaftWaterHeight,
      } as CSSProperties}
    >
      <div className="surface-scene">
        <div className="street-sky" aria-hidden="true">
          <i /><i /><i /><i /><i /><i /><i /><i /><i /><i />
        </div>
        <div className="surface-label">Surface: rain, roofs, pavement, street flooding</div>
        <div className="street-blocks">
          <div className="city-source building-source">
            <div className="roof-shape">
              <span className="chimney" />
              <span className="gutter" />
            </div>
            <div className="building-face">
              <span /><span /><span />
            </div>
            <strong>Building roof runoff</strong>
            <small>Rain cannot soak into roofs</small>
          </div>
          <div className="city-source parking-source">
            <div className="parking-lot-visual">
              <span className="parking-stripe" />
              <span className="parking-stripe" />
              <span className="parking-stripe" />
              <span className="parked-car car-one" />
              <span className="parked-car car-two" />
            </div>
            <strong>Paved parking runoff</strong>
            <small>Asphalt sends water to the street</small>
          </div>
        </div>
        <div className="street-road">
          <div className="runoff-stream roof-runoff" />
          <div className="runoff-stream road-runoff" />
          <div className="runoff-label roof-label">roof runoff</div>
          <div className="runoff-label pavement-label">pavement runoff</div>
          <div className="surface-drain-intake">
            <Droplets size={17} />
            <span>Water entering storm drain</span>
          </div>
          <div className="storm-grate" aria-hidden="true">
            <span /><span /><span /><span />
          </div>
          {!isAfter ? (
            <div className="backflow-surge">
              <Waves size={16} />
              <span>Pipe is full, water backs up</span>
            </div>
          ) : null}
          <div className="street-water" />
          <div className="street-waterline">
            {isAfter ? "Less water backs up on street" : "Water backs up to surface"}
          </div>
        </div>
        {isAfter ? (
          <SolutionSceneVisual
            reductionRange={reductionRange}
            solutionId={solutionId}
            solutionName={solutionName}
          />
        ) : null}
      </div>

      <div className="underground-scene">
        <div className="soil-texture" aria-hidden="true" />
        <div className="surface-label">Underground: storm drain pipe capacity</div>
        <div className="drain-drop-column">
          <MoveDown size={18} />
          <span>Flow drops into pipe</span>
        </div>
        <div className="vertical-drain-shaft" aria-hidden="true">
          <span />
        </div>
        <div className="underground-pipe">
          <div className="pipe-flow-arrows" aria-hidden="true">
            <i /><i /><i />
          </div>
          <div className="pipe-water-level" />
          <span>
            {isAfter
              ? "Sewer line lowered after GSI"
              : "Sewer line fills and backs up"}
          </span>
        </div>
      </div>

      <div className="gsi-visual">
        <div className={`gsi-bed ${isAfter ? "is-active" : ""}`}>
          <Leaf size={18} />
          <strong>{solutionName}</strong>
        </div>
        <div className="gsi-actions">
          <span><MoveDown size={15} /> Capture</span>
          <span><Waves size={15} /> Store</span>
          <span><MoveRight size={15} /> Slow release</span>
        </div>
        <p>
          {isAfter
            ? `${solutionName} typically lowers peak flow by ${formatRange(reductionRange, "%")}.`
            : "Current system sends fast runoff straight to the pipe during the storm peak."}
        </p>
      </div>
    </div>
  );
}

function SolutionSceneVisual({
  reductionRange,
  solutionId,
  solutionName,
}: {
  reductionRange: [number, number];
  solutionId: InterventionId;
  solutionName: string;
}) {
  const copy = getSolutionSceneCopy(solutionId);

  return (
    <div className={`solution-scene-visual ${solutionId}`}>
      <div className="solution-capture-flow" />
      <div className="solution-asset">
        <strong>{solutionName}</strong>
        <span>{copy.label}</span>
        {copy.nodes.map((node) => (
          <i key={node}>{node}</i>
        ))}
      </div>
      <p>
        {copy.action} Typical peak-flow reduction: {formatRange(reductionRange, "%")}.
      </p>
    </div>
  );
}

function getSolutionSceneCopy(solutionId: InterventionId) {
  if (solutionId === "bioswale") {
    return {
      action: "The curbside planted channel catches road runoff before it enters the grate.",
      label: "curbside planted channel",
      nodes: ["capture", "infiltrate", "slow"],
    };
  }
  if (solutionId === "rain-garden") {
    return {
      action: "The planted depression stores roof and street runoff while soil absorbs part of it.",
      label: "planted low area",
      nodes: ["capture", "soil", "overflow"],
    };
  }
  if (solutionId === "permeable-pavement") {
    return {
      action: "Permeable pavement lets water pass through the hard surface into a stone bed.",
      label: "porous pavement layer",
      nodes: ["soak", "stone bed", "slow"],
    };
  }
  if (solutionId === "tree-trench") {
    return {
      action: "A tree trench stores water under the sidewalk and feeds tree roots.",
      label: "tree trench storage",
      nodes: ["trees", "soil cells", "cooling"],
    };
  }
  if (solutionId === "retention-pond") {
    return {
      action: "A retention basin holds stormwater above ground and releases it after the peak.",
      label: "surface storage basin",
      nodes: ["hold", "settle", "release"],
    };
  }
  return {
    action: "Sensors detect pipe overload and a smart valve diverts excess water into underground storage for later slow release.",
    label: "smart storage network",
    nodes: ["sensor", "valve", "storage"],
  };
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="analysis-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatRange([min, max]: [number, number], unit: "gal" | "%") {
  if (unit === "%") return `${Math.round(min)}-${Math.round(max)}%`;
  return `${formatNumber(min)}-${formatNumber(max)} gal`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}
