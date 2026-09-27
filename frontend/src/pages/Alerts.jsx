import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { RiskAlertCard, DetailPanel } from "../components/RiskAlert";
import { useRole } from "../context/RoleContext";

const FILTERS = ["all", "high", "medium", "low"];

export default function Alerts() {
  const { scopedWorks, source } = useRole();
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState(10);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    return scopedWorks.filter((w) => {
      const matchesQuery = (w.name + w.contractor + w.id).toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === "all" || w.level === filter;
      return matchesQuery && matchesFilter;
    }).sort((a,b) => b.score-a.score || a.id.localeCompare(b.id));
  }, [scopedWorks, query, filter]);

  return (
    <div>
      <section className="review-intro">
        <div><div className="review-eyebrow">DISTRICT REVIEW DESK</div>
        <h1>Which works need a closer look?</h1>
        <p>Review available signals, request missing evidence, and record a reasoned decision.</p></div>
        <div className="review-budget"><label htmlFor="review-budget">Review capacity</label>
        <select id="review-budget" value={budget} onChange={e => setBudget(Number(e.target.value))}>
          <option value={5}>5 works</option><option value={10}>10 works</option><option value={25}>25 works</option><option value={100000}>All works</option>
        </select></div>
      </section>
      <div className="review-summary"><strong>{Math.min(budget, filtered.length)} works in this queue</strong><span>{filtered.length} match your filters</span><span>Priority score is not fraud probability</span></div>
      {source !== 'api' && <p role="alert" className="case-advisory">Connecting to the API. If no records appear, check the backend and sign in again.</p>}
      <div className="alerts-toolbar">
        <div className="search-box">
          <Search size={14} color="#6B7386" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search work, implementing agency or ID"
          />
        </div>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={"filter-btn" + (filter === f ? " active" : "")}
          >
            {f}
          </button>
        ))}
      </div>

      {filtered.slice(0, budget).map((w) => (
        <div key={w.id} className="alert-card-wrap">
          <RiskAlertCard w={w} onOpen={setSelected} />
        </div>
      ))}
      {filtered.length === 0 && <div className="empty-state">No works match this filter.</div>}

      {selected && <DetailPanel w={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
