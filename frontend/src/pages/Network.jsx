import React, { useEffect, useState } from "react";
import { api } from "../api/client";

const WIDTH = 640;
const HEIGHT = 340;

// The API returns real nodes/edges but no coordinates -- position is a
// presentation concern, not something the backend should own. This lays
// contractors out in a left column and their works in a right column,
// grouped under their contractor.
function layout(nodes, edges) {
  const contractors = nodes.filter((n) => n.type === "contractor");
  const works = nodes.filter((n) => n.type === "work");
  const positioned = {};

  contractors.forEach((c, i) => {
    positioned[c.id] = { ...c, x: 120, y: 40 + (i * (HEIGHT - 80)) / Math.max(1, contractors.length - 1 || 1) };
  });
  works.forEach((w, i) => {
    positioned[w.id] = { ...w, x: WIDTH - 140, y: 30 + (i * (HEIGHT - 60)) / Math.max(1, works.length - 1 || 1) };
  });

  return { nodes: Object.values(positioned), edges };
}

export default function Network() {
  const [active, setActive] = useState(null);
  const [live, setLive] = useState(false);
  const [graph, setGraph] = useState(() => ({
    nodes: [],
    edges: [],
  }));

  useEffect(() => {
    api.getNetwork().then((data) => {
      if (data && data.nodes && data.nodes.length) {
        setGraph(layout(data.nodes, data.edges));
        setLive(true);
      }
    });
  }, []);

  const find = (id) => graph.nodes.find((n) => n.id === id);
  const truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + "\u2026" : s);

  return (
    <div className="panel network-panel">
      <div className="panel-label">
        Implementing agencies and works {live ? "\u2014 real, derived from ingested data" : "\u2014 illustrative demo data"}
        {live && " (accounts/bank-level clustering isn't in this dataset, so that layer is still a roadmap item)"}
      </div>
      <p className="dim">Shared agency assignments do not establish vendor collusion. Vendor and tender records are needed for that analysis.</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height="360">
        {graph.edges.map(([a, b], i) => {
          const A = find(a), B = find(b);
          if (!A || !B) return null;
          return <line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#2A3550" strokeWidth="1.5" />;
        })}
        {graph.nodes.map((n) => (
          <g key={n.id} onClick={() => setActive(n)} style={{ cursor: "pointer" }}>
            <circle
              cx={n.x}
              cy={n.y}
              r={n.type === "contractor" ? 10 : 6}
              fill={n.flagged ? "#C0392B" : "#2F9E6E"}
              stroke="#0B1220"
              strokeWidth="2"
            />
            <text x={n.x} y={n.y - 12} textAnchor="middle" fontSize="9" fill="#8B93A7" fontFamily="Inter, sans-serif">
              {truncate(n.type === "contractor" ? n.id : n.label || n.id, 20)}
            </text>
          </g>
        ))}
      </svg>
      {active && (
        <div className="network-detail">
          <strong>{active.type === "contractor" ? active.id : active.label || active.id}</strong> &mdash; {active.type}
          {active.type === "contractor" && (
            <span className="dim">
              {" "}
              &middot; {active.worksCount ?? "?"} work(s){active.sanctioned ? `, ${(active.sanctioned / 100000).toFixed(1)}L sanctioned` : ""}
            </span>
          )}
          {active.flagged ? (
            <span className="danger-text"> &middot; flagged pattern</span>
          ) : (
            <span className="success-text"> &middot; no anomalies linked</span>
          )}
        </div>
      )}
    </div>
  );
}
