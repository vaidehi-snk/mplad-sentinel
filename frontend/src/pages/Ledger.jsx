import React, { useEffect, useState } from "react";
import { Lock, RefreshCw } from "lucide-react";
import { api } from "../api/client";

export default function Ledger() {
  const [entries, setEntries] = useState([]);
  const [live, setLive] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.getLedger().then((data) => {
      if (Array.isArray(data)) {
        setEntries(data);
        setLive(true);
      }
    });
  }, []);

  const runVerify = async () => {
    setVerifying(true);
    setResult(null);
    const res = await api.verifyLedger();
    setVerifying(false);
    setResult(res || { verified: false, offline: true });
  };

  return (
    <div>
      <div className="panel ledger-toolbar">
        <div className="ledger-toolbar-label">
          <Lock size={16} color="#C9A227" />
          <span>
            Hash-linked review event history {live ? "\u2014 live from API" : "\u2014 API unavailable / loading"}
          </span>
        </div>
        <button onClick={runVerify} className="gold-btn">
          <RefreshCw size={13} className={verifying ? "spin" : ""} />
          {verifying ? "Recomputing hashes..." : "Verify chain integrity"}
        </button>
      </div>

      {result && (
        <div className={result.verified ? "verify-banner" : "verify-banner verify-banner-bad"}>
          {result.verified
            ? `Chain verified \u2014 all ${result.entriesChecked} entries match recomputed hashes${
                result.offline ? " (server offline, showing cached state)" : ""
              }. Local links are consistent; source authenticity and external checkpoints are not verified.`
            : result.offline ? "Verification unavailable: the API could not be reached." : `Chain mismatch at entry #${result.brokenAtSeq} (${result.reason}).`}
        </div>
      )}

      {entries.map((l, i) => (
        <div key={l.seq || l.id || i} className="panel mono-font ledger-row">
          <div className="ledger-row-top">
            <span className="gold-text">{l.action.startsWith('REVIEW:') ? `Review: ${l.action.split(':')[1].replaceAll('_', ' ')}` : l.action}</span>
            <span className="dim">{l.work}</span>
          </div>
          <div className="ledger-actor">by {l.actor}</div>
          <div className="ledger-hash">
            hash: {(l.hash || "").slice(0, 6)}...{(l.hash || "").slice(-4)}{" "}
            <span className="divider">|</span> prev: {(l.prevHash || l.prev || "").toString().slice(0, 6)}
            ...{(l.prevHash || l.prev || "").toString().slice(-4)}
          </div>
        </div>
      ))}
    </div>
  );
}
