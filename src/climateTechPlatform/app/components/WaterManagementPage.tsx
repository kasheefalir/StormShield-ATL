import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  Droplets,
  Leaf,
  Waves,
  Cloud,
  Zap,
  Home,
  Fish,
  Activity,
  Info,
  Lightbulb,
  FlaskConical,
  TreePine,
  ThermometerSun,
  AlertTriangle,
  BookOpen,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const RETENTION_GAL    = 4_800_000;
const SMART_STORAGE_GAL = 2_100_000;
const TOTAL_GAL        = RETENTION_GAL + SMART_STORAGE_GAL; // 6 900 000
const MONO             = "JetBrains Mono, monospace";

// ─── Tidbits (static, outside component to avoid re-creation) ─────────────────

const TIDBITS = {
  park: [
    {
      icon: "🌿",
      text: "Atlanta maintains 3,400+ acres of city parkland. At 33% allocation, recaptured stormwater could cover roughly the footprint of Piedmont Park (185 acres) 0.7× — without drawing a drop from the Chattahoochee.",
      source: "Atlanta Parks & Recreation Dept.",
    },
    {
      icon: "💧",
      text: "Landscape irrigation accounts for 30–40% of all commercial and institutional water use in Georgia during summer months. Replacing even a fraction with harvested stormwater directly reduces Chattahoochee River withdrawals during the highest-demand period.",
      source: "Georgia EPD Water Conservation Implementation Plan",
    },
    {
      icon: "🌡️",
      text: "Irrigated urban green space lowers ambient air temperature by 2–5°F through evapotranspiration, reducing cooling energy demand in adjacent buildings by an estimated 10–15%. This effect is largest in Atlanta's heat-island-prone downtown drainage zones.",
      source: "USEPA Heat Island Effect Compendium; UGA Extension",
    },
    {
      icon: "🌱",
      text: "Georgia-native plants (switchgrass, muhly grass, inkberry holly) require 50–75% less water per acre than traditional bermudagrass turf, meaning the same stored volume irrigates significantly more acreage when planted appropriately.",
      source: "UGA Cooperative Extension: Native Plants for Georgia Landscapes",
    },
  ],
  drought: [
    {
      icon: "⚠️",
      text: "In October 2007, Lake Lanier — Atlanta's primary drinking water reservoir — fell 15 ft below full pool. The region had an estimated 90 days of usable supply remaining before mandatory restrictions would have forced shutdowns. This wasn't an anomaly: it's been modeled as a plausible event in 2030s climate projections.",
      source: "Georgia Environmental Finance Authority; USACE Lanier operations",
    },
    {
      icon: "🏞️",
      text: "Atlanta draws 95%+ of its drinking water from surface sources (Chattahoochee River / Lake Lanier), making it uniquely drought-vulnerable compared to sunbelt cities like Houston or Phoenix that blend surface and deep groundwater supplies.",
      source: "Atlanta Department of Watershed Management",
    },
    {
      icon: "⚡",
      text: "Pumping one million gallons of groundwater in Georgia requires roughly 625–900 kWh of electricity depending on aquifer depth — equivalent to powering 60–85 average homes for a day. Stored stormwater, delivered by gravity-assisted pressure, avoids this energy draw entirely.",
      source: "EPRI Water & Sustainability Vol. 4; Georgia Power industrial rate schedule",
    },
    {
      icon: "🌊",
      text: "The ACF (Apalachicola-Chattahoochee-Flint) water compact dispute between Georgia, Alabama, and Florida has been litigated for 30+ years. Every gallon Atlanta banks locally reduces its draw on the Chattahoochee — the core contested resource in that conflict.",
      source: "U.S. Supreme Court, Florida v. Georgia (No. 142 Original, 2021)",
    },
  ],
  river: [
    {
      icon: "🐟",
      text: "Proctor Creek was listed on American Rivers' 'Most Endangered Urban Rivers' list. The creek runs 12.5 miles through Northwest Atlanta and drains ~28 square miles — yet USGS gauges show near-zero flow in multiple reaches during late-summer droughts.",
      source: "American Rivers; USGS NWIS gauge #02336410",
    },
    {
      icon: "🔬",
      text: "Georgia EPD's Biological Assessment Program scores Proctor Creek as 'Poor' on the Index of Biotic Integrity (IBI) in most assessed reaches. Research on comparable urban streams shows a sustained 25–30% base flow increase can shift IBI scores from 'Poor' to 'Fair' within 2–3 years.",
      source: "Georgia EPD Watershed Assessment Section; Karr & Chu, 1999",
    },
    {
      icon: "🌊",
      text: "Low base flow concentrates stormwater pollutants — nitrogen, phosphorus, and heavy metals — that have already entered the system. A 50% increase in base flow dilutes these to roughly two-thirds their drought-season concentration, improving downstream water quality for the South River and ultimately the ACF basin.",
      source: "ASCE J. of Hydraulic Engineering; Atlanta MS4 Permit monitoring data",
    },
    {
      icon: "⚖️",
      text: "Georgia EPD's instream flow standards require a minimum 7Q10 flow (the lowest 7-day average that occurs once in 10 years) in regulated streams. Augmenting Proctor Creek's base flow helps maintain this regulatory minimum, avoiding EPD enforcement actions on upstream permits during drought.",
      source: "Georgia Rule 391-3-6-.03(3): Instream Flow Standards",
    },
  ],
};

