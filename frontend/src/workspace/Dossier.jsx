import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowLeft,
  ArrowUpRight,
  Download,
  FileText,
  ClipboardCheck,
  Info,
  Check,
  X,
  Clock3,
  Plus,
  LoaderCircle,
  ArrowRight,
  CircleDashed,
  ShieldCheck,
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "./WorkspaceContext";
import {
  ErrorState,
  LoadingState,
  Priority,
  ReviewStatus,
  SectionHeading,
} from "./UI";
import {
  categoryLabels,
  compactMoney,
  dateLabel,
  decisionLabels,
  downloadFile,
  eventLabel,
  money,
  shortId,
  workUrl,
} from "./model";

const choices = [
  [
    "request_evidence",
    "Request evidence",
    "Identify the records needed before reaching a conclusion.",
  ],
  [
    "under_review",
    "Mark under review",
    "Record an assessment that is still in progress.",
  ],
  [
    "explained",
    "Record an explanation",
    "Document why the observed pattern has a legitimate explanation.",
  ],
  [
    "escalated",
    "Escalate for investigation",
    "State the specific concern and evidence for further investigation.",
  ],
];

export default function Dossier() {
  const { id } = useParams();
  const { user } = useAuth();
  const { works, reload, notify } = useWorkspace();
  const [work, setWork] = useState(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [decision, setDecision] = useState("request_evidence");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [formError, setFormError] = useState("");
  const load = useCallback(async () => {
    const data = await api.getWorkDetail(id);
    setWork(data);
    setFailed(!data);
  }, [id]);
  useEffect(() => {
    let active = true;
    setWork(null);
    setFailed(false);
    api.getWorkDetail(id).then((data) => {
      if (active) {
        setWork(data);
        setFailed(!data);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);
  if (failed)
    return (
      <ErrorState
        message="This work could not be loaded. It may be outside your jurisdiction, or the API is unavailable."
        onRetry={load}
      />
    );
  if (!work) return <LoadingState label="Opening the work dossier" />;
  const reasons = work.reasons.filter((r) => r.weight > 0);
  const last = work.reviews.at(-1);
  const peers = works.filter(
    (w) => w.category === work.category && w.state === work.state,
  );
  const amounts = peers.map((w) => w.sanctioned).sort((a, b) => a - b);
  const mid = Math.floor(amounts.length / 2);
  const median = amounts.length
    ? amounts.length % 2
      ? amounts[mid]
      : (amounts[mid - 1] + amounts[mid]) / 2
    : 0;
  const max = Math.max(work.sanctioned, median);
  async function exportEvidence() {
    setExporting(true);
    const packet = await api.getEvidence(id);
    setExporting(false);
    if (!packet) {
      notify("Export unavailable. Please try again.");
      return;
    }
    downloadFile(
      `sentinel-${id.replace(/[^a-z0-9-]/gi, "_")}.json`,
      JSON.stringify(packet, null, 2),
    );
    notify("Evidence dossier downloaded.");
  }
  async function save(e) {
    e.preventDefault();
    if (note.trim().length < 10) return;
    setBusy(true);
    setFormError("");
    const result = await api.saveReview(id, decision, note.trim());
    setBusy(false);
    if (!result?.ok) {
      setFormError(
        "The review was not saved. Check your connection and role, then retry.",
      );
      return;
    }
    setOpen(false);
    setNote("");
    await load();
    await reload();
    notify("Review saved to this work and the audit trail.");
  }
  return (
    <>
      <Link className="back-link" to="/app/works">
        <ArrowLeft size={15} />
        Back to work register
      </Link>
      <div className="dossier-heading">
        <div>
          <div className="eyebrow">
            WORK DOSSIER <span>/</span> {work.id}
          </div>
          <h1>{work.name}</h1>
          <div className="dossier-tags">
            <span>{categoryLabels[work.category] || "Other works"}</span>
            <span>{work.constituency}</span>
            <ReviewStatus decision={last?.decision} />
          </div>
        </div>
        <button
          className="button secondary"
          onClick={exportEvidence}
          disabled={exporting}
        >
          {exporting ? (
            <LoaderCircle size={16} className="spin" />
          ) : (
            <Download size={16} />
          )}
          Export dossier
        </button>
      </div>
      <div className="dossier-facts">
        <div>
          <span>Sanctioned amount</span>
          <strong>{money(work.sanctioned)}</strong>
        </div>
        <div>
          <span>Approval date</span>
          <strong>{dateLabel(work.dateApproved)}</strong>
        </div>
        <div>
          <span>Source snapshot</span>
          <strong>{dateLabel(work.lastUpdated)}</strong>
        </div>
        <div>
          <span>Review priority</span>
          <Priority score={work.score} level={work.level} />
        </div>
      </div>
      <div className="dossier-layout">
        <div className="dossier-main">
          <Tabs.Root defaultValue="evidence" className="dossier-tabs">
            <Tabs.List className="tab-list" aria-label="Dossier sections">
              <Tabs.Trigger value="evidence">
                Evidence & signals<span>{reasons.length}</span>
              </Tabs.Trigger>
              <Tabs.Trigger value="context">Work context</Tabs.Trigger>
              <Tabs.Trigger value="history">
                Review history<span>{work.reviews.length}</span>
              </Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="evidence" className="tab-content">
              <section className="surface dossier-section">
                <SectionHeading
                  kicker="WHAT THE RECORDS SHOW"
                  title="Screening observations"
                >
                  <span className="neutral-badge">
                    {reasons.length} signal{reasons.length === 1 ? "" : "s"}
                  </span>
                </SectionHeading>
                {reasons.length ? (
                  reasons.map((reason, i) => (
                    <article className="signal-observation" key={i}>
                      <span className="signal-index">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <span className="tiny-label">
                          {reason.label.includes("Isolation Forest")
                            ? "STATISTICAL OUTLIER"
                            : "RULE OBSERVATION"}
                        </span>
                        <h3>{reason.label}</h3>
                        <p>
                          {reason.label.includes("same date")
                            ? "A scheduled batch of approvals may be legitimate. Examine the approval process and individual sanction orders."
                            : reason.label.includes("description")
                              ? "Check whether the records refer to the same asset, a different phase, or a separate location."
                              : "Different quantities, specifications and site conditions can explain the difference. Compare the approved scope."}
                        </p>
                      </div>
                      <span className="signal-weight">
                        +{reason.weight}
                        <small>points</small>
                      </span>
                    </article>
                  ))
                ) : (
                  <div className="no-signals">
                    <Check size={21} />
                    <div>
                      <h3>No available rule triggered</h3>
                      <p>
                        This does not establish compliance. Several checks need
                        information that is not present.
                      </p>
                    </div>
                  </div>
                )}
                <div className="method-note">
                  <Info size={15} />
                  <span>
                    {work.assessmentType}. Scores are advisory, not
                    probabilities.
                  </span>
                </div>
              </section>
              <section className="surface dossier-section">
                <SectionHeading
                  kicker="CONTEXT, NOT A VERDICT"
                  title="Sanction comparison"
                />
                <p className="section-description">
                  {peers.length}{" "}
                  {categoryLabels[work.category]?.toLowerCase() ||
                    "similar-category"}{" "}
                  records in the available {work.state} cohort.
                </p>
                <div className="comparison-bar">
                  <div>
                    <span>This work</span>
                    <strong>{compactMoney(work.sanctioned)}</strong>
                  </div>
                  <div className="bar-track">
                    <span
                      style={{
                        width: `${max ? (work.sanctioned / max) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="comparison-bar peer">
                  <div>
                    <span>Category median</span>
                    <strong>{compactMoney(median)}</strong>
                  </div>
                  <div className="bar-track">
                    <span
                      style={{ width: `${max ? (median / max) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="context-note">
                  <Info size={15} />
                  <p>
                    {peers.length < 5
                      ? "Fewer than five peers. The cost comparison rule is withheld. "
                      : "This comparison uses total sanction amounts. "}
                    Quantities and specifications are unavailable, so this is
                    not a unit-cost benchmark.
                  </p>
                </div>
              </section>
              <section className="surface dossier-section">
                <SectionHeading
                  kicker="INFORMATION STILL NEEDED"
                  title="The evidence checklist"
                />
                <div className="document-checklist">
                  {[
                    [
                      "Sanction record",
                      "Work identifier, approval date and sanction value",
                      true,
                    ],
                    [
                      "Original sanction order",
                      "Approved scope, quantities and any variations",
                      false,
                    ],
                    [
                      "Vendor payment records",
                      "Dated payments and supporting invoices",
                      false,
                    ],
                    [
                      "Progress & completion",
                      "Dated progress, approved extensions and completion evidence",
                      false,
                    ],
                  ].map(([title, description, available]) => (
                    <div key={title}>
                      <span
                        className={`document-icon ${available ? "available" : ""}`}
                      >
                        {available ? (
                          <FileText size={18} />
                        ) : (
                          <CircleDashed size={18} />
                        )}
                      </span>
                      <div>
                        <strong>{title}</strong>
                        <p>{description}</p>
                      </div>
                      <span
                        className={`document-status ${available ? "available" : ""}`}
                      >
                        {available ? "Record available" : "Not provided"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </Tabs.Content>
            <Tabs.Content value="context" className="tab-content">
              <section className="surface dossier-section">
                <SectionHeading
                  kicker="SOURCE RECORD"
                  title="Who, where and when"
                />
                <dl className="record-details">
                  <div>
                    <dt>Work reference</dt>
                    <dd>{work.id}</dd>
                  </div>
                  <div>
                    <dt>Implementing agency</dt>
                    <dd>{work.contractor || "Not recorded"}</dd>
                  </div>
                  <div>
                    <dt>Member of Parliament</dt>
                    <dd>{work.mp}</dd>
                  </div>
                  <div>
                    <dt>Constituency</dt>
                    <dd>{work.constituency}</dd>
                  </div>
                  <div>
                    <dt>District</dt>
                    <dd>{work.district}</dd>
                  </div>
                  <div>
                    <dt>State</dt>
                    <dd>{work.state}</dd>
                  </div>
                  <div>
                    <dt>Expenditure</dt>
                    <dd>Not available in this dataset</dd>
                  </div>
                  <div>
                    <dt>Completion status</dt>
                    <dd>Not independently verified</dd>
                  </div>
                </dl>
                <p className="context-note">
                  An implementing agency is not necessarily a contractor. The
                  record does not establish vendor identity.
                </p>
              </section>
              <section className="surface dossier-section">
                <SectionHeading title="Other works in this category" />
                <div className="related-works">
                  {peers
                    .filter((w) => w.id !== id)
                    .slice(0, 5)
                    .map((w) => (
                      <Link to={workUrl(w.id)} key={w.id}>
                        <span>
                          <small>{shortId(w.id)}</small>
                          {w.name}
                        </span>
                        <ArrowUpRight size={16} />
                      </Link>
                    ))}
                  {peers.length <= 1 && (
                    <p>No other category records in your jurisdiction.</p>
                  )}
                </div>
              </section>
            </Tabs.Content>
            <Tabs.Content value="history" className="tab-content">
              <section className="surface dossier-section">
                <SectionHeading
                  kicker="DOCUMENTED DECISIONS"
                  title="Review history"
                />
                {work.reviews.length ? (
                  <div className="review-timeline">
                    {[...work.reviews].reverse().map((r) => (
                      <article key={r.id}>
                        <span className="timeline-node">
                          <ClipboardCheck size={16} />
                        </span>
                        <div>
                          <div className="review-timeline-heading">
                            <strong>{decisionLabels[r.decision]}</strong>
                            <time>{dateLabel(r.createdAt)}</time>
                          </div>
                          <p>{r.note}</p>
                          <span className="review-author">
                            Recorded by {r.actor}
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="no-signals">
                    <Clock3 size={22} />
                    <div>
                      <h3>The first review starts here</h3>
                      <p>
                        Record what you checked and what should happen next.
                      </p>
                    </div>
                  </div>
                )}
              </section>
              <section className="surface dossier-section">
                <SectionHeading title="Record activity" />
                <div className="record-events">
                  {[...work.ledger].reverse().map((event, i) => (
                    <div key={event.seq || i}>
                      <span className="event-dot" />
                      <div>
                        <strong>{eventLabel(event.action)}</strong>
                        <small>
                          {event.actor} · {dateLabel(event.createdAt)}
                        </small>
                      </div>
                      <code>{event.hash?.slice(0, 8)}</code>
                    </div>
                  ))}
                </div>
              </section>
            </Tabs.Content>
          </Tabs.Root>
        </div>
        <aside className="dossier-side">
          <section className="decision-card">
            <div className="decision-icon">
              <ClipboardCheck size={22} />
            </div>
            <span className="eyebrow">THE HUMAN CHECKPOINT</span>
            <h2>
              What should
              <br />
              happen next?
            </h2>
            <p>
              Review the source documents. Record the evidence behind your
              decision.
            </p>
            {user.roleId !== "mp" ? (
              <button
                className="button primary"
                id="record-review"
                onClick={() => setOpen(true)}
              >
                <Plus size={16} />
                Record a review
              </button>
            ) : (
              <p className="small-copy">
                Review decisions are recorded by district, state and ministry
                roles.
              </p>
            )}
            <div className="decision-last">
              <span>Latest decision</span>
              <ReviewStatus decision={last?.decision} />
              {last && (
                <small>
                  {last.actor} · {dateLabel(last.createdAt)}
                </small>
              )}
            </div>
          </section>
          <div className="dossier-integrity">
            <ShieldCheck size={19} />
            <div>
              <strong>A traceable decision</strong>
              <p>
                Reviews are linked in the local audit trail. Exported dossiers
                include a verifiable snapshot hash.
              </p>
              <Link to="/app/activity">
                View the audit trail
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
          <div className="dossier-disclaimer">
            An alert is a starting point for review. It is not proof of fraud,
            misuse or non-compliance.
          </div>
        </aside>
      </div>
      <Dialog.Root
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="modal-overlay" />
          <Dialog.Content
            className="standard-dialog review-dialog"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              document.getElementById("record-review")?.focus();
            }}
          >
            <Dialog.Close
              className="dialog-close icon-button"
              aria-label="Close review"
              disabled={busy}
            >
              <X size={18} />
            </Dialog.Close>
            <span className="eyebrow">WORK {shortId(id)}</span>
            <Dialog.Title>Record your assessment</Dialog.Title>
            <Dialog.Description>
              A clear note makes the next review easier. State what you know,
              what is missing and the next action.
            </Dialog.Description>
            <form onSubmit={save}>
              <label className="field-label" htmlFor="decision">
                Decision
              </label>
              <select
                id="decision"
                className="text-input"
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
              >
                {choices.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <p className="field-help">
                {choices.find((c) => c[0] === decision)[2]}
              </p>
              <label className="field-label" htmlFor="review-note">
                Evidence & rationale
              </label>
              <textarea
                id="review-note"
                className="text-input"
                placeholder="I checked… The available evidence shows… Next, we need…"
                rows={5}
                maxLength={4000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="field-count">
                Minimum 10 characters <span>{note.length}/4000</span>
              </div>
              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}
              <div className="dialog-actions">
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="button primary"
                  disabled={busy || note.trim().length < 10}
                >
                  {busy ? (
                    <LoaderCircle size={16} className="spin" />
                  ) : (
                    <Check size={16} />
                  )}
                  Save review
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
