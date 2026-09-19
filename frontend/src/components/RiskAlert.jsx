import React, { useEffect, useState } from "react";
import { ChevronRight, X, Camera, CheckCircle2 } from "lucide-react";
import { ScoreRing } from "./Kpi";
import { fmt, levelColor, ledger as staticLedger } from "../data";
import { api } from "../api/client";

export function RiskAlertCard({ w, onOpen }) {
  return (
    <button onClick={() => onOpen(w)} className="panel hoverable alert-card">
      <ScoreRing score={w.score} level={w.level} />
      <div className="alert-main">
        <div className="alert-name">{w.name}</div>
        <div className="alert-meta">
          {w.id} &middot; {w.constituency} &middot; {w.contractor}
        </div>
      </div>
      <div className="alert-amount">
        <div className="mono-font alert-amount-value">{fmt(w.utilized)}</div>
        <div className="alert-updated">{w.lastUpdated}</div>
      </div>
      <ChevronRight size={16} color="#6B7386" />
    </button>
  );
}

export function DetailPanel({ w, onClose }) {
  const [wLedger, setWLedger] = useState(staticLedger.filter((l) => l.work === w?.id));
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (!w) return;
    setRequested(false);
    api.getWorkDetail(w.id).then((data) => {
      if (data && data.ledger) setWLedger(data.ledger);
    });
  }, [w]);

  if (!w) return null;

  const handleRequest = async () => {
    setRequesting(true);
    const res = await api.requestFieldVerification(w.id);
    setRequesting(false);
    if (res && res.entry) {
      setWLedger((prev) => [...prev, res.entry]);
      setRequested(true);
    }
  };

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <div>
          <div className="detail-id">{w.id}</div>
          <div className="serif-font detail-title">{w.name}</div>
        </div>
        <button onClick={onClose} className="icon-btn">
          <X size={18} color="#8B93A7" />
        </button>
      </div>

      <div className="detail-score-row">
        <ScoreRing score={w.score} level={w.level} />
        <div className="detail-level">
          Risk level:{" "}
          <span style={{ color: levelColor(w.level), textTransform: "capitalize" }}>{w.level}</span>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Why this was flagged</div>
        {w.reasons.map((r, i) => (
          <div key={i} className="reason-row">
            <div className="reason-label">
              {r.label.includes("Isolation Forest") && <span className="ml-badge">ML</span>}
              {r.label}
            </div>
            <div className="reason-bar-track">
              <div
                className="reason-bar-fill"
                style={{ width: r.weight + "%", background: levelColor(w.level) }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="detail-section">
        <div className="detail-section-title">Ledger history for this work</div>
        {wLedger.length === 0 && <div className="ledger-empty">No entries yet.</div>}
        {wLedger.map((l, i) => (
          <div key={l.seq || l.id || i} className="mono-font ledger-mini-row">
            {l.action} <span className="dim">&mdash; {(l.hash || "").slice(0, 6)}...{(l.hash || "").slice(-4)}</span>
          </div>
        ))}
      </div>

      {requested ? (
        <div className="verify-banner detail-cta">
          <CheckCircle2 size={13} style={{ marginRight: 6 }} />
          Field verification requested &mdash; logged to the ledger.
        </div>
      ) : (
        <button className="gold-btn detail-cta" onClick={handleRequest} disabled={requesting}>
          <Camera size={14} /> {requesting ? "Submitting..." : "Request field verification"}
        </button>
      )}
    </div>
  );
}
