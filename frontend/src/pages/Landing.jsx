import React from "react";
import { useNavigate } from "react-router-dom";
import { Shield, AlertTriangle, Lock, TrendingUp, Users, ArrowRight } from "lucide-react";

const FEATURES = [
  { icon: AlertTriangle, title: "Risk-based alerts", copy: "Every work is scored against real cost, batch-approval, duplicate, and delay signals \u2014 with a plain-language reason, not just a number." },
  { icon: Lock, title: "Tamper-evident ledger", copy: "Every fund release and flag is hash-chained. Anyone can verify the chain hasn't been altered." },
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
          See where MPLAD funds actually go &mdash; before it becomes a problem.
        </h1>
        <p className="landing-sub">
          Sentinel analyzes sanctions, expenditure, and work execution data to surface cost
          anomalies, duplicate works, and irregular approval patterns \u2014 with an explanation
          for every flag, and a tamper-evident record of every action.
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
        Built against real MPLADS records (data.gov.in / MoSPI). Some capabilities are marked as
        concept demos where public data doesn't yet exist \u2014 shown honestly, not hidden.
      </div>
    </div>
  );
}
