import React from "react";
import { levelColor } from "../data";

export function KpiCard({ label, value, sub, icon: Icon, accent }) {
  return (
    <div className="panel kpi-card">
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <Icon size={16} color={accent || "#8B93A7"} />
      </div>
      <div className="serif-font kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export function ScoreRing({ score, level }) {
  const c = levelColor(level);
  const r = 20,
    circ = 2 * Math.PI * r;
  const off = circ - (score / 100) * circ;
  return (
    <svg width="52" height="52" viewBox="0 0 52 52">
      <circle cx="26" cy="26" r={r} stroke="#232D42" strokeWidth="5" fill="none" />
      <circle
        cx="26"
        cy="26"
        r={r}
        stroke={c}
        strokeWidth="5"
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="30" textAnchor="middle" fontSize="13" fill="#E8EAF0" fontFamily="Inter, sans-serif">
        {score}
      </text>
    </svg>
  );
}
