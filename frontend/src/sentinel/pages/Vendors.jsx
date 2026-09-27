import { useEffect, useState } from "react";
import { useApi, useScopeQuery, crore, pct } from "../core";
import { Loading, ErrorBox } from "../ui";

export default function Vendors() {
  const q = useScopeQuery();
  const { data, error, loading } = useApi(`/api/vendors?${q}`);
  const [all, setAll] = useState(false);
  useEffect(() => { document.title = "Vendors · Sentinel"; }, []);
  if (loading && !data) return <div className="page"><Loading /></div>;
  if (error) return <div className="page"><ErrorBox error={error} /></div>;
  const rows = all ? data.rows : data.rows.slice(0, 30);
  const flagged = data.rows.filter((r) => r.flagged);
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Vendor concentration</div>
          <h1 className="h1">Who builds <em>most</em> of the works?</h1>
          <p className="lede">Share of each constituency’s sanctioned value held by one vendor. Above 30% across six or more works is worth a look at tender participation — concentration is a pattern, not proof of collusion.</p>
        </div>
        <div className="head-actions">
          <div className="big-count"><b className="tnum">{flagged.length}</b><span>vendors above 30%<br />of a constituency</span></div>
        </div>
      </div>
      <div className="card" style={{ overflow: "hidden" }}>
        <table className="table">
          <thead><tr><th>Vendor</th><th>Constituency</th><th className="right">Works</th><th className="right">Value</th><th style={{ width: "32%" }}>Share of constituency value</th><th className="right">High-priority works</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.constituency + r.vendor} className={r.flagged ? "flag-row" : ""}>
                <td style={{ fontWeight: 500 }}>{r.vendor}{r.flagged && <span className="chip watch" style={{ marginLeft: 8 }}>above 30%</span>}</td>
                <td>{r.constituency}<div className="muted" style={{ fontSize: 12 }}>{r.district}, {r.state}</div></td>
                <td className="right tnum">{r.works}</td>
                <td className="right tnum">{crore(r.value / 1e7, 2)}</td>
                <td>
                  <div className="share">
                    <div className="share-track"><div className="share-fill" style={{ width: `${Math.min(100, r.share * 100 * 1.6)}%`, background: r.flagged ? "var(--watch)" : "var(--forest-2)" }} /><div className="share-mark" style={{ left: `${30 * 1.6}%` }} /></div>
                    <span className="tnum" style={{ fontWeight: r.flagged ? 600 : 400 }}>{pct(r.share)}</span>
                  </div>
                </td>
                <td className="right tnum" style={{ color: r.signals ? "var(--high)" : "var(--muted)" }}>{r.signals}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.rows.length > 30 && <div className="pager"><span className="muted">{data.rows.length} vendor–constituency pairs</span><button className="btn btn-ghost" onClick={() => setAll(!all)}>{all ? "Show top 30" : "Show all"}</button></div>}
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>Implementing agencies (Zilla Parishad, PWD…) are not vendors and are not compared here. Vendor names in the demo dataset are generic.</p>
    </div>
  );
}
