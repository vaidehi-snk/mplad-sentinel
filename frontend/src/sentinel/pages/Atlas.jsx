import { useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@number-flow/react";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { useApi, useDesk, useScopeQuery, crore, int, pct, rupees, date } from "../core";
import { Loading } from "../ui";
import { AtlasMap } from "../atlasmap";
import { FundRibbon, MonthlyChart } from "../viz";
import { IStamp, ICost, ISanction, IDuplicate, IVendor, IForecast, ISplit, ITrend, IOverrun, CHECK_ICON } from "../icons";

const ease = [0.2, 0.7, 0.2, 1];
// Each lens re-reads the same map: what it colours, what it pulses, what the panel explains.
const LENSES = [
  { id: "risk", label: "Risk", icon: IStamp, color: [255, 106, 77], metric: (b) => (b.high + b.medium) / b.works, fmt: (b) => `${b.high} high · ${pct((b.high + b.medium) / b.works)} need attention`, count: (b) => b.high },
  { id: "money", label: "Money", icon: ICost, color: [226, 194, 112], metric: (b) => 1 - b.completedCr / Math.max(b.sanctionedCr, 0.01), fmt: (b) => `${crore(b.sanctionedCr - b.completedCr)} not yet marked complete${b.overrun ? ` · ${b.overrun} overrun${b.overrun === 1 ? "" : "s"}` : ""}`, count: (b) => Math.round(b.sanctionedCr - b.completedCr) },
  { id: "compliance", label: "Compliance", icon: ISanction, color: [242, 163, 58], metric: (b) => 1 - (b.sanctionWithin45 ?? 1), fmt: (b) => `${pct(b.sanctionWithin45)} sanctioned within 45 days${b.notPermissible ? ` · ${b.notPermissible} may not be permissible` : ""}`, count: (b) => b.overdue + b.notPermissible },
  { id: "duplicates", label: "Duplicates", icon: IDuplicate, color: [255, 106, 77], metric: (b) => b.duplicates / b.works, fmt: (b) => `${b.duplicates} possible duplicate${b.duplicates === 1 ? "" : "s"}`, count: (b) => b.duplicates },
  { id: "vendors", label: "Vendors", icon: IVendor, color: [217, 196, 106], metric: (b) => b.vendors + b.splits / 3, fmt: (b) => `${b.vendors} vendor${b.vendors === 1 ? "" : "s"} above 30% share · ${b.splits} split-work flag${b.splits === 1 ? "" : "s"}`, count: (b) => b.vendors + b.splits },
  { id: "forecast", label: "Trends", icon: IForecast, color: [242, 163, 58], metric: (b) => b.early / b.works + b.bursts / 4, fmt: (b) => `${b.early} likely to slip · ${b.overdue} overdue${b.bursts ? ` · ${b.bursts} burst${b.bursts === 1 ? "" : "s"} of sanctions` : ""}`, count: (b) => b.early },
];
const mix = (t, [r, g, b]) => { const base = [23, 53, 40]; const k = Math.max(0, Math.min(1, t)); return `rgb(${base.map((v, i) => Math.round(v + ([r, g, b][i] - v) * k)).join(",")})`; };

export default function Atlas() {
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const { desk } = useDesk();
  const q = useScopeQuery();
  const lensId = sp.get("lens") || "risk";
  const lens = LENSES.find((l) => l.id === lensId) || LENSES[0];
  const { data, loading } = useApi(`/api/brief?${q}`);
  const extraPath = { duplicates: "/api/duplicates", vendors: "/api/vendors", forecast: "/api/trends", compliance: "/api/compliance" }[lens.id];
  const extra = useApi(extraPath ? `${extraPath}?${q}` : null, [lens.id]);
  useEffect(() => { document.title = `Atlas · ${lens.label} · Sentinel`; }, [lens]);

  const setParam = (patch) => { const n = new URLSearchParams(sp); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); setSp(n); };
  const scope = data?.scope;
  const home = { ministry: 0, state: 1, district: 2, mp: 3 }[desk.persona.role];
  const depth = scope ? { India: 0, state: 1, district: 2, constituency: 3 }[scope.level] : 0;
  const childKey = ["state", "district", "constituency"][depth];
  const drill = (name) => { if (!childKey) return; const p = { [childKey]: name }; if (childKey === "district") p.constituency = null; setParam(p); };
  const up = () => { const keys = ["state", "district", "constituency"]; const n = new URLSearchParams(sp); keys.slice(depth - 1).forEach((k) => n.delete(k)); setSp(n); };
  const stateOf = scope ? (scope.level === "state" ? scope.label : scope.crumbs.find((c) => c.level === "state")?.label) : null;

  const units = data?.breakdown || [];
  const maxMetric = Math.max(0.0001, ...units.map(lens.metric));
  const minMetric = units.length ? Math.min(...units.map(lens.metric)) : 0;
  const spread = (b) => (units.length > 1 ? (lens.metric(b) - minMetric) / Math.max(0.0001, maxMetric - minMetric) : 1);
  const regions = useMemo(() => {
    if (!data) return {};
    if (depth === 0) return Object.fromEntries(units.map((b) => [b.name, { label: lens.fmt(b), t: 0.18 + spread(b) * 0.82 }]));
    return stateOf ? { [stateOf]: { label: stateOf } } : {};
  }, [data, units, lens, depth, stateOf, spread]); // eslint-disable-line react-hooks/exhaustive-deps
  const hot = useMemo(() => units.filter((b) => lens.count(b) > 0).map((b) => ({ name: b.name, lat: b.lat, lng: b.lng, weight: 0.25 + spread(b) * 0.75, count: lens.count(b), color: `rgb(${lens.color.join(",")})` })), [units, lens, maxMetric, minMetric]); // eslint-disable-line react-hooks/exhaustive-deps
  const links = lens.id === "duplicates" && extra.data?.pairs ? extra.data.pairs.map((p) => [[p.first.lat, p.first.lng], [p.second.lat, p.second.lng]]) : [];
  const emphasis = lens.id === "risk" ? null : lens.id === "duplicates" ? (p) => p.dup : lens.id === "forecast" ? (p) => p.early : (p) => p.level === "high" || p.level === "medium";

  if (!data && loading) return <div className="atlas-stage"><Loading label="Lighting up the map…" /></div>;
  if (!data) return null;
  const s = data.summary;

  return (
    <div className="atlas-stage">
      <div className="atlas-canvas">
        <AtlasMap focus={depth >= 1 ? stateOf : null} focusDots={depth >= 2} dots={data.dots} regions={regions}
          regionTone={depth === 0 ? (v) => mix(v.t * 0.8, lens.color) : null}
          hot={depth <= 1 ? hot : []} links={links} emphasis={emphasis}
          onPickState={depth === 0 ? drill : null} onPickHot={childKey ? drill : null}
          onPickDot={(id) => nav(`/desk/cases/${encodeURIComponent(id)}`)} />

        <div className="atlas-top">
          <div className="crumbs-v2">
            {depth > home && <button className="crumb-back" onClick={up} aria-label="Up one level"><ChevronLeft size={16} /></button>}
            {scope.crumbs.map((c, i) => <span key={c.label} className={i === scope.crumbs.length - 1 ? "on" : ""}>{c.label}</span>)}
          </div>
          <div className="lenses" role="tablist" aria-label="Lens">
            {LENSES.map((l) => (
              <button key={l.id} role="tab" aria-selected={l.id === lens.id} className={`lens${l.id === lens.id ? " on" : ""}`} onClick={() => setParam({ lens: l.id })}>
                {l.id === lens.id && <motion.span layoutId="lens-pill" className="lens-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                <l.icon size={17} /><span>{l.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="atlas-legend">
          <span className="lg"><i style={{ background: "var(--glow-high)" }} />high</span>
          <span className="lg"><i style={{ background: "var(--glow-medium)" }} />medium</span>
          <span className="lg"><i style={{ background: "var(--glow-watch)" }} />watch</span>
          <span className="lg"><i style={{ background: "var(--glow-clear)" }} />no signal</span>
          <span className="muted">· one point per work · {depth === 0 ? "click a state to fly in" : childKey ? `click a ring to open a ${childKey}` : "click a point to open its case"}</span>
        </div>
      </div>

      <aside className="atlas-panel">
        <AnimatePresence mode="wait">
          <motion.div key={lens.id + scope.label} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.3, ease }}>
            <div className="panel-eyebrow"><lens.icon size={15} /> {lens.label} · {scope.label}</div>
            <PanelHead lens={lens.id} s={s} extra={extra.data} />
            <PanelBody lens={lens.id} data={data} extra={extra.data} units={units} lensDef={lens} drill={drill} childKey={childKey} q={q} />
          </motion.div>
        </AnimatePresence>
      </aside>
    </div>
  );
}

function Big({ n, suffix, children }) {
  return <div className="panel-big"><span className="tnum"><NumberFlow value={n} />{suffix}</span><p>{children}</p></div>;
}

function PanelHead({ lens, s, extra }) {
  const works = s.works;
  switch (lens) {
    case "risk": return <Big n={s.levels.high + s.levels.medium}>of {int(works)} works need a closer look — {crore(s.atRiskCr)} of sanctions. <b>{s.levels.high}</b> are high priority.</Big>;
    case "money": return <Big n={Math.round(s.funnel.sanctioned.cr - s.funnel.completed.cr)} suffix=" cr">sanctioned but not yet marked complete, out of {crore(s.funnel.sanctioned.cr)} sanctioned.</Big>;
    case "compliance": return <Big n={Math.round((s.compliance.sanctionWithin45 || 0) * 1000) / 10} suffix="%">of works sanctioned within the 45-day window. {extra ? <><b>{extra.overdue}</b> open works are past their one-year deadline.</> : null}</Big>;
    case "duplicates": return <Big n={extra?.pairs?.length ?? 0}>pairs of the same work type within 250 m, with matching descriptions. Phase II segments are excluded.</Big>;
    case "vendors": return <Big n={extra?.rows?.filter((r) => r.flagged).length ?? 0}>vendors hold more than 30% of a constituency’s sanctioned value. A pattern to check, not proof.</Big>;
    case "forecast": return <Big n={extra?.forecast?.likelyLate ?? s.earlyWarnings}>open works are likely to miss a deadline before year end{extra ? <> — hold-out AUC <b>{extra.model.testAuc}</b></> : null}.</Big>;
    default: return null;
  }
}

function UnitBars({ units, lensDef, drill, childKey }) {
  const max = Math.max(0.0001, ...units.map(lensDef.metric));
  if (!units.length) return null;
  return (
    <div className="unit-bars">
      <div className="label" style={{ margin: "4px 0 8px" }}>By {childKey}</div>
      {[...units].sort((a, b) => lensDef.metric(b) - lensDef.metric(a)).slice(0, 8).map((b, i) => (
        <motion.button key={b.name} className="ubar" onClick={() => drill(b.name)} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i }}>
          <span className="ubar-name">{b.name}</span>
          <span className="ubar-track"><motion.span className="ubar-fill" initial={{ width: 0 }} animate={{ width: `${(lensDef.metric(b) / max) * 100}%` }} transition={{ duration: 0.8, ease, delay: 0.05 * i }} style={{ background: `rgb(${lensDef.color.join(",")})` }} /></span>
          <span className="ubar-v">{lensDef.fmt(b)}</span>
        </motion.button>
      ))}
    </div>
  );
}

