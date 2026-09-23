import React from "react";
import { useNavigate } from "react-router-dom";
import { Shield, AlertTriangle, Lock, TrendingUp, Users, ArrowRight } from "lucide-react";

const FEATURES = [
  { icon: AlertTriangle, title: "Risk-based alerts", copy: "Review sanction comparisons, approval batches and matching descriptions, with explicit limits on what the available evidence establishes." },
  { icon: Lock, title: "Tamper-evident ledger", copy: "Review decisions create linked event hashes. Verify local chain consistency and export the supporting case snapshot." },
  { icon: TrendingUp, title: "Trend & forecast", copy: "Real month-by-month sanctioned-fund trends, with a transparent linear projection \u2014 no black-box claims." },
  { icon: Users, title: "Four jurisdiction views", copy: "MP, District Authority, State Nodal, and Ministry each see a dashboard scoped and shaped for their level." },
];

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="landing">
      <div className="landing-nav">
        <div className="landing-brand">
          <Shield size={20} color="#C9A227" />
          <span className="serif-font">Sentinel</span>
        </div>
        <button className="gold-btn" onClick={() => navigate("/login")}>
          Sign in <ArrowRight size={14} />
        </button>
      </div>

      <div className="landing-hero">
        <div className="landing-eyebrow">MPLADS Fund Monitoring &middot; SIH 2026</div>
        <h1 className="serif-font landing-title">
          Know which MPLADS works need a closer look.
        </h1>
        <p className="landing-sub">
          Review work records, inspect unusual patterns, and record the evidence behind
          each decision. Missing payment and completion data stays visible as a gap
          to investigate. A review score is not a finding of fraud.
        </p>
        <div className="landing-cta-row">
          <button className="gold-btn landing-cta-primary" onClick={() => navigate("/login")}>
            Enter platform <ArrowRight size={14} />
          </button>
          <span className="landing-cta-note">Demo login &mdash; no real credentials needed</span>
        </div>
      </div>

      <div className="landing-features">
        {FEATURES.map((f) => (
          <div key={f.title} className="panel landing-feature-card">
            <f.icon size={20} color="#C9A227" />
            <div className="serif-font landing-feature-title">{f.title}</div>
            <div className="landing-feature-copy">{f.copy}</div>
          </div>
        ))}
      </div>

      <div className="landing-footer">
        Local prototype using a bundled historical sample or user imports. Data provenance
        requires verification. Photo and cross-scheme checks are labelled concept demonstrations.
      </div>
    </div>
  );
}
