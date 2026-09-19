import React, { useEffect, useMemo, useState } from "react";
import { Building2, ArrowUpRight, AlertTriangle, FileText } from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { KpiCard } from "../components/Kpi";
import { useRole } from "../context/RoleContext";
import { utilizationTrend, fmt } from "../data";
import { api } from "../api/client";

function groupBy(works, keyFn) {
  const map = {};
  for (const w of works) {
    const key = keyFn(w) || "Unknown";
    if (!map[key]) map[key] = { key, count: 0, sanctioned: 0, highRisk: 0 };
    map[key].count += 1;
    map[key].sanctioned += w.sanctioned;
    if (w.level === "high") map[key].highRisk += 1;
  }
  return Object.values(map).sort((a, b) => b.highRisk - a.highRisk || b.sanctioned - a.sanctioned);
}

function BreakdownTable({ title, rows, keyLabel }) {
  return (
    <div className="panel chart-panel breakdown-panel">
      <div className="panel-label">{title}</div>
      <table className="breakdown-table">
        <thead>
          <tr>
            <th>{keyLabel}</th>
            <th>Works</th>
            <th>Sanctioned</th>
            <th>High-risk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>{r.key}</td>
              <td>{r.count}</td>
              <td className="mono-font">{fmt(r.sanctioned)}</td>
              <td className={r.highRisk > 0 ? "danger-text" : ""}>{r.highRisk}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Overview() {
  const { scopedWorks, role } = useRole();
  const totalSanctioned = scopedWorks.reduce((s, w) => s + w.sanctioned, 0);
  const totalUtilized = scopedWorks.reduce((s, w) => s + w.utilized, 0);
  const highRisk = scopedWorks.filter((w) => w.level === "high").length;

  const [trend, setTrend] = useState(null);
  useEffect(() => {
    api.getTrends().then((data) => {
      if (data && data.points && data.points.length) setTrend(data);
    });
  }, [scopedWorks.length]);

  const chartData = useMemo(() => {
    if (trend) {
      return [
        ...trend.points.map((p) => ({ label: p.label, sanctioned: p.sanctioned })),
        ...trend.forecast.map((f) => ({ label: f.label, forecastSanctioned: f.sanctioned })),
      ];
    }
    return utilizationTrend.map((p) => ({ label: p.month, sanctioned: p.utilized }));
  }, [trend]);

  const breakdown = useMemo(() => {
    if (role === "ministry") return { title: "Breakdown by state", keyLabel: "State", rows: groupBy(scopedWorks, (w) => w.state) };
    if (role === "state") return { title: "Breakdown by district", keyLabel: "District", rows: groupBy(scopedWorks, (w) => w.district || w.constituency) };
    if (role === "district") return { title: "Breakdown by constituency", keyLabel: "Constituency", rows: groupBy(scopedWorks, (w) => w.constituency) };
    return null;
  }, [role, scopedWorks]);

  return (
    <>
      <div className="kpi-row">
        <KpiCard label="Sanctioned" value={fmt(totalSanctioned)} icon={Building2} />
        <KpiCard
          label="Utilized"
          value={fmt(totalUtilized)}
          sub={totalSanctioned ? Math.round((totalUtilized / totalSanctioned) * 100) + "% of sanctioned" : ""}
          icon={ArrowUpRight}
          accent="#2F9E6E"
        />
        <KpiCard
          label="High-risk works"
          value={highRisk}
          sub="flagged by Sentinel engine"
          icon={AlertTriangle}
          accent="#C0392B"
        />
        <KpiCard label="Works tracked" value={scopedWorks.length} icon={FileText} />
      </div>

      <div className="panel chart-panel">
        <div className="panel-label">
          Sanctioned funds by month {trend ? "\u2014 real data, dashed = linear projection" : "\u2014 illustrative"}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9A227" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#C9A227" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1E2A44" vertical={false} />
            <XAxis dataKey="label" stroke="#6B7386" fontSize={11} />
            <YAxis stroke="#6B7386" fontSize={11} tickFormatter={(v) => fmt(v)} />
            <Tooltip
              contentStyle={{ background: "#121B2E", border: "1px solid #232D42", fontSize: 12 }}
              formatter={(v) => fmt(v)}
            />
            <Area type="monotone" dataKey="sanctioned" stroke="#C9A227" fill="url(#gold)" strokeWidth={2} connectNulls />
            {trend && (
              <Line
                type="monotone"
                dataKey="forecastSanctioned"
                stroke="#C9A227"
                strokeDasharray="4 4"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {breakdown && breakdown.rows.length > 0 && (
        <BreakdownTable title={breakdown.title} rows={breakdown.rows} keyLabel={breakdown.keyLabel} />
      )}
    </>
  );
}
