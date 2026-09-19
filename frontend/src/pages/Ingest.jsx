import React, { useState, useRef } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle } from "lucide-react";
import { api } from "../api/client";
import { useRole } from "../context/RoleContext";

export default function Ingest() {
  const { refreshData } = useRole();
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
        <div className="serif-font ingest-title">Load a real MPLADS export</div>
        <div className="ingest-copy">
          Upload the CSV downloaded from data.gov.in / dataful.in (same column schema:
          state, constituency, mp_name, sanction_amount, implementing_agency_name,
          work_name, unique_work_number, work_status, date_of_administrative_approval).
          This replaces the current dataset and re-scores every row live &mdash; cost
          anomalies, same-day batch approvals, possible duplicate works, and long-pending
          flags are all recomputed on upload.
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="ingest-file-input"
        />
        <button className="gold-btn" onClick={handleUpload} disabled={!file || uploading}>
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
