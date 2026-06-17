import { ExternalLink } from "lucide-react";

interface Source {
  id: string;
  name: string;
  shortName: string;
  url: string;
  type: "government" | "academic" | "industry" | "municipal";
  category: "performance" | "cost" | "general";
  contributions: {
    solution: string;
    metric: string;
    value: string;
    note: string;
  }[];
}

const CATEGORY_CONFIG = {
  performance: {
    label: "WATER RETENTION & PERFORMANCE",
    description: "Sources for runoff reduction %, peak flow rates, infiltration, and volume capture",
    accent: "#00d4d8",
    bg: "rgba(0,212,216,0.04)",
  },
  cost: {
    label: "COST & IMPLEMENTATION",
    description: "Sources for installation costs, unit pricing, and implementation benchmarks",
    accent: "#f59e0b",
    bg: "rgba(245,158,11,0.04)",
  },
  general: {
    label: "GENERAL INFORMATION & INFRASTRUCTURE CONTEXT",
    description: "Sources for system history, policy context, and Atlanta-specific infrastructure data",
    accent: "#a78bfa",
    bg: "rgba(167,139,250,0.04)",
  },
};

const SOURCES: Source[] = [
  {
    id: "epa-greenvalues",
    name: "EPA National Stormwater Calculator",
    shortName: "EPA Stormwater Calculator",
    url: "https://www.epa.gov/water-research/national-stormwater-calculator",
    type: "government",
    category: "performance",
    contributions: [
      { solution: "Bioswale", metric: "Runoff Reduction", value: "40–80%", note: "Volumetric runoff capture range for linear bioswale systems in urban streets" },
      { solution: "Rain Garden", metric: "Runoff Reduction", value: "70–97%", note: "Volume reduction for bioretention cells with amended soil media" },
      { solution: "All GSI", metric: "Cost Ranges", value: "Baseline", note: "Unit cost benchmarks for nature-based stormwater infrastructure" },
    ],
  },
  {
    id: "epa-bmp",
    name: "EPA Stormwater Best Management Practice Design Guide",
    shortName: "EPA BMP Guide",
    url: "https://cfpub.epa.gov/si/si_public_record_report.cfm?dirEntryId=99739&Lab=NRMRL",
    type: "government",
    category: "performance",
    contributions: [
      { solution: "Retention Basin", metric: "Peak Flow Reduction", value: "50–80%", note: "Wet detention basin peak flow attenuation per EPA design guidance" },
      { solution: "Permeable Pavement", metric: "Infiltration Rate", value: "8 in/hr", note: "Minimum design infiltration rate for permeable pavement systems" },
      { solution: "Retention Basin", metric: "Volume Reduction", value: "20–50%", note: "Net volume reduction; basins delay release rather than eliminate runoff" },
    ],
  },
  {
    id: "epa-cso",
    name: "EPA Combined Sewer Overflow (CSO) Control Policy",
    shortName: "EPA CSO Policy",
    url: "https://www.epa.gov/npdes/combined-sewer-overflows-csos",
    type: "government",
    category: "general",
    contributions: [
      { solution: "Smart Storage Network", metric: "Overflow Reduction", value: "45–85%", note: "CSO volume reduction range achieved by real-time controlled storage systems per EPA CSO control policy" },
      { solution: "Smart Storage Network", metric: "Peak Flow Reduction", value: "80%", note: "South Bend RTC result used as basis for card value; consistent with Xylem case study (80%) and ASCE 2021 reporting ('more than 70%')" },
    ],
  },
  {
    id: "ncsu",
    name: "NC State University Stormwater Engineering Group",
    shortName: "NCSU Stormwater",
    url: "https://stormwater.bae.ncsu.edu/",
    type: "academic",
    category: "performance",
    contributions: [
      { solution: "Rain Garden", metric: "Peak Flow Reduction", value: "50–70%", note: "Field studies on bioretention cell peak discharge attenuation" },
      { solution: "Bioswale", metric: "Runoff Reduction", value: "70%", note: "Charlotte, NC paired-watershed bioswale study; annual runoff volume" },
      { solution: "Rain Garden", metric: "Pollutant Removal", value: "85–99%", note: "TSS, metals, and nitrogen removal rates from monitored sites" },
    ],
  },
  {
    id: "unhsc",
    name: "University of New Hampshire Stormwater Center (UNHSC)",
    shortName: "UNH Stormwater Center",
    url: "https://www.unh.edu/unhsc/",
    type: "academic",
    category: "performance",
    contributions: [
      { solution: "Permeable Pavement", metric: "Peak Flow Reduction", value: "72%", note: "Average peak flow reduction across monitored permeable pavement test cells" },
      { solution: "Permeable Pavement", metric: "Runoff Reduction", value: "83%", note: "Annual volume reduction for properly maintained permeable concrete and asphalt" },
      { solution: "Permeable Pavement", metric: "Infiltration Rate", value: "3–20 in/hr", note: "Field-measured rates; used 8 in/hr for design benchmark" },
    ],
  },
  {
    id: "philly-water",
    name: "Philadelphia Water Dept — Green City, Clean Waters",
    shortName: "Philadelphia Water Dept",
    url: "https://water.phila.gov/green-city-clean-waters/",
    type: "municipal",
    category: "cost",
    contributions: [
      { solution: "Bioswale", metric: "Cost", value: "$15–50 / linear ft", note: "Installed cost for curbside bioswale trenches in street rights-of-way" },
      { solution: "Tree Trench", metric: "Performance", value: "35–50% peak flow", note: "Silva cell tree trench field monitoring data from Philadelphia program" },
      { solution: "Tree Trench", metric: "Cost", value: "$100–200 / linear ft", note: "Silva cell + soil media + tree installation in urban sidewalk zones" },
    ],
  },
  {
    id: "nyc-dep",
    name: "NYC Department of Environmental Protection — Green Infrastructure",
    shortName: "NYC DEP Green Infra",
    url: "https://www.nyc.gov/site/dep/environment/green-infrastructure.page",
    type: "municipal",
    category: "cost",
    contributions: [
      { solution: "Tree Trench", metric: "Cost", value: "$150–250 / linear ft", note: "NYC silva cell installation costs including traffic control and restoration" },
      { solution: "Rain Garden", metric: "Cost", value: "$3–12 / sq ft", note: "Residential and right-of-way rain garden installation cost per square foot" },
      { solution: "Bioswale", metric: "Cost", value: "$45–120K / site", note: "NYC right-of-way bioswale (green infrastructure) full project costs" },
    ],
  },
  {
    id: "portland-bes",
    name: "Portland Bureau of Environmental Services",
    shortName: "Portland BES",
    url: "https://www.portland.gov/bes/stormwater/stormwater-facility-monitoring",
    type: "municipal",
    category: "performance",
    contributions: [
      { solution: "Bioswale", metric: "Annual Runoff Reduction", value: "70–76%", note: "Portland BES long-term monitoring PDFs (2002–2022): bioswale sites averaged 70%+ annual volume reduction. Full data in 'Stormwater Management Facility Monitoring Report, 2002-2013' PDF linked on this page." },
      { solution: "Bioswale", metric: "Peak Flow Reduction", value: "52%", note: "Median peak flow reduction from monitored green street facilities; documented in Portland BES 2022 monitoring update PDF on this page." },
      { solution: "Rain Garden", metric: "Capture Rate", value: "83%", note: "Portland BES monitored green street facility performance; see monitoring report PDFs on this page." },
    ],
  },
  {
    id: "georgia-swm",
    name: "Georgia Stormwater Management Manual (GSMM)",
    shortName: "Georgia SWM Manual",
    url: "https://georgiastormwater.com/",
    type: "government",
    category: "cost",
    contributions: [
      { solution: "Retention Basin", metric: "Peak Flow Reduction", value: "65–80%", note: "Wet detention pond peak flow attenuation targets for Georgia climate" },
      { solution: "Retention Basin", metric: "Runoff Captured", value: "65%", note: "Fraction of peak storm runoff diverted to basin during 100-yr design storm" },
      { solution: "Retention Basin", metric: "Cost", value: "$50K–500K / acre", note: "Wet detention basin construction cost including earthwork and outlet structure" },
    ],
  },
  {
    id: "asce",
    name: "ASCE — Manual of Engineering Practice for Stormwater Collection Systems",
    shortName: "ASCE Stormwater Manual",
    url: "https://www.asce.org/publications-and-news/civil-engineering-source/books/book-detail/9780784415009",
    type: "academic",
    category: "cost",
    contributions: [
      { solution: "Retention Basin", metric: "Cost per Acre", value: "$100K–500K", note: "Wet detention pond total construction cost range (all regions)" },
      { solution: "Permeable Pavement", metric: "Cost", value: "$8–20 / sq ft", note: "Installed cost vs conventional pavement ($3–5/sq ft) from national survey" },
      { solution: "Smart Storage Network", metric: "Storage Sizing", value: "45% utilized", note: "Best practice: fill storage to <50% during design storm to maintain reserve" },
    ],
  },
  {
    id: "emnet-xylem",
    name: "Xylem — South Bend, IN: Reduces Combined Sewer Overflow by 80%",
    shortName: "Xylem / EmNet RTC",
    url: "https://www.xylem.com/en-us/resources/case-studies/south-bend-indiana-reduces-combined-sewer-overflow-80-percent-saves-400-million/",
    type: "industry",
    category: "performance",
    contributions: [
      { solution: "Smart Storage Network", metric: "CSO Reduction", value: "80%", note: "South Bend, IN smart sewer RTC (EmNet / Xylem): 80% CSO volume reduction per Xylem case study. ASCE (2021) corroborates: 'reduce CSOs by more than 70%'. 80% used as primary figure." },
      { solution: "Smart Storage Network", metric: "Max Diversion Rate", value: "~6,500 gal/min", note: "Peak diversion (~400k gal/hr) needed to shave the 1-hr storm peak; distributed RTC network modeled on South Bend parameters" },
      { solution: "Smart Storage Network", metric: "Cost", value: "$290–780K", note: "Sensor + valve + underground tank installation for neighborhood-scale system" },
    ],
  },
  {
    id: "milwaukee-rct",
    name: "Milwaukee Metropolitan Sewerage District — RTC Study",
    shortName: "Milwaukee MMSD",
    url: "https://www.mmsd.com/what-we-do/green-infrastructure",
    type: "municipal",
    category: "performance",
    contributions: [
      { solution: "Smart Storage Network", metric: "CSO Reduction", value: "45–85%", note: "MMSD real-time basin control reduced CSO overflow volume in monitored sewersheds" },
      { solution: "Smart Storage Network", metric: "Pipe Utilization Drop", value: "105% → 90%", note: "Honest distributed-tank start: ~510k gal (~14% of runoff) captured at source and diverted to reuse/recharge" },
    ],
  },
  {
    id: "king-county",
    name: "King County (WA) Stormwater Services — Tree Trench Studies",
    shortName: "King County Stormwater",
    url: "https://kingcounty.gov/en/dept/dnrp/nature-environment/stormwater-lake-management",
    type: "municipal",
    category: "performance",
    contributions: [
      { solution: "Tree Trench", metric: "Volume Reduction", value: "24–50%", note: "Per-tree volume absorption in silva cell installations; ~500 gal/tree used as design estimate (DeepRoot field data: 200–800 gal/tree depending on cell configuration)" },
      { solution: "Tree Trench", metric: "Peak Flow Reduction", value: "35%", note: "System-scale peak flow reduction for block-length silva cell installations" },
      { solution: "Tree Trench", metric: "Cost", value: "$65–200K / block", note: "Block-scale installation including pavement removal, cells, trees, and restoration" },
    ],
  },
  {
    id: "atl-watershed-ceip",
    name: "City of Atlanta Dept of Watershed Management — CEIP System Overview",
    shortName: "Atlanta Watershed CEIP",
    url: "https://www.atlantawatershed.org/wp-content/uploads/2019/10/CEIP-SystemOverview_final.pdf",
    type: "municipal",
    category: "general",
    contributions: [
      { solution: "All GSI", metric: "Combined Sewer Age", value: "Built 1890–1930", note: "Atlanta's combined sewer system established 1875; downtown trunk lines built late 1800s–1930, placing age at 95–130+ years" },
      { solution: "All GSI", metric: "System Scale", value: "2,150 mi of sewer", note: "~2,150 miles of sanitary and combined sewers operated by Atlanta DWM; ~13 sq mi combined sewer service area in downtown core" },
    ],
  },
  {
    id: "clean-water-atl-cso",
    name: "Clean Water Atlanta — Combined Sewer Overflow History",
    shortName: "Clean Water Atlanta CSO",
    url: "https://www.cleanwateratlanta.org/combinedseweroverflows/history.htm",
    type: "municipal",
    category: "general",
    contributions: [
      { solution: "All GSI", metric: "Infrastructure Age Basis", value: "1890–1930 construction", note: "CSO facilities and combined sewer mains built late 1800s–1930; city stopped building combined sewers ~1910. Basis for 95–130 yr infrastructure age shown in simulation." },
      { solution: "Smart Storage Network", metric: "CSO Consent Decree", value: "1998 mandate", note: "Federal consent decree (1998) required $4B in upgrades due to chronic CSO failures from aging infrastructure" },
    ],
  },
  {
    id: "clean-water-atl-consent",
    name: "Clean Water Atlanta — Consent Decree History",
    shortName: "Clean Water Atlanta Consent Decree",
    url: "https://cleanwateratlanta.h2o4atl.com/index.php/history-3/",
    type: "municipal",
    category: "general",
    contributions: [
      { solution: "All GSI", metric: "Sewer Separation", value: "11 mi separated", note: "Under first consent decree, 11 miles of combined sewers in downtown Atlanta were separated; 1,574 miles evaluated citywide" },
      { solution: "Smart Storage Network", metric: "Investment Scale", value: "$4B program", note: "Scale of infrastructure investment required after consent decree; context for cost-effectiveness of GSI alternatives" },
    ],
  },
];

