import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, CalendarX, Camera, FileWarning, ArrowRight } from "lucide-react";
import { useApi, useScopeQuery, pct, int } from "../core";
import { Loading, ErrorBox } from "../ui";
import { LagHistogram, Threshold } from "../viz";

export default function Compliance() {
  const q = useScopeQuery();
  const { data, error, loading } = useApi(`/api/compliance?${q}`);
  const [onlyBreaches, setOnly] = useState(true);
  useEffect(() => { document.title = "Compliance · Sentinel"; }, []);
  if (loading && !data) return <div className="page"><Loading /></div>;
  if (error) return <div className="page"><ErrorBox error={error} /></div>;
  const s = data.summary;
  const scst = data.scst.filter((r) => r.fy !== "2026-27").sort((a, b) => (a.scOk && a.stOk) - (b.scOk && b.stOk) || a.constituency.localeCompare(b.constituency) || a.fy.localeCompare(b.fy));
  const rows = onlyBreaches ? scst.filter((r) => !r.scOk || !r.stOk) : scst;
  const caseLink = (signal) => `/desk/cases?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(q)), signal, level: "" })}`;

  const RULES = [
    { icon: Clock, title: "Sanction within 45 days", clause: "District Authority sanctions or rejects within 45 days of receiving the recommendation.", value: pct(s.sanctionWithin45, 1), note: `median ${s.medianSanctionLag} days`, signal: "SANCTION_45", good: s.sanctionWithin45 >= 0.95 },
    { icon: CalendarX, title: "Completion within one year", clause: "Works are ordinarily completed within one year of sanction; exceptions are recorded in the sanction order.", value: pct(s.onTimeCompletion, 1), note: `${int(data.overdue)} open works past deadline`, signal: "DEADLINE", good: s.onTimeCompletion >= 0.9 },
    { icon: Camera, title: "Photo with every payment", clause: "Implementing agencies upload asset photographs at each stage of payment processing on eSAKSHI.", value: pct(s.photoCoverage, 1), note: `${int(data.photo.missing)} of ${int(data.photo.payments)} payments without a photo`, signal: "PHOTO", good: s.photoCoverage >= 0.995 },
    { icon: FileWarning, title: "Mark complete after final payment", clause: "Only works the agency marks complete count as completed on the public dashboard.", value: int(data.unmarked), note: "fully paid, not yet marked complete", signal: "MARK_COMPLETE", good: data.unmarked === 0 },
  ];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Compliance · {data.scope.label}</div>
          <h1 className="h1">The scheme’s own rules, <em>checked on every work</em></h1>
          <p className="lede">Each rule below comes from the MPLADS Guidelines 2023 or the eSAKSHI process. Open any rule to see the works that break it.</p>
        </div>
      </div>
      <div className="rule-grid">
        {RULES.map((r) => (
          <Link key={r.title} to={caseLink(r.signal)} className={`rule-card card ${r.good ? "good" : "bad"}`}>
            <div className="rule-top"><r.icon size={18} /><span className="label">{r.good ? "Within norm" : "Needs attention"}</span></div>
            <div className="rule-value tnum">{r.value}</div>
            <div className="h3" style={{ fontSize: 14 }}>{r.title}</div>
            <div className="muted" style={{ fontSize: 12.5, margin: "2px 0 10px" }}>{r.note}</div>
            <div className="rule-clause">{r.clause}</div>
            <span className="link" style={{ fontSize: 12.5, marginTop: 10 }}>See the works <ArrowRight size={12} /></span>
          </Link>
        ))}
      </div>

      <div className="brief-grid" style={{ marginTop: 18 }}>
        <div className="card">
          <div className="card-head"><h2 className="h2">Days from recommendation to sanction</h2><span className="aside">works sanctioned in {data.scope.label}</span></div>
          <div style={{ padding: "12px 20px 18px" }}><LagHistogram rows={data.lagHistogram} /></div>
        </div>
        <div className="card">
          <div className="card-head"><h2 className="h2">By {data.byUnit.length ? (data.scope.level === "India" ? "state" : data.scope.level === "state" ? "district" : "constituency") : "unit"}</h2><span className="aside">sanction on time · completed on time</span></div>
          <table className="table" style={{ marginTop: 10 }}>
            <thead><tr><th>Area</th><th className="right">Works</th><th>Sanction ≤ 45 days</th><th>Completed on time</th></tr></thead>
            <tbody>
              {data.byUnit.map((u) => (
                <tr key={u.name}><td style={{ fontWeight: 500 }}>{u.name}</td><td className="right tnum">{u.works}</td>
                  <td><Threshold value={u.sanctionWithin45 || 0} target={0.95} label="Sanctioned within 45 days" /></td>
                  <td><Threshold value={u.onTime || 0} target={0.9} label="Completed on time" /></td></tr>
              ))}
              {!data.byUnit.length && <tr><td colSpan={4} className="muted">Single constituency in scope — see the rule cards above.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head">
          <h2 className="h2">SC / ST share of each MP’s annual entitlement</h2>
          <span className="aside">
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer" }}><input type="checkbox" checked={onlyBreaches} onChange={(e) => setOnly(e.target.checked)} /> only shortfalls</label>
          </span>
        </div>
        <p className="muted" style={{ padding: "4px 22px 0", margin: 0, fontSize: 13 }}>Guidelines 2023: MPs recommend works worth at least 15% of the annual entitlement for areas inhabited by Scheduled Castes and 7.5% for Scheduled Tribes. Measured on sanctioned value against ₹5 crore per year; the line marks the requirement. A shortfall can have a valid reason — for example little SC or ST population in the constituency — so it asks for an explanation, not a penalty.</p>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ marginTop: 10 }}>
            <thead><tr><th>Constituency</th><th>Year</th><th style={{ width: "28%" }}>SC areas (15%)</th><th style={{ width: "28%" }}>ST areas (7.5%)</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.constituency + r.fy}>
                  <td><b style={{ fontWeight: 500 }}>{r.constituency}</b><div className="muted" style={{ fontSize: 12 }}>{r.district}, {r.state}</div></td>
                  <td className="tnum">{r.fy}</td>
                  <td><Threshold value={r.scShare} target={0.15} label="SC share" /></td>
                  <td><Threshold value={r.stShare} target={0.075} label="ST share" /></td>
                  <td>{r.scOk && r.stOk ? <span className="chip">Meets both</span> : <span className="chip high">{[!r.scOk && "SC", !r.stOk && "ST"].filter(Boolean).join(" & ")} shortfall</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="empty">Every constituency-year in scope meets both shares.</div>}
        </div>
      </div>
    </div>
  );
}
