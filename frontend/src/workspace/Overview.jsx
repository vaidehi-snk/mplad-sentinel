import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Download,
  Files,
  ScanLine,
  CalendarDays,
  Check,
  CircleHelp,
  Database,
  ChevronDown,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useWorkspace } from "./WorkspaceContext";
import {
  PageHeading,
  SectionHeading,
  WorkTable,
  TextLink,
  EmptyState,
} from "./UI";
import {
  compactMoney,
  dateLabel,
  exportRegister,
  hasSignal,
  shortId,
  workUrl,
} from "./model";

function monthlyData(works) {
  const months = new Map();
  for (const w of works) {
    const m = w.dateApproved?.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) continue;
    const key = `${m[3]}-${m[2]}`;
    const item = months.get(key) || {
      key,
      amount: 0,
      count: 0,
      label: new Date(+m[3], +m[2] - 1).toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      }),
    };
    item.amount += w.sanctioned;
    item.count++;
    months.set(key, item);
  }
  return [...months.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export default function Overview() {
  const { works, latest, reviews, notify } = useWorkspace();
  const [chartMode, setChartMode] = useState("amount");
  const [showData, setShowData] = useState(false);
  const ranked = useMemo(
    () => [...works].sort((a, b) => b.score - a.score),
    [works],
  );
  const signalWorks = works.filter(hasSignal);
  const reviewed = Object.keys(latest).length;
  const next = ranked.find((w) => !latest[w.id]) || ranked[0];
  const amount = works.reduce((s, w) => s + w.sanctioned, 0);
  const monthly = useMemo(() => monthlyData(works), [works]);
  const dates = [...new Set(works.map((w) => w.lastUpdated).filter(Boolean))];
  const agencies = [...new Set(works.map((w) => w.contractor).filter(Boolean))];
  function download() {
    exportRegister(works);
    notify("Work register downloaded.");
  }
  return (
    <>
      <PageHeading
        eyebrow="THE OVERSIGHT BRIEF"
        title="Public works. A clearer picture."
        description="A considered starting point for your next review."
      >
        <button
          className="button secondary"
          onClick={download}
          disabled={!works.length}
        >
          <Download size={15} />
          Export register
        </button>
        <Link className="button primary" to="/app/works">
          Open work register
          <ArrowUpRight size={16} />
        </Link>
      </PageHeading>
      <div className="snapshot-line">
        <span className="snapshot-mark">
          <Database size={13} />
          {works.length} available records
        </span>
        <span className="snapshot-separator">/</span>
        <span>
          <CalendarDays size={13} />
          {dates.length === 1
            ? `Snapshot: ${dateLabel(dates[0])}`
            : "Multiple source snapshots"}
        </span>
        <span className="snapshot-caveat">
          Historical sample · not a live national total
        </span>
      </div>
      <section className="metrics-band" aria-label="Workspace summary">
        <div className="metric">
          <span>
            Works in scope
            <Files size={16} />
          </span>
          <strong>{works.length.toString().padStart(2, "0")}</strong>
          <small>Across {agencies.length} implementing agencies</small>
        </div>
        <div className="metric">
          <span>
            Total sanctioned
            <ArrowUpRight size={16} />
          </span>
          <strong>{compactMoney(amount)}</strong>
          <small>Approval value, not expenditure</small>
        </div>
        <div className="metric">
          <span>
            Works with signals
            <ScanLine size={16} />
          </span>
          <strong>
            {signalWorks.length.toString().padStart(2, "0")}
            <b className="metric-accent">For a closer look</b>
          </strong>
          <small>Observations requiring context</small>
        </div>
        <div className="metric">
          <span>
            Works reviewed
            <Check size={16} />
          </span>
          <strong>
            {reviewed.toString().padStart(2, "0")}
            <b className="metric-fraction">/ {works.length}</b>
          </strong>
          <small>
            {reviews.length} decision{reviews.length === 1 ? "" : "s"} in the
            audit trail
          </small>
        </div>
      </section>
      <div className="overview-middle">
        <section className="surface chart-surface">
          <SectionHeading
            kicker="THE FINANCIAL CONTEXT"
            title="Sanctions over time"
          >
            <div className="segmented-control" aria-label="Chart measure">
              <button
                className={chartMode === "amount" ? "selected" : ""}
                onClick={() => setChartMode("amount")}
                aria-pressed={chartMode === "amount"}
              >
                Amount
              </button>
              <button
                className={chartMode === "count" ? "selected" : ""}
                onClick={() => setChartMode("count")}
                aria-pressed={chartMode === "count"}
              >
                Works
              </button>
            </div>
          </SectionHeading>
          <p className="section-description">
            Administrative approvals in the available records.
          </p>
          <div className="sanction-chart">
            {monthly.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthly}
                  margin={{ top: 20, right: 4, left: -13, bottom: 0 }}
                  barCategoryGap="30%"
                  accessibilityLayer
                >
                  <CartesianGrid
                    vertical={false}
                    stroke="#eaece6"
                    strokeDasharray="3 4"
                  />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6f776f", fontSize: 11 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6f776f", fontSize: 10 }}
                    tickFormatter={(v) =>
                      chartMode === "amount" ? `${v / 100000}L` : v
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "#f2f4ee" }}
                    contentStyle={{
                      border: "1px solid #dfe4d9",
                      borderRadius: 8,
                      fontSize: 12,
                      fontFamily: "Inter Variable",
                      boxShadow: "0 8px 25px #12332115",
                    }}
                    formatter={(v) => [
                      chartMode === "amount" ? compactMoney(v) : v,
                      chartMode === "amount" ? "Sanctioned" : "Works",
                    ]}
                  />
                  <Bar
                    dataKey={chartMode}
                    fill="#406953"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={56}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No dated approvals">
                Import records with valid approval dates to see this chart.
              </EmptyState>
            )}
          </div>
          <div className="chart-foot">
            <span>
              <i />
              Recorded sanctions · INR
            </span>
            <button
              className="quiet-button"
              onClick={() => setShowData(!showData)}
              aria-expanded={showData}
            >
              {showData ? "Hide" : "View"} data
              <ChevronDown size={13} />
            </button>
          </div>
          {showData && (
            <table className="simple-table">
              <caption className="sr-only">Monthly sanction totals</caption>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Sanctioned</th>
                  <th>Works</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m) => (
                  <tr key={m.key}>
                    <td>{m.label}</td>
                    <td>{compactMoney(m.amount)}</td>
                    <td>{m.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <aside className="next-review">
          <div className="next-review-top">
            <span className="eyebrow">A PLACE TO START</span>
            <ArrowUpRight size={20} />
          </div>
          <h2>
            Your next
            <br />
            <em>closer look.</em>
          </h2>
          {next ? (
            <>
              <div className="next-review-reference">
                <span>{shortId(next.id)}</span>
                <span>{next.score}/100 priority</span>
              </div>
              <Link className="next-review-name" to={workUrl(next.id)}>
                {next.name}
              </Link>
              <p>
                {hasSignal(next)
                  ? "Check the recorded pattern against the original sanction and supporting evidence."
                  : "No rule triggered. Review the evidence gaps before drawing conclusions."}
              </p>
              <Link className="button light" to={workUrl(next.id)}>
                Open work dossier
                <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <p>Import work records to begin reviewing.</p>
          )}
          <div className="next-review-note">
            <CircleHelp size={13} />A priority score is not a fraud probability.
          </div>
        </aside>
      </div>
      <section className="surface register-preview">
        <SectionHeading
          kicker="FROM SIGNAL TO REVIEW"
          title="Works worth a closer look"
        >
          <TextLink to="/app/works">View all works</TextLink>
        </SectionHeading>
        {works.length ? (
          <WorkTable works={ranked.slice(0, 4)} latest={latest} compact />
        ) : (
          <EmptyState>
            No work records are available for this jurisdiction.
          </EmptyState>
        )}
        <div className="table-note">
          <span className="note-line" />
          Ordered by review priority. Every observation needs a human
          assessment.
        </div>
      </section>
      <div className="overview-bottom">
        <section className="evidence-coverage">
          <span className="eyebrow">KNOW THE LIMITS</span>
          <h2>
            Good decisions start
            <br />
            with sufficient evidence.
          </h2>
          <p>
            The available sample contains sanction records. Payment and
            completion checks need additional information.
          </p>
          <TextLink to="/app/sources">Understand the data</TextLink>
        </section>
        <section className="coverage-list" aria-label="Available evidence">
          <div>
            <span className="coverage-icon available">
              <Check size={15} />
            </span>
            <span>
              <strong>Sanction records</strong>
              <small>Work IDs, amounts and approval dates</small>
            </span>
            <b>Available</b>
          </div>
          <div>
            <span className="coverage-icon">
              <span>—</span>
            </span>
            <span>
              <strong>Vendor payments</strong>
              <small>Needed to assess expenditure</small>
            </span>
            <b className="muted">Not provided</b>
          </div>
          <div>
            <span className="coverage-icon">
              <span>—</span>
            </span>
            <span>
              <strong>Verified completion</strong>
              <small>Needed to distinguish delay from reporting gaps</small>
            </span>
            <b className="muted">Not provided</b>
          </div>
        </section>
      </div>
    </>
  );
}
