// The review round: one case at a time, full attention, a clear finish line.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import NumberFlow from "@number-flow/react";
import { X, ArrowLeft, ArrowRight, Keyboard } from "lucide-react";
import { call, useDesk, rupees, date, days, DECISION_LABEL } from "../core";
import { Loading, Stamp } from "../ui";
import { CHECK_ICON, CHECK_ORDER, IClear, IStamp, IEscalate } from "../icons";
import { Lifecycle, PeerStrip, PairMap } from "../viz";
import { readCapacity } from "./Today";

const ease = [0.2, 0.7, 0.2, 1];
const CHECKS = CHECK_ORDER;
const SHORT = { SANCTION_45: "45-day sanction", DEADLINE: "Deadline", COST: "Cost vs peers", COST_OVERRUN: "Cost overrun", PHOTO: "Photo evidence", PAY_PROGRESS: "Pay vs progress", MARK_COMPLETE: "Marked complete", DUPLICATE: "Duplicate", SPLIT: "Split works", NOT_PERMISSIBLE: "Permissible work", VENDOR: "Vendor share", ML_OUTLIER: "Outlier (ML)", DELAY_RISK: "Delay forecast (ML)" };
const DECIDE = [
  ["escalate", "Escalate", "Refer for action", "1"],
  ["evidence", "Ask for evidence", "Documents, photos or a site report", "2"],
  ["explained", "Explanation accepted", "A valid reason is on record", "3"],
  ["cleared", "Clear", "No issue on review", "4"],
];