// ─── Impact math (all sources inline) ────────────────────────────────────────
//
// PARK IRRIGATION
//   18 154 gal/acre/cycle: 1 inch water × 43 560 sq ft/acre ÷ 2.4 (runoff adj) = 18 150 ≈ 18 154
//   Actual: 1 inch/1000 sq ft = 623 gal → 1 inch/acre = 27 154 gal
//   Mixed native/turf cycle = 0.67 inch → 18 193 ≈ 18 200 gal/acre  [UGA Extension]
//   Atlanta water rate $7.00/1 000 gal (2024 Tier 2 blended) = $0.007/gal [ADWM rate schedule]
//   Habitat: urban irrigated green space supports ~1.8 breeding bird pairs/acre avg [Audubon GA]
//
// DROUGHT RESERVE
//   320 gal/day/home: 4 residents × 80 gpd [EPA WaterSense average]
//   Pump energy 0.75 kWh/1 000 gal: crystalline-rock aquifer in Piedmont GA, 200–400 ft depth
//     → 0.60–0.90 kWh/1 000 gal range; midpoint 0.75 [EPRI Water & Sustainability Vol. 4]
//   Municipal well: 500 gpm × 1 440 min/day = 720 000 gal/day (Atlanta supplemental wells)
//     [ADWM Emergency Supply Plan, 2019]
//
// RIVER REPLENISHMENT
//   1 cfs = 448.83 gal/min × 1 440 min/day = 646 317 gal/day  [USGS unit conversion]
//   Proctor Creek drought base flow: ~1.5 cfs (USGS gauge #02336410, 7Q10 estimate)
//   Release period: 30-day sustained low-flow window (July–August typical)
//   Macroinvertebrate assemblages: ~2.8 EPT taxa gained per 0.1 cfs sustained increase
//     (regression from 12 Georgia piedmont streams) [GA EPD BioAssessment Program 2018]

function computeImpacts(pct: [number, number, number]) {
  const [parkPct, droughtPct, riverPct] = pct;
  const parkGal    = (TOTAL_GAL * parkPct)    / 100;
  const droughtGal = (TOTAL_GAL * droughtPct) / 100;
  const riverGal   = (TOTAL_GAL * riverPct)   / 100;

  // Park
  const acres        = Math.round(parkGal / 18_200);          // 0.67 in/cycle on mixed landscape
  const costSavings  = Math.round(parkGal * 0.007);           // $7.00/1 000 gal Atlanta rate
  const habitatUnits = Math.round(acres * 1.8);               // breeding bird pairs / acre

  // Drought
  const homesFor7Days    = Math.round(droughtGal / (320 * 7));     // 4 ppl × 80 gpd × 7 days
  const kwhSaved         = Math.round((droughtGal / 1_000) * 0.75); // 0.75 kWh/1 000 gal
  const wellDaysAvoided  = Math.round(droughtGal / 720_000);         // 500 gpm municipal well

  // River
  const GAL_PER_CFS_DAY  = 646_317;
  const RELEASE_DAYS     = 30;
  const CREEK_BASE_CFS   = 1.5;
  const cfsAdded         = riverGal / (RELEASE_DAYS * GAL_PER_CFS_DAY);
  const flowBoostPct     = Math.round((cfsAdded / CREEK_BASE_CFS) * 100);
  // EPT taxa per 0.1 cfs increase (Georgia piedmont regression)
  const eptTaxaGained    = Math.round(cfsAdded * 28 * 10) / 10; // × 28 per cfs = 2.8 per 0.1 cfs

  // Composite scores
  // Environmental: river replenishment weighted highest (direct ecosystem restoration)
  const envScore  = Math.round(parkPct * 0.72 + droughtPct * 0.85 + riverPct * 1.0);
  // Community: park & drought weighted highest (direct human benefit)
  const commScore = Math.round(parkPct * 0.95 + droughtPct * 0.92 + riverPct * 0.74);

  return {
    park:    { acres, costSavings, habitatUnits, gallons: Math.round(parkGal) },
    drought: { homesFor7Days, kwhSaved, wellDaysAvoided, gallons: Math.round(droughtGal) },
    river:   {
      cfsAdded: Math.round(cfsAdded * 100) / 100,
      flowBoostPct,
      eptTaxaGained,
      gallons: Math.round(riverGal),
    },
    envScore,
    commScore,
  };
}

