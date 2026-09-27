import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import NumberFlow from "@number-flow/react";
import { ArrowDown } from "lucide-react";
import { TownScene } from "../illustrations";
import { ILedger, IOutlier, IClear, IStamp } from "../icons";
import { useDesk, int, pct } from "../core";
import { DeskChooser, Mark } from "../shell";

export default function Entrance() {
  const { desk, meta, open } = useDesk();
  const nav = useNavigate();
  useEffect(() => { document.title = "Sentinel · MPLADS oversight"; }, []);
  // Demo shortcut: /?as=district:Nashik opens that desk directly (handy for a live pitch).
  useEffect(() => {
    const as = new URLSearchParams(window.location.search).get("as");
    if (!as || !meta?.personas) return;
    const [role, ...rest] = as.split(":");
    const next = new URLSearchParams(window.location.search).get("next") || "/desk";
    open(role, rest.join(":") || undefined).then(() => nav(next, { replace: true })).catch(() => {});
  }, [meta, open, nav]);
  const n = meta?.nationalContext;
  const ev = meta?.evaluation;
  const best = ev?.checks.filter((c) => c.recall != null);
  return (
    <div className="entrance">
      <header className="entrance-top">
        <div className="brand"><Mark /><span><span className="brand-name">Sentinel</span><span className="brand-sub">MPLADS oversight</span></span></div>
        <span className="chip" style={{ marginLeft: "auto" }}>SIH26102 · MoSPI · Smart Automation</span>
        {desk && <button className="btn btn-primary" onClick={() => nav("/desk")}>Return to {desk.persona.jurisdiction} desk</button>}
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">AI-assisted monitoring for MPLADS works</div>
          <motion.h1 className="display" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}>
            Every work, watched.<br />The few that need you, <em>explained.</em>
          </motion.h1>
          <p className="lede" style={{ fontSize: 17.5 }}>
            Sentinel follows each MPLADS work from recommendation to completion, checks it against the scheme’s rules and its peers,
            and hands each official a short list for the week, with the evidence, the rule, and an innocent explanation to rule out.
          </p>
          <div className="hero-ctas">
            <a href="#desks" className="btn-round">Choose your desk <ArrowDown size={16} /></a>
            <a href="#how" className="ghost-dark">How it works</a>
          </div>
          {n && (
            <div className="national">
              <div className="label" style={{ marginBottom: 12 }}>The scale of the scheme · 18th Lok Sabha · eSAKSHI public dashboard</div>
              <div className="national-row">
                <div><b className="tnum">₹<NumberFlow value={Math.round(n.allocatedCr)} locales="en-IN" /> cr</b><span>allocated to MPs</span></div>
                <div><b className="tnum"><NumberFlow value={n.recommended.works} locales="en-IN" /></b><span>works recommended</span></div>
                <div><b className="tnum"><NumberFlow value={n.sanctioned.works} locales="en-IN" /></b><span>sanctioned</span></div>
                <div><b className="tnum"><NumberFlow value={n.completed.works} locales="en-IN" /></b><span>marked complete</span></div>
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>No team can inspect this by hand. Read 20 Sep 2026 from mplads.mospi.gov.in.</div>
            </div>
          )}
        </div>
        <motion.div className="hero-art" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.15 }}>
          <TownScene />
          <div className="hero-caption">Every asset the scheme funds, checked as its record changes.</div>
        </motion.div>
      </section>

      <section className="entrance-desks" id="desks">
        <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <h2 className="h2" style={{ fontSize: 26 }}>Choose your desk</h2>
          <span className="muted">One platform, four roles from the problem statement. Each desk sees only its own jurisdiction.</span>
        </div>
        <DeskChooser />
        <p className="muted" style={{ fontSize: 12.5, marginTop: 14 }}>
          Demo access: choosing a desk does not verify identity. In deployment, officials sign in through NIC Parichay single sign-on and their eSAKSHI role sets the desk automatically.
        </p>
      </section>

      <section className="how" id="how">
        {[
          [ILedger, "Read the record", "Recommendations, sanctions, stage payments, photos and completion — the fields eSAKSHI already captures."],
          [IOutlier, "Run thirteen checks", "Guideline rules (45-day sanction, one-year completion, permissible works, cost overruns), peer cost comparison, duplicate and split-work detection, Isolation Forest and a delay forecast."],
          [IClear, "Explain, don’t accuse", "Each flag shows its evidence, the rule it rests on, and an innocent explanation to rule out. Missing data reads “can’t assess”, never “clear”."],
          [IStamp, "Decide, or it rises", "The authority escalates, asks for evidence or clears. A new serious case left undecided past its deadline rises to the State desk on its own. Every decision is hash-linked."],
        ].map(([Icon, t, d], i) => (
          <div key={t} className="how-step">
            <span className="how-n serif">0{i + 1}</span>
            <Icon size={26} className="how-icon" />
            <div className="h3" style={{ fontSize: 15, fontFamily: "var(--serif)" }}>{t}</div>
            <p>{d}</p>
          </div>
        ))}
      </section>

      {best && (
        <section className="proof">
          <div>
            <div className="eyebrow">Measured, not promised</div>
            <h2 className="h2" style={{ fontSize: 26, maxWidth: 380 }}>Tested against problems we planted — and innocent look-alikes we didn’t want flagged</h2>
            <p className="muted" style={{ maxWidth: 420 }}>The demo dataset carries a hidden answer key. Recall shows how many planted problems each check found; the controls show false alarms on legitimate cases.</p>
          </div>
          <div className="proof-grid">
            {best.map((c) => (
              <div key={c.code} className="proof-cell">
                <div className="proof-num tnum">{pct(c.recall)}</div>
                <div className="proof-label">{c.title}</div>
                <div className="muted" style={{ fontSize: 11.5 }}>{c.found}/{c.planted} found{c.precision != null ? ` · ${pct(c.precision)} precise` : ""}</div>
              </div>
            ))}
            <div className="proof-cell dark">
              <div className="proof-num tnum">{ev.controls.reduce((s, c) => s + c.falseAlerts, 0)}</div>
              <div className="proof-label">false alarms on {ev.controls.reduce((s, c) => s + c.cases, 0)} legitimate look-alikes</div>
              <div style={{ fontSize: 11.5, opacity: 0.75 }}>big-but-fair works, approved extensions, phase II roads</div>
            </div>
          </div>
        </section>
      )}

      <footer className="entrance-foot">
        <span>Demo dataset: {meta ? int(meta.totals.works) : "…"} synthetic works across {meta?.totals.constituencies} constituencies, modelled on eSAKSHI fields. Real place names; MPs, agencies and vendors are generic — nothing here is an allegation about a real person or body.</span>
      </footer>
    </div>
  );
}
