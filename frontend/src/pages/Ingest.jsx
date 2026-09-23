import React, { useState, useRef } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "../api/client";
import { useRole } from "../context/RoleContext";

export default function Ingest() {
  const { refreshData, role } = useRole();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    const res = await api.ingestCsv(file);
    setUploading(false);
    setResult(res);
    if (res && res.ok) refreshData();
  };

  return (
    <div>
      <div className="panel ingest-panel">
        <UploadCloud size={36} color="#C9A227" />
        <div className="serif-font ingest-title">Import work records</div>
        <div className="ingest-copy">
          Upload the CSV downloaded from data.gov.in / dataful.in (same column schema:
          state, constituency, mp_name, sanction_amount, implementing_agency_name,
          work_name, unique_work_number, work_status, date_of_administrative_approval).
          Imports update matching work IDs and retain the audit trail. Sanction amounts
          are not treated as expenditure. Maximum 10 MB / 10,000 rows. Ministry demo role required.
          Uploaded records are user supplied; their provenance is not independently verified.
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="ingest-file-input"
        />
        <button className="gold-btn" onClick={handleUpload} disabled={!file || uploading || role !== "ministry"}>
          {uploading ? "Scoring records..." : "Upload & score"}
        </button>
      </div>

      {result && result.ok && (
        <div className="verify-banner">
          <CheckCircle2 size={13} style={{ marginRight: 6 }} />
          Ingested {result.inserted} works &mdash; {result.highRisk} flagged high-risk. Dashboards updated.
        </div>
      )}
      {result && !result.ok && (
        <div className="verify-banner verify-banner-bad">
          <AlertTriangle size={13} style={{ marginRight: 6 }} />
          {result.error || "Something went wrong during ingestion."}
        </div>
      )}
    </div>
  );
}
