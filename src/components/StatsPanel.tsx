import {
  Leaf,
  Trees,
  Umbrella,
  Waves,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DroughtPrediction, ImpactStats } from "../types";

type StatsPanelProps = {
  stats: ImpactStats;
  droughtPrediction: DroughtPrediction;
};

export function StatsPanel({ stats, droughtPrediction }: StatsPanelProps) {
  const chartData = [
    { name: "Park", gallons: stats.gallonsSentToParksTrees },
    { name: "River", gallons: stats.gallonsSentToRiverRecharge },
    { name: "Garden", gallons: stats.gallonsSentToRainGardens },
    { name: "Farm", gallons: stats.gallonsSentToUrbanFarms },
  ];

  return (
    <div className="panel-section stats-section">
      <div className="section-row">
        <div>
          <div className="section-kicker">Live Impact</div>
          <h3>{formatNumber(stats.gallonsCaptured)} gal captured</h3>
        </div>
        <div className="risk-pill">{stats.floodRiskReductionPercent}% less risk</div>
      </div>

      <div className="stat-grid demo-stat-grid">
        <Stat icon={<Umbrella size={17} />} label="Away from streets" value={`${formatNumber(stats.gallonsRedirectedAwayFromStreets)} gal`} />
        <Stat icon={<Trees size={17} />} label="Park detention" value={`${formatNumber(stats.gallonsSentToParksTrees)} gal`} />
        <Stat icon={<Waves size={17} />} label="Waterway recharge" value={`${formatNumber(stats.gallonsSentToRiverRecharge)} gal`} />
        <Stat icon={<Leaf size={17} />} label="Farm + stored reuse" value={`${formatNumber(stats.gallonsSentToUrbanFarms + stats.gallonsStoredForReuse)} gal`} />
      </div>

      <div className="chart-shell">
        <ResponsiveContainer height={150} width="100%">
          <BarChart data={chartData} margin={{ left: -20, right: 4, top: 8, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
            <Tooltip formatter={(value) => `${formatNumber(Number(value))} gal`} />
            <Bar dataKey="gallons" fill="#0ea5e9" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="prediction-strip">
        <span>Drought probability</span>
        <strong>{Math.round(droughtPrediction.droughtProbability * 100)}%</strong>
        <em>{droughtPrediction.predictedCondition}</em>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="stat-card">
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}