export default function Round() {
  const { desk } = useDesk();
  const nav = useNavigate();
  const isMP = desk.persona.role === "mp";
  const [queue, setQueue] = useState(null);
  const [i, setI] = useState(0);
  const [cache, setCache] = useState({});
  const [done, setDone] = useState({});
  const [dir, setDir] = useState(1);
  const [help, setHelp] = useState(false);

  useEffect(() => {
    document.title = "Review round · Sentinel";
    const cap = readCapacity(desk.persona.role);
    call(`/api/cases?level=high,medium&review=open&sort=round&size=${cap}`).then((r) => setQueue(r.items)).catch(() => setQueue([]));
  }, [desk.persona.role]);
  // fetch current + prefetch next so the card is ready the instant it slides in
  useEffect(() => {
    if (!queue) return;
    [queue[i], queue[i + 1]].filter(Boolean).forEach((w) => {
      if (!cache[w.id]) call(`/api/cases/${encodeURIComponent(w.id)}`).then((d) => setCache((c) => ({ ...c, [w.id]: d }))).catch(() => {});
    });
  }, [queue, i, cache]);

  const go = useCallback((d) => { setDir(d); setI((x) => Math.max(0, Math.min((queue?.length || 0), x + d))); }, [queue]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") nav("/desk");
      if (e.target.closest("textarea, input")) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "?") setHelp((h) => !h);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, nav]);

  if (!queue) return <div className="round-stage"><Loading label="Preparing your round…" /></div>;
  const total = queue.length;
  const finished = i >= total;
  const current = queue[i];
  const detail = current && cache[current.id];

  return (
    <div className="round-stage">
      <header className="round-top">
        <Link to="/desk" className="round-exit"><X size={16} /> Exit <span className="kbd-inline">Esc</span></Link>
        <div className="round-progress" aria-label={`Case ${Math.min(i + 1, total)} of ${total}`}>
          {queue.map((w, k) => (
            <button key={w.id} className={`seg${k === i ? " now" : ""}${done[w.id] ? ` done ${done[w.id]}` : ""}`} onClick={() => { setDir(k > i ? 1 : -1); setI(k); }} aria-label={`Case ${k + 1}`}>
              {k === i && <motion.span layoutId="seg-now" className="seg-glow" />}
            </button>
          ))}
        </div>
        <div className="round-count">{finished ? "Round complete" : <>Case <b className="tnum"><NumberFlow value={i + 1} /></b> of {total}</>}
          <button className="round-help" onClick={() => setHelp((h) => !h)} aria-label="Keyboard shortcuts"><Keyboard size={16} /></button>
        </div>
      </header>

      <AnimatePresence>
        {help && (
          <motion.div className="round-keys" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <span><span className="kbd">1</span>–<span className="kbd">4</span> choose a decision</span>
            <span><span className="kbd">Ctrl</span>+<span className="kbd">↵</span> record</span>
            <span><span className="kbd">←</span> <span className="kbd">→</span> previous / skip</span>
            <span><span className="kbd">Esc</span> exit</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="round-body">
        <AnimatePresence mode="wait" custom={dir}>
          {finished ? (
            <Summary key="summary" queue={queue} done={done} onAgain={() => window.location.reload()} />
          ) : !total ? (
            <motion.div key="empty" className="round-empty" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}>
              <IClear size={64} accent="#e2c270" />
              <h1>Nothing waiting for you.</h1>
              <p>Every high and medium case in your area already has a decision.</p>
              <Link to="/desk/atlas" className="btn-round">Explore the Atlas <ArrowRight size={16} /></Link>
            </motion.div>
          ) : (
            <motion.div key={current.id} custom={dir} className="round-card-wrap"
              initial={(d) => ({ opacity: 0, x: 80 * d, rotate: 1.5 * d })} animate={{ opacity: 1, x: 0, rotate: 0 }}
              exit={(d) => ({ opacity: 0, x: -120 * d, rotate: -3 * d, transition: { duration: 0.35, ease } })} transition={{ type: "spring", stiffness: 260, damping: 28 }}>
              {detail ? (
                <CaseCard data={detail} isMP={isMP} decided={done[current.id]}
                  onDecided={(d) => { setDone((x) => ({ ...x, [current.id]: d })); setTimeout(() => go(1), 950); }} onSkip={() => go(1)} onBack={() => go(-1)} canBack={i > 0} />
              ) : <div className="round-loading"><Loading label="Opening the file…" /></div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function CaseCard({ data, isMP, decided, onDecided, onSkip, onBack, canBack }) {
  const w = data.work;
  const [choice, setChoice] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [stamped, setStamped] = useState(decided || null);
  const noteRef = useRef(null);
  const paid = (w.payments || []).reduce((s, p) => s + p.amount, 0);
  const suggestions = useMemo(() => {
    const acts = w.signals.map((s) => s.action).filter(Boolean);
    const byChoice = {
      escalate: acts.slice(0, 1).map((a) => `Escalated: ${a.charAt(0).toLowerCase()}${a.slice(1)}`),
      evidence: acts.slice(0, 2),
      explained: ["Valid reason recorded in the sanction order; no further action."],
      cleared: ["Reviewed site photos and records; no issue found."],
    };
    return choice ? byChoice[choice] : acts.slice(0, 2);
  }, [w, choice]);

  const record = useCallback(async () => {
    if (!choice || note.trim().length < 10 || busy) return;
    setBusy(true); setErr(null);
    try {
      await call(`/api/cases/${encodeURIComponent(w.id)}/decision`, { method: "POST", body: { decision: choice, note } });
      setStamped(choice);
      onDecided(choice);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  }, [choice, note, busy, w.id, onDecided]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); record(); return; }
      if (e.target.closest("textarea, input") || isMP) return;
      const d = DECIDE.find((x) => x[3] === e.key);
      if (d) { setChoice(d[0]); setTimeout(() => noteRef.current?.focus(), 30); }
      if (e.key === "Enter" && choice && note.trim().length >= 10) record();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [record, choice, note, isMP]);

  return (
    <article className={`rcase lvl-${w.level}`}>
      {stamped && <div className="rcase-stamp"><Stamp decision={stamped} when={new Date().toISOString()} thump /></div>}
      <div className="rcase-grid">
        <section className="rcase-story">
          <div className="rcase-top"><span className={`sev ${w.level}`}>{w.level} priority</span><Clock e={w.escalation} /><span className="mono muted">{w.id}</span></div>
          <h1 className="rcase-title" lang={w.lang}>{w.title}</h1>
          <div className="rcase-place">{w.district}, {w.state} · {w.categoryLabel} · {w.implementingAgency}</div>
          <div className="rcase-facts">
            <Fact k="Sanctioned" v={rupees(w.sanctioned)} sub={w.approvedCost > w.sanctioned ? `revised to ${rupees(w.approvedCost)}` : null} warn={w.checks.COST_OVERRUN === "flag" && w.approvedCost > w.sanctioned} />
            <Fact k="Paid" v={`${w.sanctioned ? Math.round((paid / w.sanctioned) * 100) : 0}%`} warn={w.checks.PAY_PROGRESS === "flag" || paid > (w.approvedCost || w.sanctioned) * 1.02} />
            <Fact k="Built" v={`${w.progress}%`} />
            <Fact k="Deadline" v={date(w.deadline)} warn={w.checks.DEADLINE === "flag"} sub={w.checks.DEADLINE === "flag" && !w.completedOn ? `${days(w.deadline, data.asOf)} days over` : null} />
          </div>
          <div className="rcase-why">
            <div className="label">Why it’s here</div>
            {w.signals.map((s, k) => {
              const I = CHECK_ICON[s.code];
              return (
                <motion.div key={s.code} className={`why ${s.severity}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 + k * 0.12 }}>
                  <span className="why-ic"><I size={18} /></span>
                  <div><b>{s.title}</b><p>{s.message}</p><p className="why-innocent">Could be innocent: {s.innocent}</p></div>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="rcase-evidence">
          <Scan checks={w.checks} />
          <div className="ev-card">
            <div className="label">Timeline against the rules</div>
            <Lifecycle w={w} today={data.asOf} width={640} />
          </div>
          {w.checks.COST === "flag" && w.peerRates?.length > 0 && (
            <div className="ev-card">
              <div className="label">Cost per {w.unit} against {w.peerCount} comparable works</div>
              <PeerStrip rates={w.peerRates} value={w.unitRate} median={w.peerMedianRate} unit={w.unit} />
            </div>
          )}
          {data.splitGroup && (
            <div className="ev-card">
              <div className="label">Sanctioned together — {data.splitGroup.length} works, {rupees(data.splitGroup.reduce((s, o) => s + o.sanctioned, 0))} in all</div>
              <div className="split-row">
                {data.splitGroup.map((o) => (
                  <Link key={o.id} to={`/desk/cases/${encodeURIComponent(o.id)}`} className={`split-cell${o.id === w.id ? " me" : ""}`}>
                    <span className="split-bar" style={{ height: `calc((100% - 34px) * ${(o.sanctioned / 500000).toFixed(3)})` }} />
                    <b className="tnum">{rupees(o.sanctioned)}</b><span className="mono">{o.id.split("/").pop()}</span>
                  </Link>
                ))}
                <span className="split-limit">tender limit ₹5.00 L</span>
              </div>
            </div>
          )}
          {data.pair && (
            <div className="ev-card ev-pair">
              <PairMap a={data.pair} b={w} />
              <div><div className="label">Possible duplicate of</div><Link className="mono link" to={`/desk/cases/${encodeURIComponent(data.pair.id)}`}>{data.pair.id}</Link><p lang={data.pair.lang} style={{ margin: "4px 0 0", fontSize: 13 }}>{data.pair.title}</p></div>
            </div>
          )}
        </section>
      </div>

      <footer className="rcase-decide">
        {isMP ? (
          <div className="mp-note">You are following this case. The reviewing authority records decisions; you will see them here and in the ledger.</div>
        ) : (
          <>
            <div className="decide-row">
              {DECIDE.map(([k, l, d, key]) => (
                <button key={k} className={`decide ${k}${choice === k ? " on" : ""}`} onClick={() => { setChoice(k); setTimeout(() => noteRef.current?.focus(), 30); }} disabled={!!stamped}>
                  <span className="decide-key">{key}</span><b>{l}</b><span>{d}</span>
                </button>
              ))}
            </div>
            <div className="note-row-v2">
              <textarea ref={noteRef} rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why — one line is enough (at least 10 characters)" disabled={!!stamped} />
              <button className="btn-round" onClick={record} disabled={!choice || note.trim().length < 10 || busy || !!stamped}>
                <IStamp size={18} accent="#14452f" /> {busy ? "Stamping…" : "Stamp"} <span className="kbd-inline">Ctrl ↵</span>
              </button>
            </div>
            {suggestions.length > 0 && !stamped && (
              <div className="sugg"><span className="muted">Suggested:</span>{suggestions.map((s) => <button key={s} onClick={() => setNote(s)}>{s}</button>)}</div>
            )}
            {err && <div className="round-err">{err}</div>}
          </>
        )}
        <div className="nav-row">
          <button className="ghost" onClick={onBack} disabled={!canBack}><ArrowLeft size={15} /> Previous</button>
          <Link to={`/desk/cases/${encodeURIComponent(w.id)}`} className="ghost">Open full case file</Link>
          <button className="ghost" onClick={onSkip}>{stamped ? "Next" : "Skip for now"} <ArrowRight size={15} /></button>
        </div>
      </footer>
    </article>
  );
}

// The escalation clock: new serious cases rise to the State desk if nobody decides them in time.
export function Clock({ e }) {
  if (!e) return null;
  return e.stage === "state"
    ? <span className="clock up" title={`Unreviewed ${e.age} days; the district had ${e.sla}`}><IEscalate size={14} /> Escalated to State · {e.age} days open</span>
    : <span className={`clock${e.dueIn <= 7 ? " soon" : ""}`} title={`Rises to the State desk after ${e.sla} days without a decision`}><IEscalate size={14} /> Escalates in {e.dueIn} day{e.dueIn === 1 ? "" : "s"}</span>;
}

function Fact({ k, v, warn, sub }) {
  return <div className={`rfact${warn ? " warn" : ""}`}><span>{k}</span><b className="tnum">{v}</b>{sub && <small>{sub}</small>}</div>;
}

// Visible reasoning: every check runs, one after another, and lands on flag / clear / can't assess.
function Scan({ checks }) {
  return (
    <div className="scan">
      <div className="label" style={{ marginBottom: 10 }}>Sentinel ran {CHECKS.length} checks</div>
      <div className="scan-grid">
        {CHECKS.map((c, k) => {
          const o = checks[c] || "na";
          const I = CHECK_ICON[c];
          return (
            <motion.div key={c} className={`scan-cell ${o}`} initial={{ opacity: 0.25 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 * k, duration: 0.2 }}>
              <motion.span className="scan-bar" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.08 * k, duration: 0.35, ease }} />
              <I size={16} />
              <span className="scan-name">{SHORT[c]}</span>
              <motion.span className="scan-out" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.08 * k + 0.3, type: "spring", stiffness: 500, damping: 22 }}>
                {o === "flag" ? "flag" : o === "clear" ? "clear" : "n/a"}
              </motion.span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function Summary({ queue, done, onAgain }) {
  const [chain, setChain] = useState(null);
  useEffect(() => { call("/api/ledger/verify", { method: "POST" }).then(setChain).catch(() => {}); }, []);
  const counts = Object.values(done).reduce((m, d) => ({ ...m, [d]: (m[d] || 0) + 1 }), {});
  const decided = Object.keys(done).length;
  return (
    <motion.div className="round-summary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
      <Confetti />
      <div className="eyebrow" style={{ color: "#e2c270" }}>Round complete</div>
      <h1>{decided ? <>You decided <em>{decided}</em> of {queue.length} cases.</> : "You looked through the round."}</h1>
      <div className="sum-stamps">
        {Object.entries(DECISION_LABEL).map(([k]) => (
          <div key={k} className="sum-cell"><Stamp decision={k} /><b className="tnum">{counts[k] || 0}</b></div>
        ))}
      </div>
      <p className="sum-chain">
        {chain ? (chain.ok ? <>Ledger updated and verified — <b>{chain.checked}</b> linked entries, head <span className="mono">{chain.head.slice(0, 12)}…</span></> : <>Ledger check failed at entry #{chain.brokenAt}.</>) : "Verifying the ledger…"}
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link to="/desk" className="btn-round">Back to Today</Link>
        <button className="ghost big" onClick={onAgain}>Start another round</button>
        <Link to="/desk/ledger" className="ghost big">See the ledger</Link>
      </div>
    </motion.div>
  );
}

function Confetti() {
  const bits = useMemo(() => Array.from({ length: 36 }, (_, k) => ({ x: (k * 97) % 100, d: 0.2 + (k % 7) * 0.12, r: (k * 53) % 360, c: ["#e2c270", "#5fc28e", "#f2a33a", "#f3eee0"][k % 4] })), []);
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, k) => (
        <motion.i key={k} style={{ left: `${b.x}%`, background: b.c }} initial={{ y: -40, opacity: 0, rotate: 0 }} animate={{ y: 420, opacity: [0, 1, 1, 0], rotate: b.r + 360 }} transition={{ delay: b.d, duration: 2.4, ease: "easeIn" }} />
      ))}
    </div>
  );
}
