import { CHECK_ICON, IOutlier as Gauge } from "./icons";
import { LEVEL_LABEL, DECISION_LABEL, date } from "./core";

export function Sev({ level, children }) {
  return <span className={`sev ${level}`}>{children || LEVEL_LABEL[level] || level}</span>;
}

export const SIGNAL_ICON = CHECK_ICON;
export const SIGNAL_SHORT = {
  SANCTION_45: "45-day sanction", DEADLINE: "Past deadline", COST: "Cost vs peers", COST_OVERRUN: "Cost overrun", PHOTO: "No photo", PAY_PROGRESS: "Paid ahead",
  MARK_COMPLETE: "Not marked complete", DUPLICATE: "Duplicate?", SPLIT: "Split work?", NOT_PERMISSIBLE: "Not permissible?", VENDOR: "Vendor share", ML_OUTLIER: "Outlier", DELAY_RISK: "Likely late",
};

export function SignalChip({ s }) {
  const Icon = SIGNAL_ICON[s.code] || Gauge;
  return <span className={`chip ${s.severity}`} title={s.title}><Icon size={14} />{SIGNAL_SHORT[s.code] || s.title}</span>;
}

export function Loading({ label = "Reading the register…" }) {
  return <div className="loading"><div><div className="bar" /><div style={{ marginTop: 10, fontSize: 12.5 }}>{label}</div></div></div>;
}
export function ErrorBox({ error }) {
  return <div className="card card-pad" style={{ borderColor: "#e9b9b2", color: "var(--high)" }}>{error?.message || "Something went wrong."} Is the backend running on port 4000?</div>;
}

export function Stamp({ decision, when, thump }) {
  if (!decision) return null;
  return (
    <span className={`stamp ${decision}${thump ? " thump" : ""}`}>
      {DECISION_LABEL[decision]}
      {when && <small>{date(when)}</small>}
    </span>
  );
}

export function Progress({ value, tone = "var(--forest)" }) {
  return (
    <span className="progress-mini">
      <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: tone, display: "block" }} /></span>
      <span className="tnum">{value}%</span>
    </span>
  );
}

export function Stat({ label, value, note, tone }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="stat-value tnum" style={tone ? { color: tone } : undefined}>{value}</div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  );
}
