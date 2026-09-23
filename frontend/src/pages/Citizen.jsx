import React, { useEffect, useState } from "react";
import { QrCode, CheckCircle2, AlertTriangle } from "lucide-react";
import { useRole } from "../context/RoleContext";
import { api } from "../api/client";

export default function Citizen() {
  const { allWorks } = useRole();
  const [reports, setReports] = useState([]);
  const [live, setLive] = useState(false);
  const [workId, setWorkId] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("confirmed");
  const [submitting, setSubmitting] = useState(false);

  const refresh = () => {
    api.getCitizenReports().then((data) => {
      if (data) {
        setReports(data);
        setLive(true);
      }
    });
  };

  useEffect(refresh, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!workId || !note) return;
    setSubmitting(true);
    const res = await api.submitCitizenReport({ work: workId, note, status });
    setSubmitting(false);
    if (res && res.ok) {
      setNote("");
      refresh();
    }
  };

  return (
    <div>
      <div className="citizen-layout">
        <div className="panel qr-panel">
          <QrCode size={90} color="#E8EAF0" />
          <div className="qr-caption">QR illustration only. Report observations below; independent verification is required.</div>
        </div>
        <div className="citizen-list">
          <div className="panel-label">
            Recent citizen reports {live ? "\u2014 live from API" : "\u2014 static snapshot"}
          </div>
          {reports.map((r, i) => (
            <div key={r.id || i} className="panel citizen-row">
              <div>
                <div className="citizen-note">{r.note}</div>
                <div className="citizen-work">{r.work}</div>
              </div>
              {r.status === "confirmed" ? (
                <span className="status-pill success-text">
                  <CheckCircle2 size={13} /> confirmed
                </span>
              ) : (
                <span className="status-pill danger-text">
                  <AlertTriangle size={13} /> disputed
                </span>
              )}
            </div>
          ))}
          {reports.length === 0 && <div className="empty-state">No reports yet.</div>}
        </div>
      </div>

      <form onSubmit={submit} className="panel citizen-form">
        <div className="panel-label">Simulate a citizen report (what the QR scan would submit)</div>
        <div className="citizen-form-row">
          <select value={workId} onChange={(e) => setWorkId(e.target.value)} className="citizen-select">
            <option value="">Select a work...</option>
            {allWorks.map((w) => (
              <option key={w.id} value={w.id}>
                {w.id} &mdash; {w.name}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="citizen-select">
            <option value="confirmed">Confirmed</option>
            <option value="disputed">Disputed</option>
          </select>
        </div>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What did you observe at the site?"
          className="citizen-input"
        />
        <button type="submit" className="gold-btn" disabled={submitting || !workId || !note}>
          {submitting ? "Submitting..." : "Submit report"}
        </button>
      </form>
    </div>
  );
}