function CaseRows({ items, meta }) {
  return (
    <div className="p-list">
      {items.map((w, i) => (
        <motion.div key={w.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
          <Link to={`/desk/cases/${encodeURIComponent(w.id)}`} className="p-row">
            <span className={`p-dot ${w.level}`} />
            <span style={{ minWidth: 0, flex: 1 }}>
              <span className="p-title" lang={w.lang}>{w.title}</span>
              <span className="p-meta">{meta ? meta(w) : `${w.district} · ${rupees(w.sanctioned)}`}</span>
            </span>
            <span className="p-icons">{w.signals.slice(0, 3).map((x) => { const I = CHECK_ICON[x.code]; return <I key={x.code} size={15} />; })}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

// Money left idle: spending on each constituency's ₹5 crore for a closed year, against its peers.
function Utilisation({ rows = [] }) {
  const closed = rows.filter((u) => u.closed && u.monthsSinceClose >= 6).sort((a, b) => a.spent - b.spent).slice(0, 6);
  if (!closed.length) return null;
  return (
    <div className="util">
      <div className="label" style={{ margin: "18px 0 8px" }}>Fund utilisation · spent of the ₹5 cr entitlement, closed years</div>
      {closed.map((u) => (
        <div key={u.constituency + u.fy} className={`util-row${u.slow ? " slow" : ""}`}>
          <span className="util-name">{u.constituency} <span className="muted">{u.fy}</span></span>
          <span className="util-bar"><span style={{ width: `${Math.min(100, (u.spent / u.entitlement) * 100)}%` }} />{u.peerMedian && <i style={{ left: `${Math.min(100, (u.peerMedian / u.entitlement) * 100)}%` }} />}</span>
          <b className="tnum">{rupees(u.spent)}</b>
        </div>
      ))}
      <div className="p-note" style={{ marginTop: 8 }}>Tick = median constituency. Red = below 65% of it — funds sitting idle ask for a reason.</div>
    </div>
  );
}

function PanelBody({ lens, data, extra, units, lensDef, drill, childKey, q }) {
  if (lens === "risk") return (
    <>
      <UnitBars units={units} lensDef={lensDef} drill={drill} childKey={childKey} />
      <div className="label" style={{ margin: "18px 0 8px" }}>Open first</div>
      <CaseRows items={data.top.slice(0, 6)} />
      <Link to={`/desk/cases?level=high&${q}`} className="p-more">All {data.summary.levels.high} high-priority cases <ArrowRight size={14} /></Link>
    </>
  );
  if (lens === "money") return (
    <>
      <div className="p-ribbon"><FundRibbon funnel={data.summary.funnel} dark /></div>
      <UnitBars units={units} lensDef={lensDef} drill={drill} childKey={childKey} />
      <Utilisation rows={data.utilisation} />
      <Link to={`/desk/cases?signal=COST_OVERRUN&level=&${q}`} className="p-more"><IOverrun size={16} /> {data.newChecks.overrun} cost overrun{data.newChecks.overrun === 1 ? "" : "s"} in this area <ArrowRight size={14} /></Link>
    </>
  );
  if (!extra) return <div style={{ padding: 30 }}><Loading label="Reading…" /></div>;
  if (lens === "compliance") return (
    <>
      <div className="p-metrics">
        {[["Sanctioned ≤ 45 days", extra.summary.sanctionWithin45, 0.95], ["Completed on time", extra.summary.onTimeCompletion, 0.9], ["Payments with a photo", extra.summary.photoCoverage, 0.995]].map(([l, v, t]) => (
          <div key={l} className={`p-metric${v >= t ? " ok" : ""}`}><b className="tnum">{pct(v, 1)}</b><span>{l}</span></div>
        ))}
        <div className="p-metric"><b className="tnum">{extra.unmarked}</b><span>paid, not marked complete</span></div>
      </div>
      <UnitBars units={units} lensDef={lensDef} drill={drill} childKey={childKey} />
      {extra.notPermissible.length > 0 && (
        <>
          <div className="label" style={{ margin: "18px 0 8px" }}>Read against the list of works not permissible</div>
          <CaseRows items={extra.notPermissible.slice(0, 6)} meta={(w) => `${w.district} · ${w.matched.map(([k, v]) => `${k.toLowerCase()} ${v}`).join(" · ")}`} />
        </>
      )}
      <div className="p-note">SC 15% / ST 7.5% share: <b>{extra.scst.filter((c) => c.fy !== "2026-27" && (!c.scOk || !c.stOk)).length}</b> constituency-years below the guideline in this area. A shortfall asks for an explanation — some constituencies have little SC or ST population.</div>
      <Link to={`/desk/cases?signal=SANCTION_45&level=&${q}`} className="p-more">Works past the 45-day window <ArrowRight size={14} /></Link>
    </>
  );
  if (lens === "duplicates") return (
    <div className="p-list">
      {extra.pairs.slice(0, 12).map((p, i) => (
        <motion.div key={p.a + p.b} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}>
          <Link to={`/desk/cases/${encodeURIComponent(p.b)}`} className="p-row">
            <span className="p-dup"><IDuplicate size={16} /></span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span className="p-title" lang={p.second.lang}>{p.second.title}</span>
              <span className="p-meta">{p.distance} m from {p.a} · {Math.round(p.similarity * 100)}% match · {p.second.district}</span>
            </span>
          </Link>
        </motion.div>
      ))}
      {!extra.pairs.length && <div className="p-empty">No duplicate candidates in this area.</div>}
    </div>
  );
  if (lens === "vendors") return (
    <div className="p-list">
      {extra.rows.filter((r) => r.flagged).map((r, i) => (
        <motion.div key={r.vendor + r.constituency} className="p-row static" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}>
          <span className="p-dup"><IVendor size={16} /></span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span className="p-title">{r.vendor}</span>
            <span className="p-meta">{r.constituency} · {r.works} works · {crore(r.value / 1e7, 2)}</span>
            <span className="share-bar"><span style={{ width: `${Math.min(100, r.share * 160)}%` }} /><i style={{ left: "48%" }} /></span>
          </span>
          <b className="tnum" style={{ color: "#e2c270" }}>{pct(r.share)}</b>
        </motion.div>
      ))}
      {!extra.rows.some((r) => r.flagged) && <div className="p-empty">No vendor holds more than 30% of a constituency here.</div>}
      {extra.splitGroups?.length > 0 && <div className="label" style={{ margin: "18px 0 6px" }}>Possible split works · same vendor, site and month, each just under the tender limit</div>}
      {extra.splitGroups?.map((g, i) => (
        <motion.div key={g[0].id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * i }}>
          <Link to={`/desk/cases/${encodeURIComponent(g[0].id)}`} className="p-row">
            <span className="p-dup"><ISplit size={16} /></span>
            <span style={{ minWidth: 0, flex: 1 }}>
              <span className="p-title">{g.length} × {g[0].categoryLabel.toLowerCase()} · {g[0].vendor}</span>
              <span className="p-meta">{g[0].constituency} · {g.map((w) => rupees(w.sanctioned)).join(" + ")}</span>
            </span>
            <b className="tnum" style={{ color: "#e2c270" }}>{rupees(g.reduce((s, w) => s + w.sanctioned, 0))}</b>
          </Link>
        </motion.div>
      ))}
    </div>
  );
  if (lens === "forecast") return (
    <>
      {extra.trendAlerts.length > 0 && (
        <>
          <div className="label" style={{ margin: "4px 0 8px" }}>Unusual bursts of sanctions</div>
          {extra.trendAlerts.map((t) => (
            <div key={t.constituency + t.month} className="p-row static">
              <span className="p-dup"><ITrend size={16} /></span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="p-title">{t.kind} · {t.constituency}</span>
                <span className="p-meta">{t.works} works in {new Date(t.month + "-01T00:00:00Z").toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" })} against a usual {t.usual} a month · {rupees(t.value)}</span>
              </span>
            </div>
          ))}
          <div className="label" style={{ margin: "18px 0 8px" }}>Likely to miss the deadline</div>
        </>
      )}
      <CaseRows items={extra.forecast.items.slice(0, 7)} meta={(w) => `${Math.round((w.delayRisk || 0) * 100)}% risk · due ${date(w.deadline)} · ${w.progress}% done`} />
      <div className="label" style={{ margin: "18px 0 6px" }}>Month by month · ₹ crore</div>
      <div className="p-chart"><MonthlyChart rows={extra.monthly} height={170} /></div>
    </>
  );
  return null;
}
