import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { RiskAlertCard, DetailPanel } from "../components/RiskAlert";
import { useRole } from "../context/RoleContext";

const FILTERS = ["all", "high", "medium", "low"];

export default function Alerts() {
  const { scopedWorks } = useRole();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    return scopedWorks.filter((w) => {
      const matchesQuery = (w.name + w.contractor + w.id).toLowerCase().includes(query.toLowerCase());
      const matchesFilter = filter === "all" || w.level === filter;
      return matchesQuery && matchesFilter;
    });
  }, [scopedWorks, query, filter]);

  return (
    <div>
      <div className="alerts-toolbar">
        <div className="search-box">
          <Search size={14} color="#6B7386" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search work, contractor or ID"
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

      {filtered.map((w) => (
        <div key={w.id} className="alert-card-wrap">
          <RiskAlertCard w={w} onOpen={setSelected} />
        </div>
      ))}
      {filtered.length === 0 && <div className="empty-state">No works match this filter.</div>}

      {selected && <DetailPanel w={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
