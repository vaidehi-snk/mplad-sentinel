import { useRef, useState } from "react";
import {
  ArrowUpRight,
  UploadCloud,
  FileSpreadsheet,
  X,
  Download,
  LoaderCircle,
  Check,
  Info,
  Database,
  BookOpen,
} from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useWorkspace } from "./WorkspaceContext";
import { PageHeading, SectionHeading } from "./UI";
import { downloadFile } from "./model";

const fields = [
  ["unique_work_number", "Unique work reference"],
  ["work_name", "Full work description"],
  ["state", "State name"],
  ["constituency", "Constituency name"],
  ["sanction_amount", "Sanction amount in rupees"],
];
export default function Sources() {
  const { user } = useAuth();
  const { works, reload, notify } = useWorkspace();
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef(null);
  const allowed = user.roleId === "ministry";
  function choose(f) {
    setResult(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setResult({ error: "Choose a CSV file." });
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setResult({ error: "Choose a file smaller than 10 MB." });
      return;
    }
    setFile(f);
  }
  async function upload() {
    if (!file || !allowed) return;
    setBusy(true);
    setResult(null);
    const data = await api.ingestCsv(file);
    setBusy(false);
    setResult(data);
    if (data?.ok) {
      await reload();
      notify(`${data.inserted} records imported. Audit history retained.`);
      setFile(null);
    }
  }
  function template() {
    downloadFile(
      "sentinel-import-template.csv",
      "unique_work_number,work_name,state,constituency,district,sanction_amount,implementing_agency_name,date_of_administrative_approval,data_as_on\nDEMO-EXAMPLE-001,Example community water tank,Example State,Example Constituency,Example District,250000,Example Agency,01-04-2026,01-09-2026\n",
      "text/csv",
    );
  }
  return (
    <>
      <PageHeading
        eyebrow="TRANSPARENCY STARTS AT THE SOURCE"
        title="Know the data"
        description="What is available, what is missing, and how new records enter the workspace."
      />
      <div className="sources-grid">
        <section className="surface source-inventory">
          <SectionHeading
            kicker="CURRENT WORKSPACE"
            title="An honest inventory"
          >
            <Database size={21} />
          </SectionHeading>
          <div className="inventory-total">
            <strong>{works.length}</strong>
            <span>
              work records
              <br />
              available for review
            </span>
          </div>
          <p className="section-description">
            Bundled historical sample or user-supplied imports. Source
            provenance has not been independently verified.
          </p>
          <div className="source-evidence-rows">
            {[
              ["Work identifiers & descriptions", true],
              ["Sanction amounts", true],
              ["Approval dates", works.every((w) => w.dateApproved)],
              ["Vendor payment records", false],
              ["Verified completion", false],
              ["Quantities & specifications", false],
            ].map(([label, yes]) => (
              <div key={label}>
                <span>{label}</span>
                <b className={yes ? "available" : "muted"}>
                  {yes ? (
                    <>
                      <Check size={14} />
                      Included
                    </>
                  ) : (
                    "Not provided"
                  )}
                </b>
              </div>
            ))}
          </div>
          <div className="source-footnote">
            <Info size={15} />A blank field is unknown, not evidence of
            compliance or wrongdoing.
          </div>
        </section>
        <section className="surface import-surface">
          <SectionHeading
            kicker="ADD TO THE REGISTER"
            title="Import work records"
          />
          <p className="section-description">
            Matching work IDs are updated. Existing reviews and audit events are
            retained.
          </p>
          <button
            className={`drop-zone ${dragging ? "dragging" : ""}`}
            disabled={!allowed || busy}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              if (allowed) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (allowed) choose(e.dataTransfer.files[0]);
            }}
          >
            <UploadCloud size={30} strokeWidth={1.3} />
            <strong>{file ? file.name : "Drop a CSV file here"}</strong>
            <span>
              {file
                ? `${(file.size / 1024).toFixed(1)} KB · ready to import`
                : "or browse from your computer"}
            </span>
            <small>CSV only · up to 10 MB / 10,000 rows</small>
          </button>
          <input
            ref={input}
            type="file"
            accept=".csv"
            className="sr-only"
            tabIndex={-1}
            aria-label="Choose CSV file"
            onChange={(e) => choose(e.target.files[0])}
          />
          {file && (
            <button
              className="quiet-button remove-file"
              onClick={() => {
                setFile(null);
                if (input.current) input.current.value = "";
              }}
              disabled={busy}
            >
              <X size={13} />
              Remove file
            </button>
          )}
          <div className="import-actions">
            <button className="quiet-button" onClick={template}>
              <Download size={14} />
              Get CSV template
            </button>
            <button
              className="button primary"
              disabled={!file || busy || !allowed}
              onClick={upload}
            >
              {busy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <FileSpreadsheet size={16} />
              )}
              Import & screen
            </button>
          </div>
          {!allowed && (
            <p className="field-help">
              Importing is available to the Ministry demo role. Sign out to
              switch roles.
            </p>
          )}
          {result && (
            <div
              className={result.ok ? "import-success" : "form-error"}
              role="status"
            >
              {result.ok
                ? `${result.inserted} records imported. The register is updated.`
                : result.error || "Import failed. Please retry."}
            </div>
          )}
        </section>
      </div>
      <section className="surface schema-surface">
        <SectionHeading
          kicker="THE IMPORT CONTRACT"
          title="A small, explicit schema"
        />
        <div className="schema-grid">
          <div>
            <h3>Required columns</h3>
            {fields.map(([key, description]) => (
              <div className="schema-field" key={key}>
                <code>{key}</code>
                <span>{description}</span>
              </div>
            ))}
          </div>
          <div className="schema-notes">
            <h3>Before you import</h3>
            <p>
              Amounts must be in rupees. Use DD-MM-YYYY for dates. Each row
              needs a unique, non-empty work reference and a positive sanction
              amount.
            </p>
            <p>
              Optional columns: <code>district</code>,{" "}
              <code>nodal_district_per_source</code>, <code>mp_name</code>,{" "}
              <code>implementing_agency_name</code>,{" "}
              <code>date_of_administrative_approval</code>,{" "}
              <code>data_as_on</code>.
            </p>
            <p>
              Malformed rows or repeated work IDs within a file reject the
              batch. The downloadable template contains one clearly fictional
              example.
            </p>
          </div>
        </div>
      </section>
      <div className="methodology-grid">
        <section>
          <span className="eyebrow">THE METHOD, IN PLAIN WORDS</span>
          <h2>Signals need context.</h2>
          <div className="methodology-row">
            <span>01</span>
            <div>
              <h3>Rules with boundaries</h3>
              <p>
                Category sanction comparisons need five records. Matching
                descriptions and approval batches are observations for review.
              </p>
            </div>
          </div>
          <div className="methodology-row">
            <span>02</span>
            <div>
              <h3>Exploratory machine learning</h3>
              <p>
                A seeded Isolation Forest contributes with 30 or more records.
                It is withheld for smaller samples and is not a calibrated fraud
                classifier.
              </p>
            </div>
          </div>
          <div className="methodology-row">
            <span>03</span>
            <div>
              <h3>A human decision</h3>
              <p>
                Missing payment, quantity or completion evidence limits what can
                be concluded. Reviewers document their reasoning before
                escalation.
              </p>
            </div>
          </div>
        </section>
        <section className="reference-shelf">
          <BookOpen size={25} />
          <h2>The reference shelf</h2>
          <p>Primary sources behind the scheme context.</p>
          <a
            href="https://mplads.mospi.gov.in/digigov/dashboard.html"
            target="_blank"
            rel="noreferrer"
          >
            <span>
              eSAKSHI dashboard<small>MoSPI · official scheme workflow</small>
            </span>
            <ArrowUpRight size={16} />
          </a>
          <a
            href="https://transdev.assam.gov.in/documents-detail/mplads-guidelines-2023"
            target="_blank"
            rel="noreferrer"
          >
            <span>
              MPLADS Guidelines, 2023
              <small>Government-hosted baseline guidelines</small>
            </span>
            <ArrowUpRight size={16} />
          </a>
          <a
            href="https://cag.gov.in/en/audit-report/details/2341"
            target="_blank"
            rel="noreferrer"
          >
            <span>
              CAG performance audit
              <small>Historical reference, not training labels</small>
            </span>
            <ArrowUpRight size={16} />
          </a>
          <small className="reference-note">
            Subsequent amendments must be checked before applying a compliance
            rule.
          </small>
        </section>
      </div>
    </>
  );
}
