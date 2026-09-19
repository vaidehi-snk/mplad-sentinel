import React from "react";
import { NavLink } from "react-router-dom";
import { Shield, TrendingUp, AlertTriangle, FileText, Link2, Users, UploadCloud, ScanSearch, Landmark, Globe } from "lucide-react";
import { useRole } from "../context/RoleContext";

export default function Sidebar() {
  const { role, allWorks } = useRole();
  const isOversight = role !== "mp";
  const workDataCount = allWorks.length;
  const distinctMps = new Set(allWorks.map((w) => w.mp || w.constituency)).size;

  const perWorkNav = [
    { to: "/app", label: "Overview", icon: TrendingUp, end: true },
    ...(isOversight ? [{ to: "/app/mps", label: "MP Roster", icon: Landmark }] : []),
    { to: "/app/alerts", label: "Risk Alerts", icon: AlertTriangle },
    { to: "/app/ledger", label: "Ledger", icon: FileText },
    { to: "/app/network", label: "Network", icon: Link2 },
    { to: "/app/citizen", label: "Citizen Check", icon: Users },
    { to: "/app/ghost-check", label: "Ghost-Work Check", icon: ScanSearch },
    { to: "/app/ingest", label: "Data Ingestion", icon: UploadCloud },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <Shield size={20} color="#C9A227" />
        <span className="serif-font brand-text">Sentinel</span>
      </div>

      <div className="sidebar-section-label">
        Per-work dataset
        <span className="sidebar-section-count">
          {distinctMps} MP{distinctMps !== 1 ? "s" : ""}, {workDataCount} works
        </span>
      </div>
      {perWorkNav.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          className={({ isActive }) => "navitem" + (isActive ? " active" : "")}
        >
          <n.icon size={15} /> {n.label}
        </NavLink>
      ))}

      {isOversight && (
        <>
          <div className="sidebar-section-label sidebar-section-label-alt">
            National dataset (free, separate)
            <span className="sidebar-section-count">732 MPs</span>
          </div>
          <NavLink to="/app/national" className={({ isActive }) => "navitem" + (isActive ? " active" : "")}>
            <Globe size={15} /> National MP Data
          </NavLink>
        </>
      )}
    </div>
  );
}
