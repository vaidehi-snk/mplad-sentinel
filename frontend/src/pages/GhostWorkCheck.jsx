import React, { useState } from "react";
import { Camera, MapPin, CheckCircle2, XCircle, Info, Link2 } from "lucide-react";
import { useRole } from "../context/RoleContext";

// This entire page is explicitly a concept demo. The real MPLADS export has
// no GPS coordinates or photos, and eSAKSHI (mplads.mospi.gov.in) -- which
// DOES require photo uploads for completed works -- is a login-gated
// stakeholder dashboard, not a public bulk data source. So there is no real
// dataset to run this against right now. Everything here is a mocked
// interaction demonstrating what the feature would do once photo/GPS data
// (from eSAKSHI, or field-collected) is actually available.

export default function GhostWorkCheck() {
  const { scopedWorks } = useRole();
  const [selectedId, setSelectedId] = useState(scopedWorks[0]?.id || "");
  const [verdict, setVerdict] = useState(null);

  const selected = scopedWorks.find((w) => w.id === selectedId) || scopedWorks[0];

  const runMockCheck = (result) => {
    setVerdict(result);
  };

  return (
    <div>
      <div className="panel concept-banner">
        <Info size={15} color="#C9A227" />
        <span>
          Concept demo &mdash; no real photo or GPS data exists in the available MPLADS dataset for this.
          eSAKSHI (the government's own portal) now requires photo uploads for completed works, but that
          data sits behind stakeholder logins, not a public export. This screen shows what the check would
          do once real geotagged photos are available.
        </span>
      </div>

      <div className="ghost-layout">
        <div className="panel ghost-select-panel">
          <div className="panel-label">Select a work to check</div>
          <select
            value={selected?.id || ""}
            onChange={(e) => { setSelectedId(e.target.value); setVerdict(null); }}
            className="citizen-select"
            style={{ width: "100%" }}
          >
            {scopedWorks.map((w) => (
              <option key={w.id} value={w.id}>{w.id} &mdash; {w.name}</option>
            ))}
          </select>

          <div className="ghost-photo-row">
            <div className="ghost-photo-slot">
              <Camera size={28} color="#4A5268" />
              <span>Sanction-time reference (mock)</span>
            </div>
            <div className="ghost-photo-slot">
              <Camera size={28} color="#4A5268" />
              <span>Latest field photo (mock)</span>
            </div>
          </div>

          <div className="ghost-meta">
            <MapPin size={12} /> GPS match: <span className="dim">not available in this dataset</span>
          </div>

          <div className="ghost-actions">
            <button className="gold-btn" onClick={() => runMockCheck("match")}>Simulate: photos match</button>
            <button className="gold-btn ghost-danger-btn" onClick={() => runMockCheck("mismatch")}>Simulate: no structure found</button>
          </div>

          {verdict === "match" && (
            <div className="verify-banner">
              <CheckCircle2 size={13} style={{ marginRight: 6 }} />
              Mock result: field photo consistent with sanctioned work. (Simulated &mdash; not a real image comparison.)
            </div>
          )}
          {verdict === "mismatch" && (
            <div className="verify-banner verify-banner-bad">
              <XCircle size={13} style={{ marginRight: 6 }} />
              Mock result: no matching structure detected at recorded location. (Simulated &mdash; not a real image comparison.)
            </div>
          )}
        </div>

        <div className="panel ghost-select-panel">
          <div className="panel-label">
            <Link2 size={12} style={{ marginRight: 4 }} />
            Cross-scheme duplicate-funding check (concept)
          </div>
          <div className="ghost-copy">
            Checks whether this same physical work also appears under a different central/state scheme
            (e.g. PMGSY road records) &mdash; a real fraud pattern, but one that needs a second scheme's
            dataset to check against. No such dataset is loaded here.
          </div>
          {selected && (
            <div className="ghost-mock-match">
              <div className="ghost-mock-match-row">
                <span className="dim">This work:</span> {selected.name}
              </div>
              <div className="ghost-mock-match-row">
                <span className="dim">Simulated candidate match:</span> "{selected.name.split(" ").slice(0, 4).join(" ")}..." in PMGSY district road records (mock entry, illustrative only)
              </div>
              <span className="data-badge data-badge-demo">No real cross-scheme dataset loaded</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
