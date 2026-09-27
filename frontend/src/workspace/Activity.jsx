import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Download,
  LoaderCircle,
  Check,
  AlertTriangle,
  FileInput,
  ClipboardCheck,
  ScanLine,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";
import { api } from "../api/client";
import { useWorkspace } from "./WorkspaceContext";
import { PageHeading, EmptyState } from "./UI";
import { dateLabel, downloadFile, eventLabel, shortId, workUrl } from "./model";

export default function Activity() {
  const { events, notify } = useWorkspace();
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(15);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const selected = [...events]
    .reverse()
    .filter(
      (e) =>
        filter === "all" ||
        (filter === "reviews" && e.action.startsWith("REVIEW:")) ||
        (filter === "imports" && e.action === "RECORD_IMPORTED"),
    );
  async function verify() {
    setChecking(true);
    setResult(null);
    const data = await api.verifyLedger();
    setResult(data || { unavailable: true });
    setChecking(false);
  }
  return (
    <>
      <PageHeading
        eyebrow="EVERY DECISION LEAVES A RECORD"
        title="The audit trail"
        description="A chronological record of imports, screening events and human review."
      >
        <button
          className="button secondary"
          disabled={!events.length}
          onClick={() => {
            downloadFile(
              "sentinel-audit-trail.json",
              JSON.stringify(events, null, 2),
            );
            notify("Visible audit events downloaded.");
          }}
        >
          <Download size={15} />
          Export trail
        </button>
      </PageHeading>
      <section
        className={`integrity-banner ${result?.verified ? "verified" : ""}`}
      >
        <span className="integrity-icon">
          <ShieldCheck size={25} />
        </span>
        <div>
          <span className="eyebrow">LOCAL CHAIN INTEGRITY</span>
          <h2>
            {checking
              ? "Checking the links…"
              : result?.verified
                ? "The recorded links are consistent."
                : result?.unavailable
                  ? "Verification is unavailable."
                  : result
                    ? "A chain mismatch was found."
                    : "A record you can examine."}
          </h2>
          <p>
            {result?.verified
              ? `${result.entriesChecked} events checked across the local chain. Source authenticity and external checkpoints are not verified.`
              : result?.unavailable
                ? "The API could not be reached. No verification result is available."
                : result
                  ? `Mismatch at event ${result.brokenAtSeq}: ${result.reason}.`
                  : "Recompute the event hashes to check consistency. This does not prove the original data is true."}
          </p>
        </div>
        <button className="button primary" disabled={checking} onClick={verify}>
          {checking ? (
            <LoaderCircle size={16} className="spin" />
          ) : result?.verified ? (
            <Check size={16} />
          ) : (
            <ShieldCheck size={16} />
          )}
          Verify chain
        </button>
      </section>
      <div className="audit-toolbar">
        <div className="register-tabs">
          {[
            ["all", "All events"],
            ["reviews", "Reviews"],
            ["imports", "Imports"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={filter === id ? "active" : ""}
              aria-pressed={filter === id}
              onClick={() => {
                setFilter(id);
                setLimit(15);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span>{selected.length} visible events</span>
      </div>
      <section className="surface audit-events">
        {selected.slice(0, limit).map((event) => {
          const Icon = event.action.startsWith("REVIEW:")
            ? ClipboardCheck
            : event.action === "RECORD_IMPORTED"
              ? FileInput
              : ScanLine;
          return (
            <article className="audit-event" key={event.seq}>
              <span
                className={`audit-event-icon ${event.action.startsWith("REVIEW:") ? "review-event" : ""}`}
              >
                <Icon size={18} />
              </span>
              <div className="audit-event-body">
                <div className="audit-event-title">
                  <h3>{eventLabel(event.action)}</h3>
                  <span>#{String(event.seq).padStart(4, "0")}</span>
                </div>
                <p>{event.actor}</p>
                <div className="audit-event-meta">
                  <Link to={workUrl(event.work)}>
                    {shortId(event.work)}
                    <ArrowUpRight size={12} />
                  </Link>
                  <span>
                    {dateLabel(event.createdAt)} ·{" "}
                    {new Date(event.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <details className="hash-details">
                  <summary>
                    Inspect event hashes
                    <ChevronDown size={12} />
                  </summary>
                  <dl>
                    <dt>Event hash</dt>
                    <dd>{event.hash}</dd>
                    <dt>Previous event</dt>
                    <dd>{event.prevHash}</dd>
                  </dl>
                </details>
              </div>
            </article>
          );
        })}
        {!selected.length && (
          <EmptyState title="No events in this view">
            Saved reviews and imports will appear here.
          </EmptyState>
        )}
        {selected.length > limit && (
          <div className="audit-load-more">
            <button
              className="button secondary"
              onClick={() => setLimit(limit + 15)}
            >
              Show more events
              <ChevronDown size={15} />
            </button>
          </div>
        )}
      </section>
      <div className="register-guidance">
        <AlertTriangle size={17} />
        <p>
          <strong>The scope of this check.</strong> Hash links can expose
          inconsistent edits. A complete administrator rewrite or removal of the
          chain's end requires an independent checkpoint to detect. The
          displayed events follow your jurisdiction; verification checks the
          full local chain.
        </p>
      </div>
    </>
  );
}
