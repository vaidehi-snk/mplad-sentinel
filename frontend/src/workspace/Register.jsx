import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowDownWideNarrow,
  Download,
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useWorkspace } from "./WorkspaceContext";
import { PageHeading, WorkTable, EmptyState } from "./UI";
import { exportRegister, hasSignal } from "./model";

export default function Register() {
  const { works, latest, notify } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const view = params.get("view") || "all";
  const agency = params.get("agency") || "";
  const [priority, setPriority] = useState("all");
  const [sort, setSort] = useState("priority");
  const [page, setPage] = useState(1);
  const [capacity, setCapacity] = useState(10);
  const signals = works.filter(hasSignal).length;
  const update = (key, value) => {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      if (value) {
        p.set(key, value);
      } else {
        p.delete(key);
      }
      return p;
    });
    setPage(1);
  };
  const filtered = useMemo(
    () =>
      works
        .filter((w) => {
          const match = `${w.name} ${w.id} ${w.contractor} ${w.constituency}`
            .toLowerCase()
            .includes(query.toLowerCase());
          return (
            match &&
            (!agency || w.contractor === agency) &&
            (priority === "all" || w.level === priority) &&
            (view === "all" ||
              (view === "signals" && hasSignal(w)) ||
              (view === "reviewed" && latest[w.id]) ||
              (view === "unreviewed" && !latest[w.id]))
          );
        })
        .sort((a, b) =>
          sort === "sanction"
            ? b.sanctioned - a.sanctioned
            : sort === "name"
              ? a.name.localeCompare(b.name)
              : b.score - a.score || a.id.localeCompare(b.id),
        ),
    [works, latest, query, agency, priority, view, sort],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / capacity));
  const activePage = Math.min(page, pages);
  const rows = filtered.slice(
    (activePage - 1) * capacity,
    activePage * capacity,
  );
  function clear() {
    setParams({});
    setPriority("all");
    setPage(1);
  }
  return (
    <>
      <PageHeading
        eyebrow="REVIEW, WITH CONTEXT"
        title="The work register"
        description="Find a work. Follow the evidence. Leave a clear record."
      >
        <button
          className="button secondary"
          disabled={!filtered.length}
          onClick={() => {
            exportRegister(filtered);
            notify("Filtered register downloaded.");
          }}
        >
          <Download size={15} />
          Export results
        </button>
      </PageHeading>
      <div className="register-tabs" aria-label="Work filters">
        {[
          ["all", "All works", works.length],
          ["signals", "With signals", signals],
          [
            "unreviewed",
            "Not reviewed",
            works.length - Object.keys(latest).length,
          ],
          ["reviewed", "Reviewed", Object.keys(latest).length],
        ].map(([id, label, count]) => (
          <button
            key={id}
            className={view === id ? "active" : ""}
            onClick={() => update("view", id === "all" ? "" : id)}
            aria-pressed={view === id}
          >
            {label}
            <span>{count}</span>
          </button>
        ))}
      </div>
      <section className="surface full-register">
        <div className="register-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              aria-label="Search register"
              value={query}
              onChange={(e) => update("q", e.target.value)}
              placeholder="Search work, reference or agency…"
            />
            {query && (
              <button
                className="icon-button"
                aria-label="Clear search"
                onClick={() => update("q", "")}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <label className="filter-select">
            <SlidersHorizontal size={15} />
            <span className="sr-only">Priority filter</span>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All priorities</option>
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
          </label>
          <label className="filter-select">
            <ArrowDownWideNarrow size={15} />
            <span className="sr-only">Sort register</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="priority">Priority first</option>
              <option value="sanction">Sanction: highest</option>
              <option value="name">Work name: A–Z</option>
            </select>
          </label>
        </div>
        {agency && (
          <div className="active-filters">
            <span>
              Agency: {agency}
              <button
                onClick={() => update("agency", "")}
                aria-label="Remove agency filter"
              >
                <X size={13} />
              </button>
            </span>
          </div>
        )}
        {rows.length ? (
          <WorkTable works={rows} latest={latest} />
        ) : (
          <EmptyState
            action={
              <button className="button secondary" onClick={clear}>
                Clear filters
              </button>
            }
          >
            No records match these filters. Try a different name or priority.
          </EmptyState>
        )}
        <div className="pagination">
          <span>
            {filtered.length
              ? `${(activePage - 1) * capacity + 1}–${Math.min(activePage * capacity, filtered.length)}`
              : "0"}{" "}
            of {filtered.length} works
          </span>
          <label>
            Show
            <select
              aria-label="Works per page"
              value={capacity}
              onChange={(e) => {
                setCapacity(+e.target.value);
                setPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
            </select>
          </label>
          <div>
            <button
              className="icon-button"
              aria-label="Previous page"
              disabled={activePage === 1}
              onClick={() => setPage(activePage - 1)}
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              {activePage} / {pages}
            </span>
            <button
              className="icon-button"
              aria-label="Next page"
              disabled={activePage === pages}
              onClick={() => setPage(activePage + 1)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>
      <div className="register-guidance">
        <span className="guidance-number">i</span>
        <p>
          <strong>Screening is the start of a review.</strong> A repeated
          approval date or an unusual sanction may have a legitimate
          explanation. Open the dossier before deciding what to do next.
        </p>
      </div>
    </>
  );
}
