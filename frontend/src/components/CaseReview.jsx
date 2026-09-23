import { useEffect, useState } from 'react';
import { Download, ClipboardCheck, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import { useRole } from '../context/RoleContext';

const decisions = {
  under_review: 'Under review', request_evidence: 'Request evidence',
  explained: 'Explained after review', escalated: 'Escalate for investigation',
};

export default function CaseReview({ work }) {
  const { role } = useRole();
  const [packet, setPacket] = useState(null);
  const [decision, setDecision] = useState('request_evidence');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let cancelled = false;
    setPacket(null);
    api.getEvidence(work.id).then(data => { if (!cancelled) setPacket(data); });
    return () => { cancelled = true; };
  }, [work.id]);

  async function save() {
    setBusy(true);
    setMessage('');
    const result = await api.saveReview(work.id, decision, note);
    if (result?.ok) {
      setPacket(await api.getEvidence(work.id));
      setNote('');
      setMessage('Decision saved with a hash-linked record.');
    } else setMessage('Could not save. Check your role and connection, then retry.');
    setBusy(false);
  }
  function download() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel-case-${work.id.replace(/[^a-z0-9-]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return <section className="case-review">
    <div className="case-review-heading"><ClipboardCheck size={18} /><h3>Evidence & decision</h3></div>
    <p className="case-advisory">This score prioritises review. It does not establish fraud or wrongdoing.</p>
    {packet && <p className="case-advisory">{packet.work.assessmentType}</p>}
    <div className="case-evidence-grid">
      <div><span>Sanction record</span><strong>Available</strong></div>
      <div><span>Vendor payments</span><strong>Not provided</strong></div>
      <div><span>Verified completion</span><strong>Not provided</strong></div>
      <div><span>Unit-cost benchmark</span><strong>Needs quantities</strong></div>
    </div>
    <p className="case-advisory"><AlertCircle size={14} /> Missing data stays unknown. The agency shown is not a verified contractor.</p>
    <button className="filter-btn" disabled={!packet} onClick={download}><Download size={14} /> Export evidence packet</button>
    {role !== 'mp' && <div className="case-form">
      <label htmlFor="case-decision">Review decision</label>
      <select id="case-decision" value={decision} onChange={e => setDecision(e.target.value)}>
        {Object.entries(decisions).map(([key, label]) => <option value={key} key={key}>{label}</option>)}
      </select>
      <label htmlFor="case-note">Evidence or reason for your decision</label>
      <textarea id="case-note" value={note} maxLength={4000} onChange={e => setNote(e.target.value)}
        placeholder="Record what you checked, what remains unknown, and the next action." rows={4} />
      <button className="gold-btn" disabled={busy || note.trim().length < 10} onClick={save}>{busy ? 'Saving…' : 'Save review decision'}</button>
    </div>}
    {message && <p role="status" className="case-advisory">{message}</p>}
    <div className="case-history">
      <h4>Review history</h4>
      {packet?.reviews?.length ? packet.reviews.map((review, index) => <article key={review.id || index}>
        <strong>{decisions[review.decision]}</strong><p>{review.note}</p>
        <small>{review.actor} · {new Date(review.createdAt).toLocaleString()}</small>
      </article>) : <p className="dim">No decisions recorded for this work.</p>}
    </div>
  </section>;
}
