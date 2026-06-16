import type { ScenarioId } from "../types";

type RainAnimationProps = {
  scenarioId: ScenarioId;
  intensity: number;
};

export function RainAnimation({ scenarioId, intensity }: RainAnimationProps) {
  const dropCount =
    scenarioId === "extreme-storm" ? 76 : scenarioId.includes("drought") ? 20 : 42;

  return (
    <div className={`rain-layer ${scenarioId}`} aria-hidden="true">
      {Array.from({ length: dropCount }).map((_, index) => (
        <span
          className="rain-drop"
          key={index}
          style={{
            left: `${(index * 37) % 100}%`,
            animationDelay: `${(index % 11) * -0.23}s`,
            animationDuration: `${Math.max(0.42, 1.8 - intensity * 0.42)}s`,
            opacity: scenarioId.includes("drought") ? 0.22 : 0.36 + intensity * 0.08,
          }}
        />
      ))}
    </div>
  );
}