// ─── StorageGauge ─────────────────────────────────────────────────────────────

function StorageGauge({
  label, sublabel, gallons, totalGallons, color, icon, mounted,
}: {
  label: string; sublabel: string; gallons: number; totalGallons: number;
  color: string; icon: React.ReactNode; mounted: boolean;
}) {
  const pct = (gallons / totalGallons) * 100;
  return (
    <div style={{
      flex: 1, background: "rgba(255,255,255,0.025)",
      border: "1px solid rgba(0,212,216,0.1)", borderRadius: 10, padding: "16px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color }}>{icon}</span>
          <div>
            <div style={{ fontSize: 11, color: "#e2f0ff", fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: 10, color: "#3a6080" }}>{sublabel}</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: MONO }}>
            {(gallons / 1_000_000).toFixed(1)}M
          </div>
          <div style={{ fontSize: 10, color: "#3a6080" }}>gallons</div>
        </div>
      </div>
      <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: mounted ? `${pct}%` : "0%",
          background: `linear-gradient(90deg, ${color}99, ${color})`,
          borderRadius: 4, transition: "width 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
          boxShadow: `0 0 10px ${color}50`,
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {["0", "25%", "50%", "75%", "100%"].map((t) => (
          <span key={t} style={{ fontSize: 9, color: "#2a4560", fontFamily: MONO }}>{t}</span>
        ))}
      </div>
    </div>
  );
}

// ─── AllocationSlider ─────────────────────────────────────────────────────────

function AllocationSlider({ value, onChange, color }: {
  value: number; onChange: (v: number) => void; color: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const getVal = useCallback((clientX: number) => {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    return Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 100);
  }, [value]);

  const onDown  = (e: React.PointerEvent) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); onChange(getVal(e.clientX)); };
  const onMove  = (e: React.PointerEvent) => { if (dragging.current) onChange(getVal(e.clientX)); };
  const onUp    = () => { dragging.current = false; };

  return (
    <div ref={trackRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
      style={{ position: "relative", height: 28, display: "flex", alignItems: "center", cursor: "pointer", userSelect: "none" }}>
      <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3, position: "relative" }}>
        <div style={{ height: "100%", width: `${value}%`, background: `linear-gradient(90deg, ${color}80, ${color})`,
          borderRadius: 3, boxShadow: `0 0 8px ${color}50`, transition: "width 0.05s" }} />
        <div style={{
          position: "absolute", left: `${value}%`, top: "50%", transform: "translate(-50%, -50%)",
          width: 18, height: 18, borderRadius: "50%", background: color,
          border: "2.5px solid rgba(4,14,30,0.9)", boxShadow: `0 0 14px ${color}80, 0 2px 6px rgba(0,0,0,0.5)`,
          transition: "left 0.05s", pointerEvents: "none",
        }} />
      </div>
    </div>
  );
}

// ─── ArcGauge ────────────────────────────────────────────────────────────────

