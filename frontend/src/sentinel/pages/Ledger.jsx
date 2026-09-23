import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ShieldAlert, Link2 } from "lucide-react";
import { useApi, call } from "../core";
import { Loading, ErrorBox } from "../ui";

const when = (s) => new Date(s).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function Ledger() {
  const { data, error, loading } = useApi("/api/ledger");
  const [check, setCheck] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { document.title = "Ledger · Sentinel"; }, []);
  const verify = async () => { setBusy(true); try { setCheck(await call("/api/ledger/verify", { method: "POST" })); } finally { setBusy(false); } };
  if (loading && !data) return <div className="page"><Loading /></div>;
  if (error) return <div className="page"><ErrorBox error={error} /></div>;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Evidence ledger</div>
          <h1 className="h1">Every decision, <em>linked to the one before</em></h1>
          <p className="lede">Each entry stores the hash of the previous entry. Change any past record and every later link breaks — so a quiet edit is visible. A local chain proves integrity of the log, not the truth of the underlying record.</p>
        </div>
        <div className="head-actions"><button className="btn btn-primary" onClick={verify} disabled={busy}><ShieldCheck /> {busy ? "Verifying…" : "Verify the chain"}</button></div>
      </div>
      {check && (
        <div className={`verify-banner ${check.ok ? "ok" : "bad"}`}>
          {check.ok ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
          <span>{check.ok ? <>All <b>{check.checked}</b> entries verified. Head of chain <span className="mono">{check.head.slice(0, 24)}…</span></> : <>Chain broken at entry <b>#{check.brokenAt}</b> — a record was changed after it was written.</>}</span>
        </div>
      )}
      <div className="chain">
        {data.entries.map((e) => (
          <div key={e.seq} className="block">
            <div className="block-seq serif">#{e.seq}</div>
            <div className="block-body">
              <div className="block-top">
                <span className="block-action">{e.action.replaceAll("_", " ").toLowerCase()}</span>
                {e.work && <Link className="mono link" to={`/desk/cases/${encodeURIComponent(e.work)}`}>{e.work}</Link>}
                <span className="muted" style={{ marginLeft: "auto", fontSize: 12 }}>{when(e.createdAt)}</span>
              </div>
              <div style={{ fontSize: 13 }}>{e.actor}</div>
              {e.detail && <div className="muted" style={{ fontSize: 12.5, overflowWrap: "anywhere" }}>{e.detail}</div>}
              <div className="block-hashes mono"><span>hash {e.hash.slice(0, 20)}…</span><span><Link2 size={11} /> prev {e.prevHash.slice(0, 20)}…</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