const TYPE_CONFIG = {
  government: { label: "GOVT AGENCY", color: "#00a8f3", bg: "rgba(0,168,243,0.08)" },
  academic:   { label: "ACADEMIC",    color: "#00d4d8", bg: "rgba(0,212,216,0.08)" },
  municipal:  { label: "MUNICIPAL",   color: "#00e18c", bg: "rgba(0,225,140,0.08)" },
  industry:   { label: "INDUSTRY",    color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
};

const SOLUTION_COLORS: Record<string, string> = {
  "Bioswale":             "#00d4d8",
  "Rain Garden":          "#00e18c",
  "Tree Trench":          "#22c55e",
  "Smart Storage Network":"#00a8f3",
  "Permeable Pavement":   "#f59e0b",
  "Retention Basin":      "#a78bfa",
  "All GSI":              "#e2f0ff",
};

export function DataSourcesPage() {
  const mono = "JetBrains Mono, monospace";

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "#040d1a",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "20px 28px 16px",
          borderBottom: "1px solid rgba(0,212,216,0.08)",
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 10, color: "#3a6080", letterSpacing: "0.12em", marginBottom: 4, fontFamily: mono }}>
          RESEARCH BIBLIOGRAPHY
        </div>
        <h2 style={{ color: "#e2f0ff", margin: "0 0 4px" }}>Data Sources</h2>
        <p style={{ margin: 0, fontSize: 12, color: "#3a5870", lineHeight: 1.5 }}>
          All cost estimates, runoff reduction percentages, and peak flow values used in this platform are derived from peer-reviewed studies,
          government design manuals, and monitored field deployments. Each source below is linked to the specific metric it contributed.
        </p>

        {/* Legend */}
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => (
            <span
              key={k}
              style={{
                fontSize: 9,
                color: v.color,
                background: v.bg,
                border: `1px solid ${v.color}30`,
                borderRadius: 3,
                padding: "2px 7px",
                fontFamily: mono,
                letterSpacing: "0.06em",
              }}
            >
              {v.label}
            </span>
          ))}
        </div>
      </div>

      {/* Sources list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px 32px" }}>
        {(["performance", "cost", "general"] as const).map((cat) => {
          const catSources = SOURCES.filter((s) => s.category === cat);
          const catCfg = CATEGORY_CONFIG[cat];
          return (
            <div key={cat} style={{ marginBottom: 32 }}>
              {/* Group header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 14,
                  paddingBottom: 10,
                  borderBottom: `1px solid ${catCfg.accent}22`,
                }}
              >
                <div style={{ width: 3, height: 28, background: catCfg.accent, borderRadius: 2, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 10, color: catCfg.accent, fontFamily: mono, fontWeight: 700, letterSpacing: "0.1em" }}>
                    {catCfg.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#3a5870", marginTop: 2 }}>
                    {catCfg.description}
                  </div>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    fontSize: 9,
                    color: catCfg.accent,
                    background: `${catCfg.accent}12`,
                    border: `1px solid ${catCfg.accent}28`,
                    borderRadius: 3,
                    padding: "3px 8px",
                    fontFamily: mono,
                    flexShrink: 0,
                  }}
                >
                  {catSources.length} SOURCE{catSources.length !== 1 ? "S" : ""}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {catSources.map((src, idx) => {
                  const tc = TYPE_CONFIG[src.type];
                  return (
                    <div
                      key={src.id}
                      style={{
                        background: `rgba(6,16,36,0.7)`,
                        border: `1px solid ${catCfg.accent}14`,
                        borderLeft: `2px solid ${catCfg.accent}40`,
                        borderRadius: 10,
                        overflow: "hidden",
                      }}
                    >
                      {/* Source header */}
                      <div
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid rgba(0,212,216,0.06)",
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 0 }}>
                          {/* Index number */}
                          <div
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              background: `${catCfg.accent}18`,
                              border: `1px solid ${catCfg.accent}35`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 9,
                              color: catCfg.accent,
                              fontFamily: mono,
                              flexShrink: 0,
                              marginTop: 1,
                            }}
                          >
                            {String(idx + 1).padStart(2, "0")}
                          </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: "#c8e0f4", fontWeight: 600, marginBottom: 3 }}>
                        {src.name}
                      </div>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 10,
                          color: "#2d6a9e",
                          fontFamily: mono,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#00a8f3")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#2d6a9e")}
                      >
                        {src.url.replace("https://", "")}
                        <ExternalLink size={9} />
                      </a>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      color: tc.color,
                      background: tc.bg,
                      border: `1px solid ${tc.color}30`,
                      borderRadius: 3,
                      padding: "3px 8px",
                      fontFamily: mono,
                      letterSpacing: "0.06em",
                      flexShrink: 0,
                    }}
                  >
                    {tc.label}
                  </span>
                </div>

                {/* Contribution rows */}
                <div style={{ padding: "8px 0" }}>
                  {src.contributions.map((c, ci) => {
                    const solColor = SOLUTION_COLORS[c.solution] || "#00d4d8";
                    return (
                      <div
                        key={ci}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "140px 160px 100px 1fr",
                          gap: 0,
                          padding: "6px 16px 6px 52px",
                          borderBottom: ci < src.contributions.length - 1 ? "1px solid rgba(0,212,216,0.04)" : "none",
                          alignItems: "start",
                        }}
                      >
                        {/* Solution chip */}
                        <div>
                          <span
                            style={{
                              fontSize: 9,
                              color: solColor,
                              background: `${solColor}12`,
                              border: `1px solid ${solColor}28`,
                              borderRadius: 3,
                              padding: "2px 7px",
                              fontFamily: mono,
                              letterSpacing: "0.04em",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {c.solution}
                          </span>
                        </div>
                        {/* Metric */}
                        <div style={{ fontSize: 10, color: "#4a7090", fontFamily: mono, paddingTop: 2 }}>
                          {c.metric}
                        </div>
                        {/* Value */}
                        <div
                          style={{
                            fontSize: 11,
                            color: solColor,
                            fontFamily: mono,
                            fontWeight: 700,
                            paddingTop: 1,
                          }}
                        >
                          {c.value}
                        </div>
                        {/* Note */}
                        <div style={{ fontSize: 11, color: "#395870", lineHeight: 1.5 }}>
                          {c.note}
                        </div>
                      </div>
                    );
                  })}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          );
        })}

        {/* Footer note */}
        <div
          style={{
            marginTop: 24,
            padding: "12px 16px",
            background: "rgba(0,168,243,0.06)",
            border: "1px solid rgba(0,168,243,0.12)",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 10, color: "#00a8f3", fontFamily: mono, marginBottom: 4, letterSpacing: "0.06em" }}>
            METHODOLOGY NOTE
          </div>
          <p style={{ fontSize: 11, color: "#3a5870", margin: 0, lineHeight: 1.6 }}>
            Where source ranges overlap, the values used in the simulation reflect a mid-range estimate appropriate for the South Downtown Atlanta context
            (high imperviousness, combined sewer system, subtropical rainfall patterns). Real-world performance varies with maintenance, soil conditions,
            antecedent moisture, and storm intensity. All cost ranges are in 2024 USD and exclude land acquisition.
          </p>
          <p style={{ fontSize: 11, color: "#3a5870", margin: "10px 0 0", lineHeight: 1.6 }}>
            <span style={{ color: "#00a8f3" }}>Annual vs. single-event:</span> the runoff-reduction percentages above (e.g. bioswale 70%, permeable pavement 83%,
            rain garden 65–97%) are <em>annual volume reductions</em> from long-term monitoring — they aggregate hundreds of small storms a practice fully
            absorbs. They are <em>not</em> the fraction a practice captures during a single 2.6 in/hr cloudburst. The simulation's South Downtown cards instead
            report <em>single-event capture sized to the land actually available</em>: each practice's storage (void ratio × media/reservoir depth + ponding)
            and footprint were checked against the ~43-acre sub-basin (~35 impervious acres, available-land score 22) per Georgia Stormwater Management Manual
            and EPA GI sizing. Capturing the literature's annual % against this one cloudburst would require multiples of the zone's open land — so achievable
            single-event capture is lower: permeable pavement ~38% (~7 acres of reservoir), tree trench / bioswale ~10% each, rain garden ~6%, and surface
            retention basins are not feasible here (they need 1.5–2 acres). These are the validated figures shown on the solution cards.
          </p>
        </div>
      </div>
    </div>
  );
}