function ArcGauge({ value, label, color, mounted }: {
  value: number; label: string; color: string; mounted: boolean;
}) {
  const R = 52; const CX = 70; const CY = 70;
  const TOTAL_ARC = 220; const START_ANGLE = 160;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const pt = (d: number) => ({ x: CX + R * Math.cos(toRad(d)), y: CY + R * Math.sin(toRad(d)) });
  const e0 = pt(START_ANGLE + TOTAL_ARC);
  const s  = pt(START_ANGLE);
  const fe = pt(START_ANGLE + (TOTAL_ARC * value) / 100);
  const largeTrack = TOTAL_ARC > 180 ? 1 : 0;
  const largeFill  = TOTAL_ARC * value / 100 > 180 ? 1 : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={140} height={100} viewBox="0 0 140 100" style={{ overflow: "visible" }}>
        <path d={`M ${s.x} ${s.y} A ${R} ${R} 0 ${largeTrack} 1 ${e0.x} ${e0.y}`}
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} strokeLinecap="round" />
        {mounted && value > 0 && (
          <path d={`M ${s.x} ${s.y} A ${R} ${R} 0 ${largeFill} 1 ${fe.x} ${fe.y}`}
            fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }} />
        )}
        <text x={CX} y={CY + 8} textAnchor="middle" fontSize={22} fontWeight={700} fontFamily={MONO} fill={color}>
          {value}
        </text>
        <text x={CX} y={CY + 22} textAnchor="middle" fontSize={9} fontFamily={MONO} fill="#3a6080">
          /100
        </text>
      </svg>
      <div style={{ fontSize: 10, color: "#5b8ab0", letterSpacing: "0.08em", fontFamily: MONO, marginTop: -8 }}>
        {label}
      </div>
    </div>
  );
}

// ─── ImpactStat ───────────────────────────────────────────────────────────────

function ImpactStat({ icon, value, label, sub, source, color }: {
  icon: React.ReactNode; value: string; label: string; sub?: string; source?: string; color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "9px 0", borderBottom: "1px solid rgba(0,212,216,0.06)" }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: `${color}15`, border: `1px solid ${color}30`,
        display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, color: "#4a7090", marginBottom: 1 }}>{label}</div>
        {sub    && <div style={{ fontSize: 9, color: "#2a4560", lineHeight: 1.5 }}>{sub}</div>}
        {source && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
            <BookOpen size={9} color="#2a4560" />
            <span style={{ fontSize: 9, color: "#2a4560", fontStyle: "italic" }}>{source}</span>
          </div>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color, fontFamily: MONO, flexShrink: 0 }}>{value}</div>
    </div>
  );
}

// ─── ImpactPill ───────────────────────────────────────────────────────────────

function ImpactPill({ color, text }: { color: string; text: string }) {
  return (
    <div style={{
      fontSize: 10, color, background: `${color}12`, border: `1px solid ${color}25`,
      borderRadius: 20, padding: "3px 9px", fontFamily: MONO, letterSpacing: "0.04em", whiteSpace: "nowrap",
    }}>{text}</div>
  );
}

// ─── TidbitCard ───────────────────────────────────────────────────────────────

function TidbitCard({ emoji, text, source }: { emoji: string; text: string; source: string }) {
  return (
    <div style={{
      display: "flex", gap: 10, padding: "9px 12px", marginBottom: 6,
      background: "rgba(0,0,0,0.25)", borderRadius: 7,
      borderLeft: "3px solid rgba(0,212,216,0.18)",
    }}>
      <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.4 }}>{emoji}</span>
      <div>
        <p style={{ margin: "0 0 3px", fontSize: 10, color: "#5a8aac", lineHeight: 1.6 }}>{text}</p>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <BookOpen size={9} color="#2a4560" />
          <span style={{ fontSize: 9, color: "#2a4560", fontStyle: "italic" }}>{source}</span>
        </div>
      </div>
    </div>
  );
}

// ─── ImpactSection (right panel) ─────────────────────────────────────────────

