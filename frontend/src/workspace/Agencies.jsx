import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  ArrowUpRight,
  ChevronDown,
  Info,
  Search,
} from "lucide-react";
import { useWorkspace } from "./WorkspaceContext";
import { PageHeading, EmptyState, Priority } from "./UI";
import { compactMoney, hasSignal, shortId, workUrl } from "./model";

export default function Agencies() {
  const { works } = useWorkspace();
  const [query, setQuery] = useState("");
  const agencies = useMemo(() => {
    const groups = new Map();
    works.forEach((work) => {
      const key = work.contractor || "Agency not recorded";
      if (!groups.has(key))
        groups.set(key, { name: key, works: [], amount: 0, signals: 0 });
      const group = groups.get(key);
      group.works.push(work);
      group.amount += work.sanctioned;
      if (hasSignal(work)) group.signals++;
    });
    return [...groups.values()].sort((a, b) => b.amount - a.amount);
  }, [works]);
  const total = works.reduce((s, w) => s + w.sanctioned, 0);
  const filtered = agencies.filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="FOLLOW THE ASSIGNMENTS"
        title="The agency lens"
        description="Understand how the available works are distributed across implementing agencies."
      />
      <div className="agency-intro">
        <div>
          <strong>{agencies.length.toString().padStart(2, "0")}</strong>
          <span>
            implementing
            <br />
            agencies
          </span>
        </div>
        <div>
          <strong>{works.length.toString().padStart(2, "0")}</strong>
          <span>
            works in
            <br />
            this workspace
          </span>
        </div>
        <p>
          <Info size={17} />
          Agency concentration is context for review. Repeated assignments do
          not establish contractor collusion.
        </p>
      </div>
      <div className="agency-toolbar">
        <h2>Assignments, in perspective</h2>
        <div className="search-input">
          <Search size={16} />
          <input
            aria-label="Search agencies"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find an agency…"
          />
        </div>
      </div>
      <div className="agency-list">
        {filtered.map((agency, index) => (
          <details key={agency.name} className="agency-detail">
            <summary>
              <span className="agency-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="agency-icon">
                <Building2 size={21} />
              </span>
              <span className="agency-title">
                <strong>{agency.name}</strong>
                <small>
                  {agency.works.length} work
                  {agency.works.length === 1 ? "" : "s"} · {agency.signals} with
                  screening signals
                </small>
              </span>
              <span className="agency-value">
                <strong>{compactMoney(agency.amount)}</strong>
                <span>
                  {total ? Math.round((agency.amount / total) * 100) : 0}% of
                  available sanctions
                </span>
                <i>
                  <b
                    style={{
                      width: `${total ? (agency.amount / total) * 100 : 0}%`,
                    }}
                  />
                </i>
              </span>
              <ChevronDown size={17} />
            </summary>
            <div className="agency-expanded">
              <div className="agency-expanded-header">
                <span className="tiny-label">ASSIGNED WORKS</span>
                <Link
                  className="text-link"
                  to={`/app/works?agency=${encodeURIComponent(agency.name)}`}
                >
                  Open in register
                  <ArrowUpRight size={14} />
                </Link>
              </div>
              {agency.works.map((w) => (
                <Link className="agency-work" to={workUrl(w.id)} key={w.id}>
                  <span>
                    <small>{shortId(w.id)}</small>
                    {w.name}
                  </span>
                  <Priority score={w.score} level={w.level} />
                  <ArrowUpRight size={16} />
                </Link>
              ))}
            </div>
          </details>
        ))}
        {!filtered.length && (
          <EmptyState title="No agencies match">
            Try another name or clear your search.
          </EmptyState>
        )}
      </div>
      <div className="register-guidance">
        <Info size={18} />
        <p>
          <strong>What this view can tell you.</strong> It shows recorded
          implementing-agency assignments and sanction totals. Vendor
          identities, tender participation and bank-account relationships are
          not available in this dataset.
        </p>
      </div>
    </>
  );
}
