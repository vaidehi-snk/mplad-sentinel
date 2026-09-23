import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ArrowRight, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

const ROLE_OPTIONS = [
  { id: "mp", label: "Member of Parliament", jurisdictionKey: "constituencies", jurisdictionNoun: "constituency" },
  { id: "district", label: "District Authority", jurisdictionKey: "districts", jurisdictionNoun: "district" },
  { id: "state", label: "State Nodal Authority", jurisdictionKey: "states", jurisdictionNoun: "state" },
  { id: "ministry", label: "Ministry", jurisdictionKey: null, jurisdictionNoun: null },
];

export default function Login() {
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("mp");
  const [jurisdictions, setJurisdictions] = useState({ constituencies: [], districts: [], states: [] });
  const [jurisdiction, setJurisdiction] = useState("");
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getJurisdictions().then((data) => {
      if (data) setJurisdictions(data);
    });
  }, []);

  const roleMeta = ROLE_OPTIONS.find((r) => r.id === roleId);
  const options = roleMeta.jurisdictionKey ? jurisdictions[roleMeta.jurisdictionKey] || [] : [];

  useEffect(() => {
    // Reset / auto-pick jurisdiction whenever the role changes so stale
    // selections from a different role can't linger.
    setJurisdiction(options[0] || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId, jurisdictions]);

  const needsJurisdiction = Boolean(roleMeta.jurisdictionKey);
  const canSubmit = name.trim() && (!needsJurisdiction || jurisdiction);

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    const ok = await login(name.trim(), roleId, jurisdiction || null);
    setSubmitting(false);
    if (ok) navigate("/app");
  };

  return (
    <div className="login-page">
      <form onSubmit={submit} className="panel login-card">
        <div className="login-brand">
          <Shield size={22} color="#C9A227" />
          <span className="serif-font">Sentinel</span>
        </div>
        <div className="login-subtitle">Explore a demo jurisdiction</div>

        <p className="login-role-hint">Local demonstration. Selecting a role does not verify official identity. Use sample data only.</p>
        <label className="login-label">Name</label>
        <input
          className="citizen-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          autoFocus
        />

        <label className="login-label">I am signing in as</label>
        <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="citizen-select" style={{ width: "100%" }}>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.id} value={r.id}>{r.label}</option>
          ))}
        </select>
        <div className="login-role-hint">
          {roleId === "mp"
            ? "MP view is a transparency feature \u2014 you'll see your own constituency's works and any flags on them."
            : "Oversight roles can browse every MP in scope, ranked by risk, and drill into any of them \u2014 this is the platform's actual monitoring view."}
        </div>

        {needsJurisdiction && (
          <>
            <label className="login-label" style={{ textTransform: "capitalize" }}>
              Which {roleMeta.jurisdictionNoun} are you viewing?
            </label>
            {options.length > 0 ? (
              <select
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                className="citizen-select"
                style={{ width: "100%" }}
              >
                {options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <div className="login-warning">
                <AlertTriangle size={13} />
                No {roleMeta.jurisdictionNoun} data loaded yet. Go to Data Ingestion after signing in to upload a
                real dataset, or continue and you'll see an empty dashboard.
              </div>
            )}
          </>
        )}

        {error && (
          <div className="login-warning">
            <AlertTriangle size={13} />
            {error}
          </div>
        )}

        <button type="submit" className="gold-btn login-submit" disabled={!canSubmit || submitting}>
          {submitting ? "Signing in..." : "Sign in"} <ArrowRight size={14} />
        </button>
        <div className="login-note">
          Demo login for this prototype &mdash; no password is checked. The jurisdiction list above is pulled from
          whatever data is actually loaded right now, so what you see after signing in matches what you picked here.
        </div>
      </form>
    </div>
  );
}
