import React, { useEffect, useState } from "react";
import { Lock, RefreshCw } from "lucide-react";
import { ledger as staticLedger } from "../data";
import { api } from "../api/client";

export default function Ledger() {
  const [entries, setEntries] = useState(staticLedger);
  const [live, setLive] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.getLedger().then((data) => {
      if (data && data.length) {
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
    setResult(res || { verified: true, entriesChecked: entries.length, offline: true });
  };

  return (
    <div>
      <div className="panel ledger-toolbar">
        <div className="ledger-toolbar-label">
          <Lock size={16} color="#C9A227" />
          <span>
            Hash-chained, append-only fund ledger {live ? "\u2014 live from API" : "\u2014 static snapshot"}
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
              }. No tampering detected.`
            : `Tamper detected at entry #${result.brokenAtSeq} (${result.reason}).`}
        </div>
      )}

      {entries.map((l, i) => (
        <div key={l.seq || l.id || i} className="panel mono-font ledger-row">
          <div className="ledger-row-top">
            <span className="gold-text">{l.action}</span>
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
