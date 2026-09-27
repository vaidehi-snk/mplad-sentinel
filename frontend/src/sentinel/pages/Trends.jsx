import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useApi, useScopeQuery, crore, date, int } from "../core";
import { Loading, ErrorBox, Progress } from "../ui";
import { MonthlyChart } from "../viz";

export default function Trends() {
  const q = useScopeQuery();
  const { data, error, loading } = useApi(`/api/trends?${q}`);
  useEffect(() => { document.title = "Trends & forecast · Sentinel"; }, []);
  if (loading && !data) return <div className="page"><Loading /></div>;
  if (error) return <div className="page"><ErrorBox error={error} /></div>;
  const f = data.forecast;
  const maxCr = Math.max(1, ...data.byCategory.map((c) => c.cr));
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Trends & forecast</div>
          <h1 className="h1">What happened, and <em>what is likely next</em></h1>
          <p className="lede">Monthly flow of sanctions and vendor payments, and a forecast of which open works will miss their deadline — so attention arrives before the deadline, not after.</p>
        </div>
      </div>

      <div className="forecast card">
        <div className="forecast-lead">
          <div className="label" style={{ color: "var(--brass-2)" }}>Early warning · deadlines up to 31 Dec 2026</div>
          <div className="forecast-num serif"><span className="tnum">{f.likelyLate}</span> of <span className="tnum">{f.dueSoon}</span></div>
          <div style={{ fontSize: 15 }}>open works due soon are likely to miss their deadline</div>
          <div className="forecast-model">Logistic model on sanction lag, agency workload, vendor track record, work type and size · hold-out AUC <b>{data.model.testAuc}</b> on {int(data.model.testedOn)} works ({data.model.split})</div>
        </div>
        <div className="forecast-list">
          {f.items.map((w) => (
            <Link key={w.id} to={`/desk/cases/${encodeURIComponent(w.id)}`} className="ew-row">
              <span className="ew-risk tnum" style={w.delayRisk < 0.4 ? { background: "var(--clear-soft)", color: "var(--clear)" } : undefined}>{Math.round((w.delayRisk || 0) * 100)}%</span>
              <span style={{ minWidth: 0 }}><span className="first-title" lang={w.lang} style={{ fontSize: 13 }}>{w.title}</span>
                <span className="muted" style={{ fontSize: 11.5 }}>{w.district} · due {date(w.deadline)} · <Progress value={w.progress} /></span></span>
            </Link>
          ))}
          {!f.items.length && <div className="empty">No open works fall due before the end of 2026 in this scope.</div>}
        </div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head"><h2 className="h2">Month by month</h2><span className="aside">bars: sanctioned · line: paid to vendors · ₹ crore · hover for detail</span></div>
        <div style={{ padding: "10px 18px 16px" }}><MonthlyChart rows={data.monthly} height={240} /></div>
      </div>

      <div className="card" style={{ marginTop: 18 }}>
        <div className="card-head"><h2 className="h2">By type of work</h2><span className="aside">sanctioned value · high-priority count</span></div>
        <div style={{ padding: "12px 22px 18px" }}>
          {data.byCategory.map((c) => (
            <div key={c.category} className="cat-row">
              <span>{c.category}</span>
              <span className="bar-track" style={{ height: 10 }}><span className="bar-fill" style={{ width: `${(c.cr / maxCr) * 100}%`, background: "var(--forest-2)", display: "block" }} /></span>
              <span className="tnum">{crore(c.cr)}</span>
              <span className="tnum muted">{int(c.works)} works</span>
              <span className="tnum" style={{ color: c.high ? "var(--high)" : "var(--muted)" }}>{c.high} high</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
