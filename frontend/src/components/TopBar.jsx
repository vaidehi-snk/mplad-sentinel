import React, { useState, useRef, useEffect } from "react";
import { MapPin, LogOut, ChevronDown } from "lucide-react";
import { useRole } from "../context/RoleContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate, NavLink } from "react-router-dom";

export default function TopBar() {
  const { role, setRole, roles, scopeLabel, source, realData, isSmallSample } = useRole();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClickAway(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  const initial = (user?.name || "?").trim().charAt(0).toUpperCase();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
    {isSmallSample && (
      <div className="sample-warning-banner">
        Only a small test sample is loaded ({" "}
        <NavLink to="/app/ingest">upload a real CSV in Data Ingestion</NavLink> for a full, realistic demo).
      </div>
    )}
    <div className="topbar">
      <div>
        <div className="serif-font topbar-title">{scopeLabel}</div>
        <div className="topbar-sub">
          <MapPin size={12} /> MPLAD Fund Utilization, FY 2026&ndash;27
          <span className={"data-badge " + (realData ? "data-badge-real" : "data-badge-demo")}>
            {realData ? "Real MPLADS data" : "Demo data"}
          </span>
          <span className={"data-badge " + (source === "api" ? "data-badge-real" : "data-badge-demo")}>
            {source === "api" ? "Live API" : "Static fallback"}
          </span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="role-toggle">
          {roles.map((r) => (
            <button
              key={r.id}
              onClick={() => setRole(r.id)}
              className={role === r.id ? "role-btn active" : "role-btn"}
              title="Switch view (demo convenience \u2014 a real deployment would lock this to your login)"
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="account-menu-wrap" ref={menuRef}>
          <button className="account-pill" onClick={() => setMenuOpen((v) => !v)}>
            <span className="account-avatar">{initial}</span>
            <span className="account-name">{user?.name || "Guest"}</span>
            <ChevronDown size={13} color="#8B93A7" />
          </button>
          {menuOpen && (
            <div className="account-dropdown">
              <div className="account-dropdown-role">Signed in as {user?.name}</div>
              <button className="account-dropdown-item" onClick={handleLogout}>
                <LogOut size={13} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
