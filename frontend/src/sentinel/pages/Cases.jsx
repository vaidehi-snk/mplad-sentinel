import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Search, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { useApi, useScopeQuery, rupees, date, int, DECISION_LABEL } from "../core";
import { Sev, SignalChip, Loading, ErrorBox, Progress, SIGNAL_SHORT } from "../ui";

const LEVELS = [["high,medium", "Needs attention"], ["high", "High"], ["medium", "Medium"], ["watch", "Watch"], ["incomplete", "Can’t assess"], ["", "All works"]];
const STATUS = { recommended: "Awaiting sanction", sanctioned: "Sanctioned", in_progress: "In progress", completed: "Completed", rejected: "Rejected" };

export default function Cases() {
  const scope = useScopeQuery();
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const level = sp.get("level") ?? "high,medium";
  const signal = sp.get("signal") || "";
  const review = sp.get("review") || "open";
  const sort = sp.get("sort") || "priority";
  const page = +(sp.get("page") || 1);
  const size = +(sp.get("size") || 10);
  const [q, setQ] = useState(sp.get("q") || "");
  const qs = new URLSearchParams(scope);
  Object.entries({ level, signal, review: review === "all" ? "" : review, sort, page, size, q: sp.get("q") || "" }).forEach(([k, v]) => v && qs.set(k, v));
  const { data, error, loading } = useApi(`/api/cases?${qs}`);
  useEffect(() => { document.title = "Case queue · Sentinel"; }, []);
  const set = (patch) => { const n = new URLSearchParams(sp); Object.entries(patch).forEach(([k, v]) => (v === "" || v == null ? n.delete(k) : n.set(k, v))); if (!("page" in patch)) n.delete("page"); setSp(n); };
  useEffect(() => { const t = setTimeout(() => { if ((sp.get("q") || "") !== q) set({ q }); }, 250); return () => clearTimeout(t); }); // eslint-disable-line

  const exportCsv = () => {
    if (!data) return;
    const rows = [["id", "title", "district", "constituency", "level", "score", "sanctioned", "status", "deadline", "signals"], ...data.items.map((w) => [w.id, w.title, w.district, w.constituency, w.level, w.score, w.sanctioned, w.status, w.deadline, w.signals.map((s) => s.code).join("|")])];
    const blob = new Blob([rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "sentinel-cases.csv" }); a.click();
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Case queue · {data?.scope.label || "…"}</div>
          <h1 className="h1">What to open <em>next</em></h1>
          <p className="lede">Ranked by the strength of the evidence, not by how large the work is. Set how many you can review this week and work down the list.</p>
        </div>
        <div className="head-actions">
          <label className="capacity">
            <span className="label">This week I can review</span>
            <select value={size} onChange={(e) => set({ size: e.target.value })}>{[5, 10, 25, 50].map((n) => <option key={n} value={n}>{n} cases</option>)}</select>
          </label>
          <button className="btn" onClick={exportCsv}><Download /> Export</button>
        </div>
      </div>

      <div className="filterbar card">
        <div className="seg-group" role="tablist" aria-label="Priority">
          {LEVELS.map(([v, l]) => (
            <button key={l} role="tab" aria-selected={level === v} className={`seg-btn${level === v ? " on" : ""}`} onClick={() => set({ level: v })}>
              {l}{data && v && v !== "high,medium" ? <span className="tnum muted"> {data.facets.level[v] || 0}</span> : null}
            </button>
          ))}
        </div>
        <select className="select" value={signal} onChange={(e) => set({ signal: e.target.value })} aria-label="Signal">
          <option value="">Any signal</option>
          {data && Object.entries(data.facets.signal).filter(([k]) => k !== "VENDOR").sort((a, b) => b[1] - a[1]).map(([k, n]) => <option key={k} value={k}>{SIGNAL_SHORT[k]} ({n})</option>)}
        </select>
        <select className="select" value={review} onChange={(e) => set({ review: e.target.value })} aria-label="Review status">
          <option value="open">Not yet reviewed</option><option value="done">Reviewed</option><option value="all">Reviewed or not</option>
        </select>
        <select className="select" value={sort} onChange={(e) => set({ sort: e.target.value })} aria-label="Sort">
          <option value="priority">Sort: priority</option><option value="amount">Sort: amount</option><option value="deadline">Sort: deadline</option><option value="recent">Sort: most recent</option>
        </select>
        <label className="search-box"><Search size={15} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Work ID, title, vendor, agency…" /></label>
      </div>

      {error ? <ErrorBox error={error} /> : !data ? <Loading /> : (
        <div className="card" style={{ overflow: "hidden", opacity: loading ? 0.6 : 1, transition: "opacity .2s" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="table cases-table">
              <thead><tr><th style={{ width: 38 }}>#</th><th>Priority</th><th>Work</th><th>Why it surfaced</th><th className="right">Sanctioned</th><th>Progress</th><th>Deadline</th><th>Review</th></tr></thead>
              <tbody>
                {data.items.map((w, i) => (
                  <tr key={w.id} className="row" onClick={() => nav(`/desk/cases/${encodeURIComponent(w.id)}`)}>
                    <td className="serif muted" style={{ fontSize: 17 }}>{(page - 1) * size + i + 1}</td>
                    <td><Sev level={w.level} /><div className="tnum muted" style={{ fontSize: 11.5, marginTop: 6 }}>score {w.score}</div></td>
                    <td style={{ maxWidth: 360 }}>
                      <Link to={`/desk/cases/${encodeURIComponent(w.id)}`} className="case-title" lang={w.lang} onClick={(e) => e.stopPropagation()}>{w.title}</Link>
                      <div className="mono muted" style={{ fontSize: 11.5, marginTop: 3 }}>{w.id}</div>
                      <div className="muted" style={{ fontSize: 12 }}>{w.district} · {w.categoryLabel} · {w.vendor}</div>
                    </td>
                    <td><div className="chips">{w.signals.map((s) => <SignalChip key={s.code} s={s} />)}{!w.signals.length && <span className="muted">—</span>}</div></td>
                    <td className="right tnum">{rupees(w.sanctioned)}</td>
                    <td><Progress value={w.progress} tone={w.level === "high" ? "var(--high)" : "var(--forest)"} /><div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>{STATUS[w.status]}</div></td>
                    <td className="tnum" style={{ whiteSpace: "nowrap" }}>{date(w.deadline)}</td>
                    <td>{w.decision ? <span className={`mini-stamp ${w.decision.decision}`}>{DECISION_LABEL[w.decision.decision]}</span> : <span className="muted">Open</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.items.length && <div className="empty">No works match these filters in {data.scope.label}.</div>}
          </div>
          <div className="pager">
            <span className="muted">{int(data.total)} works · showing {data.items.length ? (page - 1) * size + 1 : 0}–{(page - 1) * size + data.items.length}</span>
            <button className="btn btn-ghost" disabled={page <= 1} onClick={() => set({ page: page - 1 })}><ChevronLeft /> Previous</button>
            <button className="btn btn-ghost" disabled={page * size >= data.total} onClick={() => set({ page: page + 1 })}>Next <ChevronRight /></button>
          </div>
        </div>
      )}
    </div>
  );
}
