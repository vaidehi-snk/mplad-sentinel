import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Landmark,
  Building2,
  MapPinned,
  UserRound,
  LoaderCircle,
} from "lucide-react";
import { Brand } from "./UI";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

const roles = [
  {
    id: "ministry",
    label: "Ministry",
    note: "Across jurisdictions",
    icon: Landmark,
  },
  {
    id: "state",
    label: "State authority",
    note: "Across districts",
    key: "states",
    icon: MapPinned,
  },
  {
    id: "district",
    label: "District authority",
    note: "Local review desk",
    key: "districts",
    icon: Building2,
  },
  {
    id: "mp",
    label: "Member of Parliament",
    note: "Constituency view",
    key: "constituencies",
    icon: UserRound,
  },
];

export default function Entrance() {
  useEffect(() => {
    document.title = "Welcome � Sentinel";
  }, []);
  const { user, login, error } = useAuth();
  const [name, setName] = useState("");
  const [role, setRole] = useState("ministry");
  const [jurisdiction, setJurisdiction] = useState("");
  const [options, setOptions] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const roleInfo = roles.find((r) => r.id === role);
  useEffect(() => {
    api.getJurisdictions().then(setOptions);
  }, []);
  useEffect(() => {
    setJurisdiction(options?.[roleInfo.key]?.[0] || "");
  }, [options, roleInfo.key]);
  if (user) return <Navigate to="/app" replace />;
  async function enter(e) {
    e.preventDefault();
    setBusy(true);
    const ok = await login(
      name.trim() || "Demo reviewer",
      role,
      jurisdiction || null,
    );
    setBusy(false);
    if (ok) navigate("/app");
  }
  return (
    <div className="entrance">
      <section className="entrance-story">
        <Brand />
        <div className="entrance-story-content">
          <div className="eyebrow">PUBLIC WORKS. PUBLIC TRUST.</div>
          <h1>
            Every work deserves
            <br />a <em>clear record.</em>
          </h1>
          <p>
            A considered view of MPLADS works.
            <br />
            From the first signal to a documented decision.
          </p>
          <div className="entrance-rule" />
          <div className="entrance-principles">
            <span>
              <b>01</b> Observe the pattern
            </span>
            <span>
              <b>02</b> Examine the evidence
            </span>
            <span>
              <b>03</b> Record the decision
            </span>
          </div>
        </div>
        <svg
          className="civic-elevation"
          viewBox="0 0 600 180"
          fill="none"
          aria-hidden="true"
        >
          <g stroke="currentColor" strokeWidth="1">
            <path d="M0 156h600M0 164h600M30 156V89l64-38 64 38v67M39 89h110M50 99v57m22-57v57m44-57v57m22-57v57M84 156v-31h20v31M201 156V65h86v91m-98-91h111M213 65V53h61v12M216 53l28-20 27 20M219 84h9v13h-9zm27 0h9v13h-9zm27 0h5v13h-5M219 110h9v13h-9zm27 0h9v13h-9zm27 0h5v13h-5M343 156v-40h220v40M334 115h238M358 156c0-40 45-40 45 0m28 0c0-40 45-40 45 0m28 0c0-40 45-40 45 0M350 109V87m18 22V87m18 22V87m18 22V87m18 22V87m18 22V87m18 22V87m18 22V87m18 22V87m18 22V87m18 22V87m18 22V87M340 87h224" />
            <path d="M168 156v-42m-12 12c-8-22 4-36 12-36s20 14 12 36zM312 156v-42m-12 12c-8-22 4-36 12-36s20 14 12 36z" />
          </g>
        </svg>
        <div className="entrance-story-footer">
          <span>SIH 2026 · SIH26102</span>
          <span>Designed for public purpose</span>
        </div>
      </section>
      <section className="entrance-form-area">
        <div className="entrance-top-note">
          MPLAD SENTINEL <span>RESEARCH PROTOTYPE</span>
        </div>
        <form className="entrance-form" onSubmit={enter}>
          <div className="eyebrow">YOUR REVIEW WORKSPACE</div>
          <h2>
            A closer look
            <br />
            starts here.
          </h2>
          <p>Choose a perspective to explore the available records.</p>
          <label className="field-label" htmlFor="reviewer-name">
            Your name <span>optional for this demo</span>
          </label>
          <input
            id="reviewer-name"
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            placeholder="e.g. Aditi Sharma"
          />
          <fieldset className="role-picker">
            <legend>Workspace perspective</legend>
            {roles.map(({ id, label, note, icon: Icon }) => (
              <label
                className={`role-option ${role === id ? "selected" : ""}`}
                key={id}
              >
                <input
                  type="radio"
                  name="role"
                  value={id}
                  checked={role === id}
                  onChange={() => setRole(id)}
                />
                <Icon size={19} />
                <span>
                  <strong>{label}</strong>
                  <small>{note}</small>
                </span>
                <span className="radio-indicator" />
              </label>
            ))}
          </fieldset>
          {roleInfo.key && (
            <div className="field">
              <label className="field-label" htmlFor="jurisdiction">
                Jurisdiction
              </label>
              <select
                id="jurisdiction"
                className="text-input"
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
              >
                {(options?.[roleInfo.key] || []).map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
              {!jurisdiction && (
                <small>No jurisdictions loaded. Check the local API.</small>
              )}
            </div>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="button primary entrance-submit"
            disabled={busy || (role !== "ministry" && !jurisdiction)}
          >
            {busy ? (
              <LoaderCircle className="spin" size={18} />
            ) : (
              <>
                Enter workspace
                <ArrowRight size={18} />
              </>
            )}
          </button>
          <p className="entrance-disclosure">
            Demo access only. Role selection does not verify official identity.
            Records are a historical sample or user imports.
          </p>
        </form>
        <div className="entrance-bottom">
          An independent SIH prototype. Not an official government portal.
          <a
            href="https://mplads.mospi.gov.in/digigov/dashboard.html"
            target="_blank"
            rel="noreferrer"
          >
            Official MPLADS portal
            <ArrowUpRight size={13} />
          </a>
        </div>
      </section>
    </div>
  );
}
