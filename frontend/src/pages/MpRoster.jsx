import React, { useEffect, useState } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRole } from "../context/RoleContext";
import { api } from "../api/client";
import { fmt } from "../data";

function riskColor(score) {
  if (score >= 55) return "#C0392B";
  if (score >= 28) return "#C9A227";
  return "#2F9E6E";
}

export default function MpRoster() {
  const { role, jurisdiction } = useRole();
  const [mps, setMps] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (role === "state" && jurisdiction) params.state = jurisdiction;
    if (role === "district" && jurisdiction) params.district = jurisdiction;
    api.getMps(params).then((data) => {
      setMps(data || []);
      setLoading(false);
    });
  }, [role, jurisdiction]);

  return (
    <div>
      <div className="panel scope-note">
        Showing the <strong>per-work dataset</strong> only ({mps.length} MP{mps.length !== 1 ? "s" : ""} currently
        loaded). This is separate from "National MP Data" in the sidebar, which has 732 MPs from a different,
        free government source. If this list looks short, it's because the per-work dataset still needs a
        bigger real CSV uploaded via Data Ingestion \u2014 it hasn't been replaced yet.
      </div>
      <div className="panel-label" style={{ marginBottom: 12 }}>
        All Members of Parliament in scope, ranked by risk &mdash; this is the actual oversight view: browse
        everyone, then drill into whoever looks off, rather than each MP only checking their own record.
      </div>

      {loading && <div className="empty-state">Loading MP roster...</div>}
      {!loading && mps.length === 0 && <div className="empty-state">No MPs in scope for this jurisdiction yet.</div>}

      {mps.map((m) => (
        <div key={m.mp + m.constituency} className="panel hoverable mp-row" onClick={() => navigate("/app/alerts")}>
          <div className="mp-row-score" style={{ color: riskColor(m.maxScore) }}>
            {m.maxScore}
          </div>
          <div className="mp-row-main">
            <div className="mp-row-name">{m.mp}</div>
            <div className="mp-row-meta">
              {m.constituency} &middot; {m.district} &middot; {m.state}
            </div>
          </div>
          <div className="mp-row-stats">
            <div className="mp-row-stat">
              <span className="mono-font">{fmt(m.sanctioned)}</span>
              <span className="dim"> sanctioned</span>
            </div>
            <div className="mp-row-stat">{m.worksCount} works</div>
          </div>
          <div className="mp-row-flags">
            {m.highRisk > 0 && (
              <span className="danger-text mp-flag">
                <AlertTriangle size={12} /> {m.highRisk} high-risk
              </span>
            )}
            {m.mediumRisk > 0 && <span className="mp-flag" style={{ color: "#C9A227" }}>{m.mediumRisk} medium</span>}
            {m.highRisk === 0 && m.mediumRisk === 0 && <span className="success-text mp-flag">clean</span>}
          </div>
          <ChevronRight size={16} color="#6B7386" />
        </div>
      ))}
    </div>
  );
}
