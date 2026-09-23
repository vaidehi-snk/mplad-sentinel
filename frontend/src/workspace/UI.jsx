import {
  ArrowUpRight,
  ArrowRight,
  SearchX,
  LoaderCircle,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  categoryLabels,
  compactMoney,
  decisionLabels,
  shortId,
  workUrl,
} from "./model";

export function Brand({ small = false }) {
  return (
    <span className={`brand ${small ? "brand-small" : ""}`}>
      <svg className="brand-mark" viewBox="0 0 36 40" aria-hidden="true">
        <path d="M3 4h30v8H11v8H3zM33 20v16H3v-8h22v-8z" fill="currentColor" />
        <path d="M15 16h6v8h-6z" fill="currentColor" />
      </svg>
      <span>
        sentinel<span className="brand-caption">MPLADS OVERSIGHT</span>
      </span>
    </span>
  );
}

export function Priority({ score, level }) {
  return (
    <span className={`priority priority-${level}`}>
      <span className="priority-dot" />
      {level === "high" ? "High" : level === "medium" ? "Medium" : "Low"}
      <span className="priority-number">{score}</span>
    </span>
  );
}

export function ReviewStatus({ decision }) {
  return (
    <span className={`review-status status-${decision || "new"}`}>
      <span />
      {decisionLabels[decision] || "Not reviewed"}
    </span>
  );
}

export function PageHeading({ eyebrow, title, description, children }) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}

export function EmptyState({ title = "No works found", children, action }) {
  return (
    <div className="empty-state-new">
      <SearchX size={28} strokeWidth={1.3} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function LoadingState({ label = "Opening the workspace" }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={24} />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <AlertCircle size={22} />
      <div>
        <strong>Something needs attention</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button className="button secondary" onClick={onRetry}>
          <RotateCcw size={15} />
          Try again
        </button>
      )}
    </div>
  );
}

export function SectionHeading({ kicker, title, children }) {
  return (
    <div className="section-heading">
      <div>
        {kicker && <div className="eyebrow">{kicker}</div>}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function WorkTable({ works, latest = {}, compact = false }) {
  return (
    <div className="table-scroll" role="region" aria-label="Scrollable works table" tabIndex={0}>
      <table className={`work-table ${compact ? "compact-table" : ""}`}>
        <caption className="sr-only">
          MPLADS works with sanction amounts, review priority and review status
        </caption>
        <thead>
          <tr>
            <th scope="col">Work / reference</th>
            {!compact && <th scope="col">Category</th>}
            <th scope="col">Sanctioned</th>
            <th scope="col">Priority</th>
            <th scope="col">Review status</th>
            <th scope="col">
              <span className="sr-only">Open work</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {works.map((w) => (
            <tr key={w.id}>
              <td>
                <Link className="work-title" to={workUrl(w.id)}>
                  {w.name}
                </Link>
                <div className="work-reference">
                  <span>{shortId(w.id)}</span>
                  <i /> {w.constituency}
                </div>
              </td>
              {!compact && (
                <td className="category-cell">
                  {categoryLabels[w.category] || "Other works"}
                </td>
              )}
              <td className="numeric">{compactMoney(w.sanctioned)}</td>
              <td>
                <Priority score={w.score} level={w.level} />
              </td>
              <td>
                <ReviewStatus decision={latest[w.id]?.decision} />
              </td>
              <td>
                <Link
                  to={workUrl(w.id)}
                  className="row-open"
                  aria-label={`Open ${w.name}`}
                >
                  <ArrowUpRight size={17} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TextLink({ to, children }) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <ArrowRight size={15} />
    </Link>
  );
}
