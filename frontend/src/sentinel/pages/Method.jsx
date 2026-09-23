import { useEffect } from "react";
import { BookMarked, Calculator, BrainCircuit } from "lucide-react";
import { useApi, pct, int } from "../core";
import { Loading, ErrorBox, SIGNAL_ICON } from "../ui";

const KIND = { rule: [BookMarked, "Guideline rule"], statistical: [Calculator, "Statistical"], ml: [BrainCircuit, "Machine learning"] };
const CONTROL_LABEL = {
  control_large_but_fair: "Large works with a fair unit rate",
  control_approved_extension: "Works with an approved time extension",
  control_phase_two: "Phase II / next segment of the same road",
  control_missing_quantity: "Records with no quantity",
};

export default function Method() {
  const { data, error, loading } = useApi("/api/method");
  useEffect(() => { document.title = "Method · Sentinel"; }, []);
  if (loading && !data) return <div className="page"><Loading /></div>;
  if (error) return <div className="page"><ErrorBox error={error} /></div>;
  const { rules, evaluation: ev, nationalContext: n } = data;
  return (
    <div className="page method">
      <div className="page-head">
        <div>
          <div className="eyebrow">Method</div>
          <h1 className="h1">How Sentinel decides what to show you</h1>
          <p className="lede">Thirteen checks on every work, plus two scheme-level watches (fund utilisation and bursts of sanctions), each with a stated basis. Rules are applied exactly; statistical checks compare like with like; machine learning only raises priority or forecasts delay. Nothing here is a finding of fraud.</p>
        </div>
      </div>

      <h2 className="h2 section-title">The checks</h2>
      <div className="rules-list">
        {Object.entries(rules).map(([code, r]) => {
          const Icon = SIGNAL_ICON[code];
          const [KIcon, kind] = KIND[r.kind];
          return (
            <div key={code} className="card rule-item">
              <Icon size={18} className="muted" />
              <div><div style={{ fontWeight: 600 }}>{r.title}</div><div className="muted" style={{ fontSize: 13 }}>{r.basis}</div></div>
              <span className={`kind ${r.kind}`}><KIcon size={12} /> {kind}</span>
            </div>
          );
        })}
      </div>

      <h2 className="h2 section-title" style={{ marginTop: 30 }}>Measured on the demo dataset</h2>
      <div className="brief-grid">
        <div className="card" style={{ overflow: "hidden" }}>
          <table className="table">
            <thead><tr><th>Check</th><th className="right">Planted</th><th className="right">Found</th><th className="right">Recall</th><th className="right">Precision</th></tr></thead>
            <tbody>
              {ev.checks.map((c) => (
                <tr key={c.code}>
                  <td>{c.title}</td><td className="right tnum">{c.planted}</td><td className="right tnum">{c.found}</td>
                  <td className="right tnum" style={{ fontWeight: 600 }}>{pct(c.recall)}</td>
                  <td className="right tnum">{c.precision == null ? <span className="muted" title="Rule checks are exact: every flag is a real breach of the rule, planted or not">exact rule</span> : pct(c.precision)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid">
          <div className="card card-pad">
            <div className="h3" style={{ marginBottom: 10 }}>False alarms on legitimate look-alikes</div>
            {ev.controls.map((c) => (
              <div key={c.control} className="control-row">
                <span>{CONTROL_LABEL[c.control]}</span>
                <span className="tnum"><b style={{ color: c.falseAlerts ? "var(--high)" : "var(--clear)" }}>{c.falseAlerts}</b> of {c.cases} flagged</span>
                {c.cannotAssess > 0 && <span className="chip">{c.cannotAssess} “can’t assess”</span>}
              </div>
            ))}
          </div>
          <div className="card card-pad">
            <div className="h3" style={{ marginBottom: 8 }}>Delay forecast model</div>
            <div className="muted" style={{ fontSize: 13 }}>Logistic regression · features: sanction lag, open workload of the agency, vendor’s past lateness, work type, sanctioned size. Trained on works sanctioned before 1 Oct 2024 ({int(ev.model.trainedOn)}), tested on later works ({int(ev.model.testedOn)}).</div>
            <div className="auc"><span className="serif tnum">{ev.model.testAuc}</span><span>hold-out AUC<br /><small className="muted">0.5 = chance · 1.0 = perfect</small></span></div>
          </div>
        </div>
      </div>

      <h2 className="h2 section-title" style={{ marginTop: 30 }}>Data and its limits</h2>
      <div className="brief-grid three">
        <div className="card card-pad">
          <div className="h3">Demo dataset</div>
          <p className="muted" style={{ fontSize: 13 }}>{data.meta.note}</p>
          <div className="mono muted" style={{ fontSize: 11.5, overflowWrap: "anywhere" }}>SHA-256 {data.datasetDigest}</div>
        </div>
        <div className="card card-pad">
          <div className="h3">Real national context</div>
          <p className="muted" style={{ fontSize: 13 }}>{n.source}: ₹{int(n.allocatedCr)} cr allocated, {int(n.recommended.works)} works recommended, {int(n.sanctioned.works)} sanctioned, {int(n.completed.works)} marked complete.</p>
        </div>
        <div className="card card-pad">
          <div className="h3">In deployment</div>
          <ul className="muted" style={{ fontSize: 13, paddingLeft: 18, margin: "8px 0 0" }}>
            <li>Read-only feed from eSAKSHI (sanctions, payments, photos, completion)</li>
            <li>Officials sign in with NIC Parichay SSO; the eSAKSHI role sets the desk</li>
            <li>Thresholds tuned per state with reviewed outcomes, not guessed</li>
            <li>Ledger checkpoints anchored outside the database</li>
          </ul>
        </div>
      </div>
      <div className="card card-pad" style={{ marginTop: 18 }}>
        <div className="h3" style={{ marginBottom: 8 }}>Fields each record carries</div>
        <div className="chips">{data.fields.map((f) => <span key={f} className="chip mono">{f}</span>)}</div>
      </div>
    </div>
  );
}
