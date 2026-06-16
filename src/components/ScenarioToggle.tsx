import { CloudRain, Droplets, Sparkles, Sun } from "lucide-react";
import type { ReactNode } from "react";
import type { RainfallScenario, ScenarioId } from "../types";

type ScenarioToggleProps = {
  scenarios: RainfallScenario[];
  activeScenarioId: ScenarioId;
  onChange: (scenarioId: ScenarioId) => void;
};

const iconByScenario: Record<ScenarioId, ReactNode> = {
  "normal-rain": <CloudRain size={17} />,
  "extreme-storm": <Droplets size={17} />,
  "drought-mode": <Sun size={17} />,
  "ai-predicted-drought": <Sparkles size={17} />,
};

export function ScenarioToggle({
  scenarios,
  activeScenarioId,
  onChange,
}: ScenarioToggleProps) {
  return (
    <div className="panel-section">
      <div className="section-kicker">Scenario</div>
      <div className="scenario-grid">
        {scenarios.map((scenario) => (
          <button
            className={`scenario-button ${
              scenario.id === activeScenarioId ? "is-active" : ""
            }`}
            key={scenario.id}
            onClick={() => onChange(scenario.id)}
            type="button"
          >
            {iconByScenario[scenario.id]}
            <span>{scenario.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
