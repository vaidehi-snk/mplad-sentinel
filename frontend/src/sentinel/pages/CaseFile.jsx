import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookMarked, Calculator, BrainCircuit, Download, ShieldCheck, Lightbulb, ArrowRight, Check, Minus, CircleSlash } from "lucide-react";
import { useApi, useDesk, call, rupees, date, int, days, DECISION_LABEL } from "../core";
import { Sev, Loading, ErrorBox, Stamp, Progress, SIGNAL_ICON } from "../ui";
import { Lifecycle, PeerStrip, PairMap } from "../viz";
import { CHECK_ORDER } from "../icons";
import { Clock } from "./Round";

const KIND = { rule: [BookMarked, "Guideline rule"], statistical: [Calculator, "Statistical comparison"], ml: [BrainCircuit, "Machine learning"] };
const DECISIONS = [
  ["escalate", "Escalate", "Refer to the District Authority / SNA for action"],
  ["evidence", "Request evidence", "Ask the agency for documents, photos or a site report"],
  ["explained", "Explanation accepted", "A valid reason exists and is recorded"],
  ["cleared", "Clear", "No issue on review"],
];

export default function CaseFile() {
  const id = decodeURIComponent(useParams()["*"] || "");
  const { data, error, loading, reload } = useApi(`/api/cases/${encodeURIComponent(id)}`);
  useEffect(() => { if (data) document.title = `${data.work.id} · Sentinel`; }, [data]);
  if (loading && !data) return <div className="page"><Loading label="Opening the case file…" /></div>;
  if (error) return <div className="page"><ErrorBox error={error} /></div>;
  const { work: w, rules, decisions, ledger, pair, siblings, splitGroup, asOf } = data;
  const latest = decisions[0];
  const paid = (w.payments || []).reduce((s, p) => s + p.amount, 0);

  return (
    <div className="page casefile">
      <Link to="/desk/cases" className="back"><ArrowLeft size={15} /> Case queue</Link>
      <div className="case-head">
        <div style={{ minWidth: 0 }}>
          <div className="mono muted" style={{ fontSize: 12.5 }}>{w.id} · {w.fy}</div>
          <h1 className="h1 case-h1" lang={w.lang}>{w.title}</h1>
          <div className="case-meta">
            <span>{w.district}, {w.state}</span><span>{w.constituency} constituency</span><span>{w.categoryLabel}</span>
            <span>Agency: {w.implementingAgency}</span><span>Vendor: {w.vendor}</span>
            {w.scArea && <span className="chip">SC area</span>}{w.stArea && <span className="chip">ST area</span>}
          </div>
        </div>
        <div className="case-verdict">
          <div className="dial" style={{ "--v": w.score, "--c": w.level === "high" ? "var(--high)" : w.level === "medium" ? "var(--medium)" : w.level === "watch" ? "var(--watch)" : "var(--clear)" }}>
            <span className="tnum">{w.score}</span><small>priority</small>
          </div>
          <Sev level={w.level} />
          <Clock e={w.escalation} />
          {latest && <Stamp decision={latest.decision} when={latest.createdAt} />}
        </div>
      </div>

      <div className="facts">
        <Fact label="Sanctioned" value={rupees(w.sanctioned)} note={w.approvedCost > w.sanctioned ? `revised to ${rupees(w.approvedCost)} (+${Math.round((w.approvedCost / w.sanctioned - 1) * 100)}%)` : w.estimate !== w.sanctioned ? `estimate ${rupees(w.estimate)}` : "as estimated"} />
        <Fact label="Paid to vendor" value={rupees(paid)} note={w.sanctioned ? `${Math.round((paid / (w.approvedCost || w.sanctioned)) * 100)}% of approved cost` : ""} />
        <Fact label="Physical progress" value={<Progress value={w.progress} />} note={w.status.replace("_", " ")} />
        <Fact label="Quantity" value={w.quantity ? `${w.quantity} ${w.unit}` : "not recorded"} note={w.unitRate ? `₹${Math.round(w.unitRate).toLocaleString("en-IN")} per ${w.unit}` : "unit cost can’t be assessed"} />
        <Fact label="Deadline" value={date(w.deadline)} note={w.extension ? "extension recorded" : w.deadline ? (asOf > w.deadline && !w.completedOn ? `${days(w.deadline, asOf)} days overdue` : "one year from sanction") : "not sanctioned"} />
      </div>

      <div className="case-grid">
        <div className="case-main">
          <section className="card">
            <div className="card-head"><h2 className="h2">Timeline against the rules</h2><span className="aside">◆ stage payment (hollow = no photo)</span></div>
            <div style={{ padding: "6px 18px 10px" }}><Lifecycle w={w} today={asOf} /></div>
          </section>

          <section>
            <h2 className="h2 section-title">Why this work surfaced {w.signals.length ? <span className="muted tnum">· {w.signals.length} signal{w.signals.length > 1 ? "s" : ""}</span> : null}</h2>
            {!w.signals.length && <div className="card card-pad muted">No check raised a signal on the available evidence. {w.level === "incomplete" ? "Several checks could not run because data is missing — see the check sheet." : ""}</div>}
            {w.signals.map((s) => <SignalCard key={s.code} s={s} />)}
          </section>

          {w.peerRates?.length > 0 && (
            <section className="card">
              <div className="card-head"><h2 className="h2">Cost against comparable works</h2><span className="aside">{w.peerCount} {w.peerScope} · log scale</span></div>
              <div style={{ padding: "8px 22px 18px" }}>
                <PeerStrip rates={w.peerRates} value={w.unitRate} median={w.peerMedianRate} unit={w.unit} />
                <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
                  This work: <b style={{ color: "var(--ink)" }}>₹{Math.round(w.unitRate).toLocaleString("en-IN")}/{w.unit}</b> · peer median ₹{w.peerMedianRate.toLocaleString("en-IN")} · {w.costRatio}× · dashed line = 1.6× attention threshold. Compared per {w.unit}, so a bigger work is not penalised for being bigger.
                </div>
              </div>
            </section>
          )}

          {splitGroup && (
            <section className="card">
              <div className="card-head"><h2 className="h2">Sanctioned together</h2><span className="aside">{splitGroup.length} works · same type, vendor and neighbourhood · {rupees(splitGroup.reduce((s, o) => s + o.sanctioned, 0))} combined</span></div>
              <div style={{ padding: "4px 22px 18px" }}>
                <div className="split-row">
                  {splitGroup.map((o) => (
                    <Link key={o.id} to={`/desk/cases/${encodeURIComponent(o.id)}`} className={`split-cell${o.id === w.id ? " me" : ""}`}>
                      <span className="split-bar" style={{ height: `calc((100% - 34px) * ${(o.sanctioned / 500000).toFixed(3)})` }} />
                      <b className="tnum">{rupees(o.sanctioned)}</b><span className="mono">{o.id.split("/").pop()}</span>
                    </Link>
                  ))}
                  <span className="split-limit">tender limit ₹5.00 L (demo)</span>
                </div>
              </div>
            </section>
          )}

          {pair && <DuplicateCompare a={pair.sanctionedOn <= w.sanctionedOn ? pair : w} b={pair.sanctionedOn <= w.sanctionedOn ? w : pair} current={w.id} />}

          <section className="card">
            <div className="card-head"><h2 className="h2">Check sheet</h2><span className="aside">every check, including the ones that passed or could not run</span></div>
            <div className="checks">
              {CHECK_ORDER.filter((c) => w.checks[c] || c === "DELAY_RISK").map((c) => {
                const o = w.checks[c] || (w.completedOn ? "na" : "clear");
                const Icon = SIGNAL_ICON[c];
                return (
                  <div key={c} className={`check ${o}`}>
                    <Icon size={15} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500 }}>{rules[c].title}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{w.checks[c + "_note"] || (o === "flag" ? "Signal raised — see above" : o === "clear" ? "No signal on available evidence" : c === "DELAY_RISK" ? "Work already complete" : "Cannot assess")}</div>
                    </div>
                    <span className="check-outcome">{o === "flag" ? <><Check size={13} /> Flag</> : o === "clear" ? <><Minus size={13} /> Clear</> : <><CircleSlash size={13} /> Can’t assess</>}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card">
            <div className="card-head"><h2 className="h2">Payments</h2><span className="aside">vendor payments released on the portal</span></div>
            <table className="table" style={{ marginTop: 10 }}>
              <thead><tr><th>Stage</th><th>Date</th><th className="right">Amount</th><th>Asset photo</th></tr></thead>
              <tbody>
                {(w.payments || []).map((p) => (
                  <tr key={p.stage}><td className="tnum">{p.stage}%</td><td className="tnum">{date(p.on)}</td><td className="right tnum">{rupees(p.amount)}</td>
                    <td>{p.photo ? <span className="chip">Uploaded</span> : <span className="chip high">Missing</span>}</td></tr>
                ))}
                {!w.payments?.length && <tr><td colSpan={4} className="muted">No payments released yet.</td></tr>}
              </tbody>
            </table>
          </section>
        </div>

        <aside className="case-side">
          <DecisionPanel w={w} onSaved={reload} decisions={decisions} />
          {ledger.length > 0 && (
            <div className="card card-pad">
              <div className="h3" style={{ marginBottom: 10 }}>Ledger for this work</div>
              {ledger.map((e) => (
                <div key={e.seq} className="ledger-mini">
                  <div style={{ fontWeight: 500 }}>{e.action.replace("DECISION_", "").replaceAll("_", " ").toLowerCase()}</div>
                  <div className="mono muted" style={{ fontSize: 11 }}>#{e.seq} · {e.hash.slice(0, 16)}…</div>
                  <div className="mono muted" style={{ fontSize: 11 }}>prev {e.prevHash.slice(0, 16)}…</div>
                </div>
              ))}
              <Link to="/desk/ledger" className="link" style={{ fontSize: 12.5 }}>Verify the whole chain <ArrowRight size={12} /></Link>
            </div>
          )}
          {siblings.length > 0 && (
            <div className="card card-pad">
              <div className="h3" style={{ marginBottom: 8 }}>Same vendor, same constituency</div>
              {w.vendorConcentration && <div className="note-row" style={{ marginBottom: 8, background: "var(--watch-soft)" }}><span>{w.vendor} holds <b>{Math.round(w.vendorConcentration.share * 100)}%</b> of {w.constituency}’s sanctioned value</span></div>}
              {siblings.map((o) => (
                <Link key={o.id} to={`/desk/cases/${encodeURIComponent(o.id)}`} className="sib">
                  <Sev level={o.level} /><span lang={o.lang} className="sib-title">{o.title}</span><span className="tnum muted">{rupees(o.sanctioned)}</span>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Fact({ label, value, note }) {
  return <div className="fact"><div className="label">{label}</div><div className="fact-value tnum">{value}</div><div className="muted" style={{ fontSize: 12 }}>{note}</div></div>;
}

function SignalCard({ s }) {
  const Icon = SIGNAL_ICON[s.code];
  const [KIcon, kind] = KIND[s.kind] || KIND.rule;
  return (
    <article className={`signal-card ${s.severity}`}>
      <div className="signal-top">
        <span className="signal-icon"><Icon size={17} /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="signal-title">{s.title}</div>
          <div className="signal-msg">{s.message}</div>
        </div>
        <Sev level={s.severity} />
      </div>
      <div className="signal-body">
        <dl className="evidence">
          {(s.evidence || []).map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="tnum">{v}</dd></div>)}
        </dl>
        <div className="signal-cols">
          <div className="innocent"><Lightbulb size={14} /><div><b>Could be innocent</b><p>{s.innocent}</p></div></div>
          <div className="nextstep"><ArrowRight size={14} /><div><b>Suggested next step</b><p>{s.action}</p></div></div>
        </div>
        <div className="basis"><KIcon size={13} /><span><b>{kind}.</b> {s.basis}</span></div>
      </div>
    </article>
  );
}

function DuplicateCompare({ a, b, current }) {
  const rows = [["Work ID", "id"], ["Title", "title"], ["Sanctioned on", "sanctionedOn", date], ["Amount", "sanctioned", rupees], ["Agency", "implementingAgency"], ["Vendor", "vendor"], ["Quantity", "quantity", (v, w) => `${v ?? "—"} ${w.unit}`]];
  return (
    <section className="card">
      <div className="card-head"><h2 className="h2">Side by side: possible duplicate</h2><span className="aside">matching fields are highlighted</span></div>
      <div className="dup-grid">
        <PairMap a={a} b={b} />
        <table className="table dup-table">
          <thead><tr><th /><th>A · earlier</th><th>B · later</th></tr></thead>
          <tbody>
            {rows.map(([l, k, f]) => {
              const va = f ? f(a[k], a) : a[k], vb = f ? f(b[k], b) : b[k];
              const same = k !== "id" && String(va) === String(vb);
              return (
                <tr key={k}><td className="label" style={{ whiteSpace: "nowrap" }}>{l}</td>
                  {[[a, va], [b, vb]].map(([w, v], i) => (
                    <td key={i} className={same ? "same" : ""}>
                      {k === "id" ? (w.id === current ? <b className="mono">{v}</b> : <Link className="mono link" to={`/desk/cases/${encodeURIComponent(w.id)}`}>{v}</Link>) : <span lang={k === "title" ? w.lang : undefined}>{v}</span>}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DecisionPanel({ w, decisions, onSaved }) {
  const { desk } = useDesk();
  const [choice, setChoice] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [fresh, setFresh] = useState(null);
  const isMP = desk.persona.role === "mp";
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const r = await call(`/api/cases/${encodeURIComponent(w.id)}/decision`, { method: "POST", body: { decision: choice, note } });
      setFresh(r.decision); setNote(""); setChoice(null); onSaved();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const exportPacket = () => {
    const snapshot = JSON.stringify({ work: w, decisions, exportedAt: new Date().toISOString(), exportedBy: desk.persona });
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(snapshot)).then((h) => {
      const sha = [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
      const blob = new Blob([JSON.stringify({ snapshotSha256: sha, snapshotJson: snapshot }, null, 2)], { type: "application/json" });
      Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `evidence-${w.id.replaceAll("/", "_")}.json` }).click();
    });
  };
  return (
    <div className="card card-pad decision">
      <div className="h3" style={{ fontFamily: "var(--serif)", fontSize: 17, fontWeight: 600 }}>Record a decision</div>
      <p className="muted" style={{ fontSize: 12.5, margin: "4px 0 12px" }}>A flag is a reason to look, not a finding. Your decision and note are hash-linked into the ledger.</p>
      {fresh && <div style={{ display: "grid", placeItems: "center", padding: "10px 0 16px" }}><Stamp decision={fresh.decision} when={fresh.createdAt} thump /></div>}
      {isMP ? (
        <div className="note-row">MPs can follow every case here; decisions are recorded by the reviewing authority.</div>
      ) : (
        <>
          <div className="decision-opts">
            {DECISIONS.map(([k, l, d]) => (
              <button key={k} className={`decision-opt ${k}${choice === k ? " on" : ""}`} onClick={() => setChoice(k)} aria-pressed={choice === k}>
                <b>{l}</b><span>{d}</span>
              </button>
            ))}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Reason, and what you asked for (at least 10 characters)…" className="textarea" />
          {err && <div style={{ color: "var(--high)", fontSize: 12.5, marginTop: 6 }}>{err}</div>}
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} disabled={!choice || note.trim().length < 10 || busy} onClick={save}>
            <ShieldCheck /> {busy ? "Recording…" : "Record and stamp"}
          </button>
        </>
      )}
      {decisions.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="label" style={{ marginBottom: 8 }}>History</div>
          {decisions.map((d, i) => (
            <div key={i} className="history-row">
              <span className={`mini-stamp ${d.decision}`}>{DECISION_LABEL[d.decision]}</span>
              <p>{d.note}</p>
              <div className="muted" style={{ fontSize: 11.5 }}>{d.actor} · {d.role} · {date(d.createdAt)}</div>
            </div>
          ))}
        </div>
      )}
      <button className="btn btn-ghost" style={{ marginTop: 10, width: "100%", justifyContent: "center" }} onClick={exportPacket}><Download /> Export evidence packet</button>
      <div className="muted" style={{ fontSize: 11, textAlign: "center" }}>JSON snapshot with its SHA-256 digest · {int((w.signals || []).length)} signals</div>
    </div>
  );
}