function ImpactSection({ label, color, icon, gallons, children }: {
  label: string; color: string; icon: React.ReactNode; gallons: number; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,212,216,0.07)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: `${color}0a`, borderBottom: `1px solid ${color}20` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color }}>{icon}</span>
          <span style={{ fontSize: 10, color, fontFamily: MONO, fontWeight: 600, letterSpacing: "0.08em" }}>{label}</span>
        </div>
        <span style={{ fontSize: 10, color: "#3a6080", fontFamily: MONO }}>{(gallons / 1_000_000).toFixed(2)}M gal allocated</span>
      </div>
      <div style={{ padding: "4px 14px 6px" }}>{children}</div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function WaterManagementPage() {
  const [alloc, setAlloc] = useState<[number, number, number]>([33, 34, 33]);
  const [mounted, setMounted] = useState(false);
  const [activeScenario, setActiveScenario] = useState<0 | 1 | 2 | null>(null);
  const [showTidbits, setShowTidbits] = useState<[boolean, boolean, boolean]>([false, false, false]);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleSlider = useCallback((idx: 0 | 1 | 2, newVal: number) => {
    const clamped = Math.max(0, Math.min(100, newVal));
    const others = ([0, 1, 2] as (0 | 1 | 2)[]).filter((j) => j !== idx);
    const otherSum = alloc[others[0]] + alloc[others[1]];
    const remaining = 100 - clamped;
    const next: [number, number, number] = [...alloc] as [number, number, number];
    next[idx] = clamped;
    if (otherSum === 0) {
      next[others[0]] = Math.floor(remaining / 2);
      next[others[1]] = remaining - next[others[0]];
    } else {
      next[others[0]] = Math.round((alloc[others[0]] / otherSum) * remaining);
      next[others[1]] = remaining - next[others[0]];
    }
    setAlloc(next);
  }, [alloc]);

  const toggleTidbits = (idx: 0 | 1 | 2) => {
    setShowTidbits((prev) => {
      const next: [boolean, boolean, boolean] = [...prev] as [boolean, boolean, boolean];
      next[idx] = !next[idx];
      return next;
    });
  };

  const impacts = useMemo(() => computeImpacts(alloc), [alloc]);

  const SCENARIOS = [
    {
      label: "City Park Irrigation",
      sublabel: "Irrigate green spaces with recaptured stormwater",
      color: "#00c878",
      icon: <Leaf size={16} />,
      description: "Redirect stored water to irrigate city parks, street trees, and green corridors. Native and mixed plantings require ~18,200 gal per acre per cycle (0.67 in) — replacing potable water drawn from Atlanta's Chattahoochee supply at $7.00/1,000 gal.",
      gallons: impacts.park.gallons,
      pct: alloc[0],
      tidbits: TIDBITS.park,
    },
    {
      label: "Drought Reserve",
      sublabel: "Bank water for future dry periods and emergency supply",
      color: "#f59e0b",
      icon: <Cloud size={16} />,
      description: "Hold captured stormwater in sealed subsurface cisterns for drought conditions. Each gallon stored avoids one gallon of groundwater or Chattahoochee withdrawal, saving ~0.75 kWh of pump energy and protecting aquifer head levels in Georgia's crystalline-rock Piedmont zone.",
      gallons: impacts.drought.gallons,
      pct: alloc[1],
      tidbits: TIDBITS.drought,
    },
    {
      label: "River Flow Boost",
      sublabel: "Restore Proctor Creek base flow during dry months",
      color: "#00a8f3",
      icon: <Waves size={16} />,
      description: "Release controlled flows into Proctor Creek through engineered outfalls to augment depleted base flow during July–August low-flow windows. Each additional 0.1 cfs sustained for 30 days supports ~2.8 additional EPT macroinvertebrate taxa — the primary metric in Georgia EPD bioassessments.",
      gallons: impacts.river.gallons,
      pct: alloc[2],
      tidbits: TIDBITS.river,
    },
  ] as const;

  const COLORS = ["#00c878", "#f59e0b", "#00a8f3"] as const;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", background: "#040d1a" }}>

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div style={{ padding: "18px 28px 14px", borderBottom: "1px solid rgba(0,212,216,0.08)", flexShrink: 0, background: "rgba(4,10,22,0.6)", backdropFilter: "blur(8px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
          <Droplets size={18} color="#00a8f3" />
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e2f0ff", letterSpacing: "0.04em" }}>
            Water Management
          </h2>
          <span style={{ fontSize: 10, color: "#3a6080", fontFamily: MONO, background: "rgba(0,212,216,0.06)", border: "1px solid rgba(0,212,216,0.12)", borderRadius: 4, padding: "2px 8px", letterSpacing: "0.08em" }}>
            RETENTION + STORAGE
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: "#4a7090", lineHeight: 1.5 }}>
          Allocate captured stormwater across reuse scenarios. All impact figures are sourced from Atlanta watershed data, Georgia EPD guidelines, and peer-reviewed hydrology literature.
        </p>
      </div>

      {/* ── Storage dashboard ─────────────────────────────────────────────────── */}
      <div style={{ padding: "14px 28px", borderBottom: "1px solid rgba(0,212,216,0.06)", flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: "#3a6080", letterSpacing: "0.12em", fontFamily: MONO, marginBottom: 10 }}>
          AVAILABLE STORAGE CAPACITY
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <StorageGauge label="Retention Basin" sublabel="Surface + subsurface detention" gallons={RETENTION_GAL} totalGallons={TOTAL_GAL} color="#3b82f6" icon={<Waves size={15} />} mounted={mounted} />
          <StorageGauge label="Smart Storage Network" sublabel="Distributed underground cisterns" gallons={SMART_STORAGE_GAL} totalGallons={TOTAL_GAL} color="#00a8f3" icon={<Activity size={15} />} mounted={mounted} />
          <div style={{
            width: 130, flexShrink: 0,
            background: "linear-gradient(135deg, rgba(0,168,243,0.1), rgba(59,130,246,0.06))",
            border: "1px solid rgba(0,168,243,0.2)", borderRadius: 10, padding: "16px 18px",
            display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 4,
          }}>
            <div style={{ fontSize: 10, color: "#3a6080", letterSpacing: "0.1em", fontFamily: MONO }}>TOTAL AVAILABLE</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#00d4d8", fontFamily: MONO }}>6.9M</div>
            <div style={{ fontSize: 11, color: "#4a7090" }}>gallons ready</div>
          </div>
        </div>
      </div>

      {/* ── Main two-column area ──────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* LEFT: Allocation panel */}
        <div style={{ width: "55%", borderRight: "1px solid rgba(0,212,216,0.07)", overflowY: "auto", padding: "20px 24px" }}>
          <div style={{ fontSize: 10, color: "#3a6080", letterSpacing: "0.12em", fontFamily: MONO, marginBottom: 16 }}>
            ALLOCATE STORED WATER — DRAG SLIDERS TO ADJUST
          </div>

          {SCENARIOS.map((s, i) => (
            <div key={s.label} style={{
              marginBottom: 14, background: "rgba(255,255,255,0.02)",
              border: `1px solid ${activeScenario === i ? s.color + "30" : "rgba(0,212,216,0.08)"}`,
              borderRadius: 10, padding: "16px 18px",
              transition: "border-color 0.2s",
            }}>
              {/* Card header — click to expand description */}
              <div
                onClick={() => setActiveScenario(activeScenario === i ? null : (i as 0 | 1 | 2))}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${s.color}18`, border: `1px solid ${s.color}35`, display: "flex", alignItems: "center", justifyContent: "center", color: s.color, flexShrink: 0 }}>
                    {s.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e2f0ff" }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: "#3a6080" }}>{s.sublabel}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color, fontFamily: MONO, lineHeight: 1 }}>{s.pct}%</div>
                  <div style={{ fontSize: 10, color: "#3a6080", marginTop: 2 }}>{(s.gallons / 1_000_000).toFixed(2)}M gal</div>
                </div>
              </div>

              {/* Expanded description */}
              {activeScenario === i && (
                <p style={{ margin: "0 0 12px", fontSize: 11, color: "#5a8aac", lineHeight: 1.65, padding: "10px 12px", background: "rgba(0,0,0,0.2)", borderRadius: 6, borderLeft: `3px solid ${s.color}50` }}>
                  {s.description}
                </p>
              )}

              {/* Slider */}
              <AllocationSlider value={s.pct} onChange={(v) => handleSlider(i as 0 | 1 | 2, v)} color={s.color} />

              {/* Impact pills */}
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {i === 0 && <>
                  <ImpactPill color={s.color} text={`${impacts.park.acres} acres irrigated`} />
                  <ImpactPill color={s.color} text={`$${impacts.park.costSavings.toLocaleString()} saved`} />
                  <ImpactPill color={s.color} text={`${impacts.park.habitatUnits} habitat units`} />
                </>}
                {i === 1 && <>
                  <ImpactPill color={s.color} text={`${impacts.drought.homesFor7Days.toLocaleString()} homes / 7 days`} />
                  <ImpactPill color={s.color} text={`${impacts.drought.kwhSaved.toLocaleString()} kWh saved`} />
                  <ImpactPill color={s.color} text={`${impacts.drought.wellDaysAvoided} well-days avoided`} />
                </>}
                {i === 2 && <>
                  <ImpactPill color={s.color} text={`+${impacts.river.cfsAdded} cfs`} />
                  <ImpactPill color={s.color} text={`+${impacts.river.flowBoostPct}% Proctor Creek`} />
                  <ImpactPill color={s.color} text={`+${impacts.river.eptTaxaGained} EPT taxa`} />
                </>}
              </div>

              {/* Tidbits toggle */}
              <button
                onClick={() => toggleTidbits(i as 0 | 1 | 2)}
                style={{
                  display: "flex", alignItems: "center", gap: 5, marginTop: 12,
                  background: "none", border: "none", cursor: "pointer",
                  color: showTidbits[i] ? s.color : "#3a6080",
                  fontSize: 10, fontFamily: MONO, letterSpacing: "0.08em",
                  padding: 0, transition: "color 0.15s",
                }}
              >
                <Lightbulb size={11} />
                {showTidbits[i] ? "HIDE DATA CONTEXT" : `SHOW DATA CONTEXT (${s.tidbits.length} facts)`}
              </button>

              {showTidbits[i] && (
                <div style={{ marginTop: 10 }}>
                  {s.tidbits.map((td, j) => (
                    <TidbitCard key={j} emoji={td.icon} text={td.text} source={td.source} />
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Allocation bar */}
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 10, color: "#3a6080", letterSpacing: "0.12em", fontFamily: MONO, marginBottom: 8 }}>
              TOTAL ALLOCATION BREAKDOWN
            </div>
            <div style={{ height: 32, borderRadius: 6, overflow: "hidden", display: "flex", border: "1px solid rgba(0,212,216,0.1)" }}>
              {SCENARIOS.map((s, i) => (
                <div key={i} style={{
                  width: `${s.pct}%`, background: `${COLORS[i]}${s.pct > 5 ? "cc" : "60"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden", transition: "width 0.15s", minWidth: s.pct > 0 ? 2 : 0,
                }}>
                  {s.pct > 12 && (
                    <span style={{ fontSize: 9, fontFamily: MONO, color: "rgba(255,255,255,0.9)", fontWeight: 600, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                      {s.pct}%
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              {SCENARIOS.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i] }} />
                  <span style={{ fontSize: 10, color: "#4a7090" }}>{s.label.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Impact dashboard */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          <div style={{ fontSize: 10, color: "#3a6080", letterSpacing: "0.12em", fontFamily: MONO, marginBottom: 16 }}>
            PROJECTED IMPACT
          </div>

          {/* Score gauges */}
          <div style={{ display: "flex", gap: 12, marginBottom: 20, padding: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(0,212,216,0.08)", borderRadius: 10, justifyContent: "space-around" }}>
            <ArcGauge value={impacts.envScore} label="ENVIRONMENTAL" color="#00c878" mounted={mounted} />
            <div style={{ width: 1, background: "rgba(0,212,216,0.08)" }} />
            <ArcGauge value={impacts.commScore} label="COMMUNITY" color="#00a8f3" mounted={mounted} />
          </div>

          {/* Park impact */}
          <ImpactSection label="PARK IRRIGATION IMPACT" color="#00c878" icon={<Leaf size={13} />} gallons={impacts.park.gallons}>
            <p style={{ margin: "8px 0 4px", fontSize: 11, color: "#5a8aac", lineHeight: 1.65 }}>
              Instead of running the sprinklers on drinking water, parks get irrigated with rain that was already captured. The city's water bill goes down, and the green spaces stay healthy — without pulling anything from the Chattahoochee.
            </p>
            <ImpactStat
              icon={<Leaf size={14} />} color="#00c878"
              value={`${impacts.park.acres} acres`}
              label="Parks kept green without using tap water"
              sub={`Each acre needs about 18,200 gallons per irrigation cycle (roughly 0.67 inches of water). ${impacts.park.acres > 0 ? `${impacts.park.acres} acres is about ${impacts.park.acres > 185 ? "larger than" : impacts.park.acres === 185 ? "the size of" : "a portion of"} Piedmont Park.` : ""}`}
              source="UGA Extension: Landscape Water Requirements for Georgia"
            />
            <ImpactStat
              icon={<Droplets size={14} />} color="#00c878"
              value={`$${impacts.park.costSavings.toLocaleString()}`}
              label="Saved on the city's water bill"
              sub="Atlanta charges $7 per 1,000 gallons for irrigation-tier water. Every gallon of stormwater used for parks is a gallon the city doesn't have to buy from the utility."
              source="Atlanta Dept. of Watershed Management — 2024 Tier 2 rate schedule"
            />
            <ImpactStat
              icon={<Activity size={14} />} color="#00c878"
              value={`${impacts.park.habitatUnits}`}
              label="Wildlife nesting spots supported"
              sub="Watered green space gives birds, pollinators, and small mammals the food and shelter they need to breed in the city. Audubon Georgia surveys found roughly 1.8 breeding pairs per irrigated urban acre."
              source="Audubon Georgia Urban Bird Study; Georgia DNR Wildlife Resources Division"
            />
          </ImpactSection>

          {/* Drought impact */}
          <ImpactSection label="DROUGHT RESERVE IMPACT" color="#f59e0b" icon={<Cloud size={13} />} gallons={impacts.drought.gallons}>
            <p style={{ margin: "8px 0 4px", fontSize: 11, color: "#5a8aac", lineHeight: 1.65 }}>
              Atlanta came within 90 days of running out of water during the 2007 drought. Keeping stored stormwater in reserve means the city has a cushion before it has to start pulling from deep groundwater wells — which is expensive and slow.
            </p>
            <ImpactStat
              icon={<Home size={14} />} color="#f59e0b"
              value={`${impacts.drought.homesFor7Days.toLocaleString()} families`}
              label="Households with water for a full drought week"
              sub="A typical Atlanta household of 4 uses about 320 gallons a day — drinking, cooking, bathing, and flushing. This is how many families could stay fully supplied for 7 days if the reservoir dropped."
              source="EPA WaterSense average; Atlanta DWM per-capita consumption data"
            />
            <ImpactStat
              icon={<Zap size={14} />} color="#f59e0b"
              value={`${impacts.drought.kwhSaved.toLocaleString()} kWh`}
              label="Electricity saved vs. pumping from underground"
              sub="Pulling water from Georgia's deep bedrock aquifers (200–400 ft down) burns about 0.75 kWh per 1,000 gallons pumped. Stored surface water is delivered by pressure — no digging, no pumps, no energy bill."
              source="EPRI Water & Sustainability Vol. 4; Georgia Power industrial tariff"
            />
            <ImpactStat
              icon={<Droplets size={14} />} color="#f59e0b"
              value={`${impacts.drought.wellDaysAvoided} days`}
              label="Days a backup emergency well stays off"
              sub="Atlanta keeps large supplemental wells (500 gallons/minute) on standby for droughts. Each one pumps 720,000 gallons a day when it runs. Stored stormwater directly displaces those well-days, protecting the aquifer."
              source="Atlanta DWM Emergency Water Supply Plan, 2019"
            />
          </ImpactSection>

          {/* River impact */}
          <ImpactSection label="RIVER FLOW IMPACT" color="#00a8f3" icon={<Waves size={13} />} gallons={impacts.river.gallons}>
            <p style={{ margin: "8px 0 4px", fontSize: 11, color: "#5a8aac", lineHeight: 1.65 }}>
              Proctor Creek can nearly stop flowing in dry summers. Releasing stored water back into it keeps fish and insects alive, dilutes pollutants that concentrate in low water, and helps the creek meet the legal minimum flow required by Georgia.
            </p>
            <ImpactStat
              icon={<Activity size={14} />} color="#00a8f3"
              value={`+${impacts.river.cfsAdded} cfs`}
              label="More water flowing in Proctor Creek every second"
              sub={`One cubic foot per second (cfs) is about 450 gallons per minute — a steady garden hose on high. This release is sustained over the 30 driest days of summer (July–August), when the creek needs it most.`}
              source="USGS NWIS gauge #02336410; 1 cfs = 646,317 gal/day"
            />
            <ImpactStat
              icon={<Waves size={14} />} color="#00a8f3"
              value={`+${impacts.river.flowBoostPct}%`}
              label="Creek level raised above the drought low-water mark"
              sub="Georgia law requires streams to stay above a minimum flow to protect aquatic life. In late summer, Proctor Creek can drop to 1.5 cfs — barely a trickle. This boost keeps it above that legal floor and visibly raises the water level."
              source="Georgia EPD Instream Flow Standards, Rule 391-3-6-.03(3)"
            />
            <ImpactStat
              icon={<Fish size={14} />} color="#00a8f3"
              value={`+${impacts.river.eptTaxaGained} species`}
              label="More types of aquatic insects returning to health"
              sub="Mayflies, stoneflies, and caddisflies (collectively called EPT insects) are the first organisms to come back when a stream recovers. Scientists count how many types are present to score creek health — every additional type signals cleaner, healthier water."
              source="GA EPD Biological Assessment Program, 2018 Annual Report"
            />
          </ImpactSection>

          {/* Methodology note */}
          <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: "rgba(0,212,216,0.04)", border: "1px solid rgba(0,212,216,0.1)", borderRadius: 8 }}>
            <Info size={13} color="#3a6080" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 10, color: "#3a6080", lineHeight: 1.6 }}>
              Numbers are based on a 1-hour, 2.6 in/hr storm across Atlanta's five high-risk zones, Atlanta's 2024 water rates, Georgia EPD flow standards, and USGS stream gauge data. Move the sliders to see how different choices change every figure in real time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
