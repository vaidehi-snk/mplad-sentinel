import React, { useEffect, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { api } from "../api/client";

function levelColor(level) {
  return level === "high" ? "#C0392B" : level === "medium" ? "#C9A227" : "#2F9E6E";
}

export default function NationalMpPerformance() {
  const [rows, setRows] = useState([]);
  const [allStates, setAllStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState("");

  useEffect(() => {
    api.getMpPerformance().then((data) => {
      if (data) setAllStates([...new Set(data.map((r) => r.state))].sort());
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    api.getMpPerformance(stateFilter ? { state: stateFilter } : {}).then((data) => {
      setRows(data || []);
      setLoading(false);
    });
  }, [stateFilter]);

  return (
    <div>
      <div className="panel concept-banner">
        <Info size={15} color="#C9A227" />
        <span>
          Real, free, national data direct from the Ministry's own 2016-17 Annual Report (mplads.gov.in) &mdash;
          732 real MPs across 29 states, transcribed from the official PDF. This is aggregate annual data
          (release, expenditure, works recommended/sanctioned/completed per MP) rather than individual
          work-level records, so it can't feed the per-work cost-anomaly or duplicate-work detectors &mdash;
          but it covers far more real MPs than the per-work dataset currently loaded.
        </span>
      </div>

      <div className="alerts-toolbar">
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className="citizen-select" style={{ minWidth: 220 }}>
          <option value="">All states</option>
          {allStates.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading && <div className="empty-state">Loading national MP performance data...</div>}

      {!loading &&
        rows.map((r, i) => (
          <div key={r.mp + r.constituency + i} className="panel mp-row" style={{ cursor: "default" }}>
            <div className="mp-row-score" style={{ color: levelColor(r.level) }}>
              {r.concernScore}
            </div>
            <div className="mp-row-main">
              <div className="mp-row-name">{r.mp}</div>
              <div className="mp-row-meta">
                {r.constituency} &middot; {r.state} &middot; {r.house}
              </div>
            </div>
            <div className="mp-row-stats">
              <div className="mp-row-stat">
                Utilization: <span className="mono-font">{r.utilizationPct ?? "N/A"}%</span>
              </div>
              <div className="mp-row-stat">
                Completion: <span className="mono-font">{r.completionPct ?? "N/A"}%</span>
              </div>
            </div>
            <div className="mp-row-flags">
              {r.level === "high" ? (
                <span className="danger-text mp-flag">
                  <AlertTriangle size={12} /> flagged
                </span>
              ) : (
                <span className="dim mp-flag">{r.reasons[0]}</span>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}
