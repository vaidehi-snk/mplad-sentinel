import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@number-flow/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useApi, useDesk, call, rupees, int, date, ROLE_SHORT } from "../core";
import { Loading, ErrorBox } from "../ui";
import { CHECK_ICON, IRound, IStamp, IPhoto, IForecast, ISanction, IClear, IOverrun, INotPermissible, IEscalate, ITrend } from "../icons";
import { Clock } from "./Round";
import { AtlasMap } from "../atlasmap";

const ease = [0.2, 0.7, 0.2, 1];
export const CAP_KEY = "sentinel.capacity";
export const readCapacity = (role) => { try { return +localStorage.getItem(CAP_KEY) || (role === "district" ? 5 : 10); } catch { return 5; } };
const part = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
const DESK_NAME = { ministry: "Ministry", state: "State Nodal Authority", district: "District Authority", mp: "" };

export default function Today() {
  const { desk, meta } = useDesk();
  const p = desk.persona;
  const geoRow = meta?.geo?.find((g) => (p.role === "state" ? g.state : p.role === "district" ? g.district : g.pc) === p.jurisdiction);
  const homeState = p.role === "ministry" ? null : geoRow?.state;
  const nav = useNavigate();
  const brief = useApi("/api/brief");
  const [cap, setCap] = useState(() => readCapacity(p.role));
  const queue = useApi(`/api/cases?level=high,medium&review=open&size=${cap}`, [cap]);
  useEffect(() => { document.title = "Today · Sentinel"; }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Enter" && !e.target.closest("input,textarea,select,button,a")) nav("/desk/round"); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav]);
  const setCapacity = (n) => { setCap(n); try { localStorage.setItem(CAP_KEY, String(n)); } catch { /* private mode */ } };

  if (brief.loading && !brief.data) return <div className="page-v2"><Loading /></div>;
  if (brief.error) return <div className="page-v2"><ErrorBox error={brief.error} /></div>;
  const b = brief.data, s = b.summary;
  const attention = s.levels.high + s.levels.medium;
  const lead = b.top[0];
  const leadWhy = lead?.signals[0]?.title?.toLowerCase();
  const who = p.role === "mp" ? `${p.jurisdiction}` : `${p.jurisdiction} ${DESK_NAME[p.role]}`.replace("India Ministry", "Ministry");
  const openCount = queue.data?.total ?? attention;
  const reviewed = b.reviewed;
  const goal = Math.max(cap, 1);

  return (
    <div className="page-v2 today">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
        <div className="eyebrow">{ROLE_SHORT[p.role]} desk · {p.jurisdiction} · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</div>
        <h1 className="greet">{part()}, <b>{who}</b>.</h1>
        <p className="sub-greet">
          <b><NumberFlow value={attention} /> works</b> in your area need a closer look{lead ? <> — start with <Link className="inline-link" to={`/desk/cases/${encodeURIComponent(lead.id)}`} lang={lead.lang}>{lead.title}</Link>{leadWhy ? <span className="muted">, {leadWhy}</span> : null}.</> : "."}
        </p>
      </motion.div>

      <div className="today-grid">
        <div className="today-main">
          <motion.section className="round-card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.5, ease }}>
            <div className="round-left">
              <div className="round-ring">
                <Ring value={Math.min(1, reviewed / goal)} />
                <div className="round-ring-text"><b className="tnum"><NumberFlow value={reviewed} /></b><span>of {goal}<br />reviewed</span></div>
              </div>
              <div>
                <div className="label" style={{ color: "var(--brass-2)" }}>This week’s round</div>
                <h2 className="round-h">{p.role === "mp" ? "Follow what’s stuck" : <>Review <em>{Math.min(cap, openCount)}</em> cases, one at a time</>}</h2>
                <p className="round-p">Strongest evidence first. Each case takes about a minute: read why it surfaced, then escalate, ask for evidence, or clear it.</p>
                <div className="cap-row">
                  <span className="muted" style={{ fontSize: 12.5 }}>Cases this week</span>
                  {[5, 10, 25].map((n) => <button key={n} className={`cap-chip${cap === n ? " on" : ""}`} onClick={() => setCapacity(n)}>{n}</button>)}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 18, flexWrap: "wrap" }}>
                  <button className="btn-round" onClick={() => nav("/desk/round")}><IRound size={18} accent="#14452f" /> Start round <span className="kbd-inline">↵</span></button>
                  <Link to="/desk/cases" className="ghost-link">Browse all {int(openCount)} open cases <ArrowRight size={14} /></Link>
                </div>
              </div>
            </div>
            <CardStack items={queue.data?.items || []} />
          </motion.section>

          <EscalationCard e={b.escalation} role={p.role} />

          <div className="since">
            <Since icon={IStamp} n={s.levels.high} label="high-priority works" hint="Strong evidence from two or more checks" to="/desk/cases?level=high" tone="high" />
            <Since icon={IOverrun} n={s.bySignal.COST_OVERRUN || 0} label="cost overruns" hint="Revised >20% or paid beyond approval" to="/desk/cases?signal=COST_OVERRUN&level=" tone="high" />
            <Since icon={INotPermissible} n={s.bySignal.NOT_PERMISSIBLE || 0} label="works that may not be permissible" hint="Read against the guideline list" to="/desk/cases?signal=NOT_PERMISSIBLE&level=" tone="medium" />
            <Since icon={IForecast} n={s.earlyWarnings} label="works likely to slip" hint="Predicted to miss their deadline" to="/desk/atlas?lens=forecast" tone="watch" />
          </div>
        </div>

        <aside className="today-side">
          <LiveFeed />
          <TrendWatch alerts={b.trendAlerts} slow={b.utilisation.filter((u) => u.slow)} />
          <Link to="/desk/atlas" className="mini-atlas">
            <AtlasMap compact focus={homeState} dots={b.dots} showLabels={false}
              regions={Object.fromEntries((homeState ? [homeState] : (meta?.geo || []).map((g) => g.state)).map((n) => [n, { label: "" }]))} />
            <div className="mini-atlas-cap"><span><b>Your area on the Atlas</b><br /><span className="muted">{int(b.dots.length)} works, one point each</span></span><ArrowUpRight size={16} /></div>
          </Link>
        </aside>
      </div>
    </div>
  );
}

