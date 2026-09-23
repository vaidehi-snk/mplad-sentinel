import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useApi, useScopeQuery, rupees, date } from "../core";
import { Loading, ErrorBox } from "../ui";
import { PairMap } from "../viz";

export default function Duplicates() {
  const q = useScopeQuery();
  const { data, error, loading } = useApi(`/api/duplicates?${q}`);
  useEffect(() => { document.title = "Duplicates · Sentinel"; }, []);
  if (loading && !data) return <div className="page"><Loading /></div>;
  if (error) return <div className="page"><ErrorBox error={error} /></div>;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Duplicate works</div>
          <h1 className="h1">The same asset, <em>sanctioned twice?</em></h1>
          <p className="lede">Pairs of the same work type within 250 metres whose descriptions closely match. Phases and next segments of a road are deliberately excluded — in testing, none of the 12 “Phase II” look-alikes was flagged.</p>
        </div>
      </div>
      <div className="dup-list">
        {data.pairs.map((p) => (
          <div key={p.a + p.b} className="card dup-card">
            <PairMap a={p.first} b={p.second} />
            <div className="dup-body">
              <div className="dup-scores">
                <span><b className="tnum">{p.distance} m</b> apart</span>
                <span><b className="tnum">{Math.round(p.similarity * 100)}%</b> description match</span>
                <span className="chip">{p.first.categoryLabel}</span>
              </div>
              {[["A", p.first], ["B", p.second]].map(([k, w]) => (
                <Link key={k} to={`/desk/cases/${encodeURIComponent(w.id)}`} className="dup-work">
                  <span className={`dup-tag ${k}`}>{k}</span>
                  <span style={{ minWidth: 0 }}>
                    <span className="first-title" lang={w.lang}>{w.title}</span>
                    <span className="mono muted" style={{ fontSize: 11.5 }}>{w.id} · sanctioned {date(w.sanctionedOn)} · {rupees(w.sanctioned)} · {w.vendor}</span>
                  </span>
                  <ArrowRight size={14} className="muted" />
                </Link>
              ))}
            </div>
          </div>
        ))}
        {!data.pairs.length && <div className="card empty">No duplicate candidates in this scope.</div>}
      </div>
    </div>
  );
}
