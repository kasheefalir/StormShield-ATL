import { ARCHETYPE_META, getZoneStrategy, solutionName } from "../data/zoneStrategy";

const MONO = "JetBrains Mono, monospace";

// Compact pill — used in zone headers (Overview, Flood Zones).
export function StrategyBadge({ zoneId }: { zoneId: string }) {
  const strat = getZoneStrategy(zoneId);
  if (!strat) return null;
  const meta = ARCHETYPE_META[strat.archetype];
  return (
    <span
      title={strat.headline}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        background: `${meta.accent}18`,
        border: `1px solid ${meta.accent}40`,
        borderRadius: 5,
        fontSize: 11,
        color: meta.accent,
        fontWeight: 600,
      }}
    >
      <span style={{ fontFamily: MONO, letterSpacing: "0.04em" }}>{meta.label}</span>
      <span style={{ opacity: 0.65, fontWeight: 500 }}>· {meta.tagline}</span>
    </span>
  );
}

function SolutionChips({ ids, accent, muted }: { ids: string[]; accent: string; muted?: boolean }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {ids.map((id) => (
        <span
          key={id}
          style={{
            fontSize: 11,
            padding: "3px 9px",
            borderRadius: 5,
            background: muted ? "rgba(255,255,255,0.04)" : `${accent}16`,
            border: muted ? "1px solid rgba(255,255,255,0.08)" : `1px solid ${accent}38`,
            color: muted ? "#7aa0bc" : accent,
            fontWeight: 600,
          }}
        >
          {solutionName(id)}
        </span>
      ))}
    </div>
  );
}

// Full callout — used in Flood Zones (and anywhere the reasoning belongs).
export function StrategyCallout({ zoneId }: { zoneId: string }) {
  const strat = getZoneStrategy(zoneId);
  if (!strat) return null;
  const meta = ARCHETYPE_META[strat.archetype];
  return (
    <div
      style={{
        padding: "16px 18px",
        background: `linear-gradient(135deg, ${meta.accent}10, rgba(4,14,30,0.7))`,
        border: `1px solid ${meta.accent}33`,
        borderRadius: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 9,
            color: "#3a6080",
            fontFamily: MONO,
            letterSpacing: "0.1em",
          }}
        >
          RECOMMENDED STRATEGY
        </span>
        <span
          style={{
            fontSize: 10,
            fontFamily: MONO,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: meta.accent,
            padding: "3px 8px",
            borderRadius: 4,
            background: `${meta.accent}1e`,
            border: `1px solid ${meta.accent}45`,
          }}
        >
          {meta.label} · {meta.tagline}
        </span>
      </div>

      <p style={{ margin: "0 0 12px", fontSize: 13.5, color: "#cfe6f6", lineHeight: 1.55, fontWeight: 600 }}>
        {strat.headline}
      </p>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#8ab0cc", lineHeight: 1.65 }}>
        {strat.rationale}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <div>
          <div style={{ fontSize: 9, color: "#3a6080", fontFamily: MONO, letterSpacing: "0.1em", marginBottom: 5 }}>
            PRIMARY — CARRIES THE LOAD
          </div>
          <SolutionChips ids={strat.primary} accent={meta.accent} />
        </div>
        <div>
          <div style={{ fontSize: 9, color: "#3a6080", fontFamily: MONO, letterSpacing: "0.1em", marginBottom: 5 }}>
            SUPPORTING — ON THE SIDE
          </div>
          <SolutionChips ids={strat.support} accent={meta.accent} muted />
        </div>
        <div
          style={{
            marginTop: 2,
            paddingTop: 9,
            borderTop: "1px solid rgba(0,212,216,0.08)",
            display: "flex",
            gap: 8,
            alignItems: "baseline",
          }}
        >
          <span style={{ fontSize: 9, color: "#3a6080", fontFamily: MONO, letterSpacing: "0.08em", flexShrink: 0 }}>
            WIDE-AREA GREEN GSI
          </span>
          <span style={{ fontSize: 12, color: "#9fc4dd", lineHeight: 1.5 }}>{strat.greenViability}</span>
        </div>
      </div>
    </div>
  );
}
