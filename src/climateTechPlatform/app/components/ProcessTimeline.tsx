import { CloudRain, ArrowRight, Droplets, Waves, BarChart2, AlertTriangle } from "lucide-react";

const steps = [
  { id: 1, label: "Rainfall", sublabel: "3.0 in/hr", icon: CloudRain, color: "#00a8f3" },
  { id: 2, label: "Runoff", sublabel: "81% hard surface", icon: Waves, color: "#00d4d8" },
  { id: 3, label: "Inlet", sublabel: "Storm drain", icon: Droplets, color: "#3b82f6" },
  { id: 4, label: "Sewer Flow", sublabel: "Combined system", icon: ArrowRight, color: "#6366f1" },
  { id: 5, label: "Capacity", sublabel: "105% exceeded", icon: BarChart2, color: "#f59e0b" },
  { id: 6, label: "Backup", sublabel: "Street flooding", icon: AlertTriangle, color: "#ef4444" },
];

interface ProcessTimelineProps {
  activeStep: number;
}

export function ProcessTimeline({ activeStep }: ProcessTimelineProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        padding: "0 24px",
        height: "100%",
      }}
    >
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = step.id === activeStep;
        const isPast = step.id < activeStep;
        const isFuture = step.id > activeStep;
        const opacity = isFuture ? 0.35 : 1;

        return (
          <div key={step.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                opacity,
                transition: "all 0.3s ease",
                flex: 1,
              }}
            >
              {/* Node */}
              <div
                style={{
                  width: isActive ? 44 : 36,
                  height: isActive ? 44 : 36,
                  borderRadius: "50%",
                  background: isActive
                    ? `radial-gradient(circle, ${step.color}30, ${step.color}10)`
                    : isPast
                    ? `${step.color}18`
                    : "rgba(255,255,255,0.04)",
                  border: isActive
                    ? `2px solid ${step.color}`
                    : isPast
                    ? `1px solid ${step.color}50`
                    : "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.3s ease",
                  boxShadow: isActive ? `0 0 20px ${step.color}40, 0 0 40px ${step.color}20` : "none",
                  animation: isActive ? "nodePulse 2s ease-in-out infinite" : "none",
                }}
              >
                <Icon
                  size={isActive ? 18 : 15}
                  color={isActive ? step.color : isPast ? step.color : "#3a6080"}
                  strokeWidth={isActive ? 2 : 1.5}
                />
              </div>

              {/* Step number */}
              <div
                style={{
                  fontSize: 9,
                  color: isActive ? step.color : "#3a6080",
                  fontFamily: "JetBrains Mono, monospace",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                }}
              >
                {String(step.id).padStart(2, "0")}
              </div>

              {/* Label */}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: isActive ? "#e2f0ff" : "#5b8ab0", fontWeight: isActive ? 600 : 400 }}>
                  {step.label}
                </div>
                <div style={{ fontSize: 9, color: "#2d5c7a", fontFamily: "JetBrains Mono, monospace" }}>
                  {step.sublabel}
                </div>
              </div>
            </div>

            {/* Connector */}
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 0,
                  width: 24,
                  height: 1,
                  background: `linear-gradient(90deg, ${step.color}${isPast ? "60" : "20"}, ${steps[i + 1].color}${step.id < activeStep ? "60" : "10"})`,
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                {isPast && (
                  <div
                    style={{
                      position: "absolute",
                      inset: -1,
                      background: `linear-gradient(90deg, ${step.color}40, ${steps[i + 1].color}40)`,
                      animation: "flowLine 1.5s linear infinite",
                    }}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        @keyframes nodePulse {
          0%, 100% { box-shadow: 0 0 20px var(--pulse-color, rgba(0,212,216,0.4)), 0 0 40px var(--pulse-color, rgba(0,212,216,0.2)); }
          50% { box-shadow: 0 0 30px var(--pulse-color, rgba(0,212,216,0.6)), 0 0 60px var(--pulse-color, rgba(0,212,216,0.3)); }
        }
        @keyframes flowLine {
          0% { transform: scaleX(0); transform-origin: left; opacity: 0; }
          50% { transform: scaleX(1); transform-origin: left; opacity: 1; }
          100% { transform: scaleX(0); transform-origin: right; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