// Loss aversion, used kindly: new serious cases carry a visible clock. Decide them, or they rise a level.
function EscalationCard({ e, role }) {
  if (!e || (!e.escalated && !e.pending) || role === "mp") return null;
  const upstairs = role === "state" || role === "ministry";
  return (
    <motion.section className={`esc-card${upstairs ? " up" : ""}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.45, ease }}>
      <div className="esc-head">
        <span className="esc-ic"><IEscalate size={22} /></span>
        <div>
          <div className="label">The escalation clock</div>
          <h3>{upstairs
            ? <><b className="tnum">{e.escalated}</b> new case{e.escalated === 1 ? "" : "s"} rose to your desk after sitting undecided at district level</>
            : <><b className="tnum">{e.pending}</b> new case{e.pending === 1 ? "" : "s"} will rise to the State desk if left undecided{e.dueThisWeek ? <> — <b>{e.dueThisWeek}</b> this week</> : null}</>}</h3>
          <p className="muted">High priority: {e.sla.high} days. Medium: {e.sla.medium} days. Older backlog is worked through in rounds instead.{!upstairs && e.escalated ? ` ${e.escalated} already rose.` : ""}</p>
        </div>
        <Link to={upstairs ? "/desk/cases?escalated=1&level=" : "/desk/cases?clock=1&level="} className="ghost-link">See them <ArrowRight size={14} /></Link>
      </div>
      <div className="esc-list">
        {e.items.slice(0, 3).map((w) => (
          <Link key={w.id} to={`/desk/cases/${encodeURIComponent(w.id)}`} className="esc-row">
            <span className={`p-dot ${w.level}`} />
            <span className="esc-title" lang={w.lang}>{w.title}</span>
            <span className="muted esc-where">{w.district}</span>
            <Clock e={w.escalation} />
          </Link>
        ))}
      </div>
    </motion.section>
  );
}

// Scheme-level patterns no single work shows: bursts of sanctions and money left idle.
function TrendWatch({ alerts = [], slow = [] }) {
  if (!alerts.length && !slow.length) return null;
  return (
    <Link to="/desk/atlas?lens=forecast" className="trend-watch">
      <div className="feed-head"><ITrend size={18} /><b>Trend watch</b><ArrowUpRight size={15} style={{ marginLeft: "auto" }} /></div>
      {alerts.slice(0, 2).map((t) => (
        <div key={t.constituency + t.month} className="tw-row">
          <MiniBurst usual={t.usual} n={t.works} />
          <span><b>{t.kind}</b> · {t.constituency}<br /><span className="muted">{t.works} works sanctioned in {month(t.month)}, against a usual {t.usual} a month</span></span>
        </div>
      ))}
      {slow.slice(0, 2).map((u) => (
        <div key={u.constituency + u.fy} className="tw-row">
          <span className="tw-gauge"><span style={{ width: `${Math.round((u.spent / u.entitlement) * 100)}%` }} /></span>
          <span><b>Slow utilisation</b> · {u.constituency}<br /><span className="muted">{rupees(u.spent)} spent of the ₹5 cr for {u.fy}; typical is {rupees(u.peerMedian)}</span></span>
        </div>
      ))}
    </Link>
  );
}
const month = (m) => new Date(m + "-01T00:00:00Z").toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
function MiniBurst({ usual, n }) {
  const bars = [usual, usual * 0.8, usual * 1.1, usual * 0.9, n];
  const max = Math.max(...bars);
  return (
    <svg viewBox="0 0 50 28" className="tw-burst" aria-hidden="true">
      {bars.map((v, i) => <rect key={i} x={i * 10 + 1} y={28 - (v / max) * 26} width="7" height={(v / max) * 26} rx="1.5" className={i === 4 ? "spike" : ""} />)}
    </svg>
  );
}

function Ring({ value }) {
  const r = 44, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" className="ring-svg" aria-hidden="true">
      <circle cx="50" cy="50" r={r} className="ring-track" />
      <motion.circle cx="50" cy="50" r={r} className="ring-fill" strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - value) }} transition={{ duration: 1.2, ease }} />
    </svg>
  );
}

function CardStack({ items }) {
  const top = items.slice(0, 3);
  if (!top.length) return (
    <div className="stack-empty"><IClear size={40} accent="#c9a24d" /><b>Nothing waiting</b><span>Every flagged case in your area has a decision.</span></div>
  );
  return (
    <div className="stack" aria-label="Next cases in your round">
      {top.slice().reverse().map((w, ri) => {
        const i = top.length - 1 - ri;
        return (
          <motion.div key={w.id} className={`stack-card lvl-${w.level}`} style={{ zIndex: 10 - i }}
            initial={{ opacity: 0, y: 30, rotate: 0 }} animate={{ opacity: 1, y: i * 14, x: i * 10, rotate: i * 3.2, scale: 1 - i * 0.04 }}
            transition={{ delay: 0.2 + ri * 0.08, type: "spring", stiffness: 220, damping: 22 }}
            whileHover={i === 0 ? { y: -6, rotate: -1 } : undefined}>
            <div className="stack-top"><span className={`sev ${w.level}`}>{w.level}</span><span className="mono muted">{w.id}</span></div>
            <div className="stack-title" lang={w.lang}>{w.title}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{w.district} · {rupees(w.sanctioned)}</div>
            <div className="stack-icons">
              {w.signals.slice(0, 4).map((x) => { const I = CHECK_ICON[x.code]; return <span key={x.code} className={`sig-dot ${x.severity}`} title={x.title}><I size={16} /></span>; })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function Since({ icon: Icon, n, label, hint, to, tone }) {
  return (
    <Link to={to} className={`since-card ${tone}`}>
      <Icon size={22} />
      <div className="since-n tnum"><NumberFlow value={n} /></div>
      <div className="since-l">{label}</div>
      <div className="since-h">{hint}</div>
    </Link>
  );
}

const KIND_ICON = { sanction: ISanction, payment: IPhoto, complete: IClear, recommend: IForecast, decision: IStamp };

function LiveFeed() {
  const [data, setData] = useState(null);
  const [shown, setShown] = useState(4);
  useEffect(() => {
    let live = true;
    const pull = () => call("/api/pulse").then((r) => live && setData(r)).catch(() => {});
    pull();
    const t = setInterval(pull, 9000);
    return () => { live = false; clearInterval(t); };
  }, []);
  // replay: reveal one more recorded event every few seconds so the desk feels alive
  useEffect(() => {
    const t = setInterval(() => setShown((n) => Math.min(n + 1, 9)), 3200);
    return () => clearInterval(t);
  }, []);
  const events = useMemo(() => {
    if (!data) return [];
    const liveOnes = data.events.filter((e) => e.live);
    const pool = data.events.filter((e) => !e.live).slice(0, 9); // newest first
    return [...liveOnes, ...pool.slice(Math.max(0, pool.length - shown))].slice(0, 7);
  }, [data, shown]);
  const ago = (e) => {
    if (e.live) { const m = Math.round((Date.now() - new Date(e.on)) / 60000); return m < 1 ? "just now" : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; }
    const d = Math.round((new Date(data.asOf) - new Date(e.on)) / 86400000);
    return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
  };
  return (
    <section className="feed">
      <div className="feed-head"><span className="live-dot" /><b>Happening in your area</b><span className="muted" style={{ marginLeft: "auto", fontSize: 11.5 }}>eSAKSHI events · decisions live</span></div>
      <ul className="feed-list">
        <AnimatePresence initial={false}>
          {events.map((e) => {
            const Icon = KIND_ICON[e.kind] || ISanction;
            return (
              <motion.li key={e.kind + e.id + e.on} layout initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease }}>
                <Link to={`/desk/cases/${encodeURIComponent(e.id)}`} className={`feed-item${e.flag ? " flagged" : ""}${e.live ? " live" : ""}`}>
                  <span className="feed-ic"><Icon size={16} /></span>
                  <span style={{ minWidth: 0, flex: 1 }}>
                    <span className="feed-text">{e.text}{e.actor ? ` · ${e.actor}` : ""}</span>
                    <span className="feed-meta">{e.place}{e.amount ? ` · ${rupees(e.amount)}` : ""} · {ago(e)}</span>
                    {e.flag && <span className="feed-flag">{e.flag}</span>}
                  </span>
                </Link>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {data && !events.length && <li className="empty">Quiet — no recorded events in the last weeks.</li>}
      </ul>
      {data && <div className="feed-foot">Replaying recorded events up to {date(data.asOf)} · decisions appear as they happen</div>}
    </section>
  );
}
