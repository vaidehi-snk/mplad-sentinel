import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { useApi, useDesk, useScopeQuery, crore, int, pct, rupees, date, ROLE_SHORT } from "../core";
import { Sev, SignalChip, Loading, ErrorBox, SIGNAL_ICON, SIGNAL_SHORT, Progress } from "../ui";
import { FundRibbon, IndiaMap, MonthlyChart } from "../viz";

export default function Brief() {
  const q = useScopeQuery();
  const { desk } = useDesk();
  const { data, error, loading } = useApi(`/api/brief?${q}`);
  const [, setSp] = useSearchParams();
  useEffect(() => { document.title = `Brief · ${data?.scope.label || "Sentinel"}`; }, [data]);
  if (loading && !data) return <div className="page"><Loading /></div>;
  if (error) return <div className="page"><ErrorBox error={error} /></div>;
  const { summary: s, scope } = data;
  const attention = s.levels.high + s.levels.medium;
  const drillKey = { India: "state", state: "district", district: "constituency" }[scope.level];
  const drill = (name) => {
    const n = new URLSearchParams(q); n.set(drillKey, name);
    if (drillKey === "district") n.delete("constituency");
    setSp(n);
  };
  const points = data.breakdown.map((b) => ({ name: b.name, lat: b.lat, lng: b.lng, size: b.sanctionedCr, value: b.high, share: (b.high + b.medium) / b.works, sanctionedCr: b.sanctionedCr }));
  const signals = Object.entries(s.bySignal).filter(([k]) => k !== "VENDOR").sort((a, b) => b[1] - a[1]);
  const maxSig = Math.max(1, ...signals.map(([, v]) => v));
  const caseLink = (params) => `/desk/cases?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(q)), ...params })}`;

  return (
    <div className="page brief">
      <div className="eyebrow">{ROLE_SHORT[desk.persona.role]} brief · {scope.label}</div>
      <h1 className="headline">
        Across <span className="hl">{int(s.works)} works</span> in {scope.label},{" "}
        <Link to={caseLink({ level: "high,medium" })} className="hl-alert">{int(attention)} need attention</Link> —{" "}
        <span className="hl">{crore(s.atRiskCr)}</span> of sanctions.{" "}
        <span className="muted-serif">{int(s.levels.high)} are high priority{data.reviewed ? `, ${data.reviewed} already reviewed` : ""}.</span>
      </h1>

      <div className="card ribbon-card">
        <div className="card-head"><h2 className="h2">Where the money is</h2><span className="aside">Recommended → sanctioned → paid → marked complete · {scope.label}</span></div>
        <div style={{ padding: "8px 22px 14px" }}><FundRibbon funnel={s.funnel} /></div>
      </div>

      <div className="brief-grid">
        <div className="card">
          <div className="card-head">
            <h2 className="h2">{points.length ? `${scope.level === "India" ? "States" : scope.level === "state" ? "Districts" : "Constituencies"} at a glance` : "Your recommendations"}</h2>
            <span className="aside">{points.length ? "circle = sanctioned value · colour = share needing attention" : ""}</span>
          </div>
          {points.length ? (
            <div style={{ padding: "4px 12px 12px" }}>
              <IndiaMap points={points} onPick={drillKey ? drill : null} />
              <div className="unit-table">
                {data.breakdown.slice(0, 6).map((b) => (
                  <button key={b.name} className="unit-row" onClick={() => drill(b.name)}>
                    <span style={{ fontWeight: 500 }}>{b.name}</span>
                    <span className="muted tnum">{crore(b.sanctionedCr)}</span>
                    <span className="tnum" style={{ color: "var(--high)", fontWeight: 600 }}>{b.high} high</span>
                    <span className="muted tnum">{pct(b.sanctionWithin45)} on-time sanction</span>
                    <ChevronRight size={14} className="muted" />
                  </button>
                ))}
              </div>
            </div>
          ) : <StatusBreakdown levels={s.levels} funnel={s.funnel} />}
        </div>

        <div className="card">
          <div className="card-head"><h2 className="h2">Open these first</h2><Link to={caseLink({ level: "high" })} className="aside link">All {int(s.levels.high)} high-priority <ArrowUpRight size={12} /></Link></div>
          <ol className="first-list">
            {data.top.map((w, i) => (
              <li key={w.id}>
                <Link to={`/desk/cases/${encodeURIComponent(w.id)}`} className="first-item">
                  <span className="first-rank serif">{i + 1}</span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className="first-title" lang={w.lang}>{w.title}</span>
                    <span className="first-meta mono">{w.id} · {w.district} · {rupees(w.sanctioned)}</span>
                    <span className="chips">{w.signals.slice(0, 3).map((x) => <SignalChip key={x.code} s={x} />)}</span>
                  </span>
                  {w.decision ? <span className="chip">Reviewed</span> : <span className="score tnum" title="Priority score">{w.score}</span>}
                </Link>
              </li>
            ))}
            {!data.top.length && <li className="empty">No high-priority works in this scope.</li>}
          </ol>
        </div>
      </div>

      <div className="brief-grid three">
        <div className="card card-pad">
          <div className="h3" style={{ marginBottom: 14 }}>What the checks found</div>
          {signals.map(([code, n]) => {
            const Icon = SIGNAL_ICON[code];
            return (
              <Link key={code} to={caseLink({ signal: code })} className="sig-row">
                <Icon size={14} className="muted" /><span className="sig-name">{SIGNAL_SHORT[code]}</span>
                <span className="bar-track" style={{ flex: 1 }}><span className="bar-fill" style={{ width: `${(n / maxSig) * 100}%`, background: "var(--forest-2)", display: "block" }} /></span>
                <span className="tnum" style={{ width: 34, textAlign: "right" }}>{n}</span>
              </Link>
            );
          })}
        </div>
        <div className="card card-pad">
          <div className="h3" style={{ marginBottom: 14 }}>Compliance with the guidelines</div>
          <Gauge label="Sanctioned within 45 days" value={s.compliance.sanctionWithin45} target={0.95} />
          <Gauge label="Completed within deadline" value={s.compliance.onTimeCompletion} target={0.9} />
          <Gauge label="Payments with asset photo" value={s.compliance.photoCoverage} target={1} />
          <Link to={`/desk/compliance?${q}`} className="note-row">
            <span><b className="tnum" style={{ color: data.scst ? "var(--high)" : "inherit" }}>{data.scst}</b> constituency-years below the SC 15% / ST 7.5% share</span><ChevronRight size={14} />
          </Link>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>Median sanction took {s.compliance.medianSanctionLag} days.</div>
        </div>
        <div className="card card-pad">
          <div className="h3" style={{ marginBottom: 4 }}>Early warning</div>
          <div className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>Open works the model expects to miss their deadline — while there is still time.</div>
          {data.earlyWarnings.map((w) => (
            <Link key={w.id} to={`/desk/cases/${encodeURIComponent(w.id)}`} className="ew-row">
              <span className="ew-risk tnum">{Math.round(w.delayRisk * 100)}%</span>
              <span style={{ minWidth: 0 }}><span className="first-title" lang={w.lang} style={{ fontSize: 13 }}>{w.title}</span><span className="muted" style={{ fontSize: 11.5 }}>due {date(w.deadline)} · <Progress value={w.progress} /></span></span>
            </Link>
          ))}
          {!data.earlyWarnings.length && <div className="empty" style={{ padding: 16 }}>No open work is currently forecast to slip.</div>}
          {data.vendorAlerts.length > 0 && (
            <Link to={`/desk/vendors?${q}`} className="note-row" style={{ marginTop: 12 }}>
              <span><b className="tnum">{data.vendorAlerts.length}</b> vendor{data.vendorAlerts.length > 1 ? "s hold" : " holds"} over 30% of a constituency’s works</span><ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head"><h2 className="h2">Month by month</h2><span className="aside">bars: sanctions · line: payments to vendors · ₹ crore</span></div>
        <div style={{ padding: "10px 18px 16px" }}><MonthlyChart rows={data.monthly} /></div>
      </div>
    </div>
  );
}

function Gauge({ label, value, target }) {
  const ok = value >= target;
  return (
    <div className="gauge">
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>{label}</span><b className="tnum" style={{ color: ok ? "var(--clear)" : "var(--medium)" }}>{pct(value, 1)}</b></div>
      <div className="bar-track" style={{ height: 8, position: "relative" }}>
        <span className="bar-fill" style={{ width: `${(value || 0) * 100}%`, background: ok ? "var(--clear)" : "var(--medium)", display: "block" }} />
        <span style={{ position: "absolute", left: `${target * 100}%`, top: -3, bottom: -3, width: 2, background: "var(--ink)" }} title={`Target ${pct(target)}`} />
      </div>
    </div>
  );
}

function StatusBreakdown({ levels, funnel }) {
  const rows = [["high", "High priority"], ["medium", "Medium"], ["watch", "Watch"], ["incomplete", "Can’t assess yet"], ["clear", "No signal"]];
  const total = Object.values(levels).reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="card-pad">
      <div className="status-stack">
        {rows.map(([k]) => <span key={k} className={`seg ${k}`} style={{ flex: levels[k] || 0 }} />)}
      </div>
      {rows.map(([k, l]) => (
        <div key={k} className="status-row"><Sev level={k}>{l}</Sev><span className="tnum">{levels[k] || 0}</span><span className="muted tnum">{pct((levels[k] || 0) / total)}</span></div>
      ))}
      <div className="divider" />
      <div className="muted" style={{ fontSize: 13 }}>{int(funnel.completed.n)} of {int(funnel.sanctioned.n)} sanctioned works are marked complete.</div>
    </div>
  );
}
