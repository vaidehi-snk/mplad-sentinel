// The night map: real state boundaries (@svg-maps/india), every work as a point of light,
// hotspots that pulse, and a camera that flies into a state when you pick it.
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import india from "@svg-maps/india";

// Mercator fit to this SVG (calibrated on extreme points; residual < 1 unit)
const merc = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
export const project = (lat, lng) => [20.9326 * lng - 1427.185, -1201.7443 * merc(lat) + 837.803];
const FULL = [0, 0, 612, 696];
const LEVEL_GLOW = { high: "var(--glow-high)", medium: "var(--glow-medium)", watch: "var(--glow-watch)", incomplete: "#7d8c95", clear: "var(--glow-clear)" };

export function AtlasMap({ focus, focusDots = false, dots = [], regions = {}, regionTone, links = [], hot = [], onPickState, onPickDot, onPickHot, emphasis, compact = false, dim = false, showLabels = true }) {
  const svgRef = useRef(null);
  const [bbox, setBbox] = useState({});
  const [tip, setTip] = useState(null);
  // measure state outlines once so the camera can frame any state
  useLayoutEffect(() => {
    const out = {};
    svgRef.current?.querySelectorAll("path[data-name]").forEach((p) => { const b = p.getBBox(); out[p.dataset.name] = [b.x, b.y, b.width, b.height]; });
    setBbox(out);
  }, []);
  const vb = useMemo(() => {
    let b = focus && bbox[focus];
    if (focusDots && dots.length) { // frame the works themselves (district / constituency view)
      const xy = dots.map((d) => project(d[1], d[2]));
      const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
      const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
      const m = Math.max(x1 - x0, y1 - y0, 12);
      b = [(x0 + x1) / 2 - m / 2, (y0 + y1) / 2 - m / 2, m, m];
    }
    if (!b) return FULL;
    const pad = Math.max(b[2], b[3]) * 0.16;
    let [x, y, w, h] = [b[0] - pad, b[1] - pad, b[2] + pad * 2, b[3] + pad * 2];
    const ratio = FULL[2] / FULL[3];
    if (w / h > ratio) { const nh = w / ratio; y -= (nh - h) / 2; h = nh; } else { const nw = h * ratio; x -= (nw - w) / 2; w = nw; }
    return [x, y, w, h];
  }, [focus, bbox, focusDots, dots]);
  const k = vb[2] / FULL[2]; // zoom factor for sizes
  // Greedy label placement: heaviest hotspot first; try above, below, right, left; drop if nothing fits.
  const labels = useMemo(() => {
    const placed = [], out = new Map(), fs = 11 * k, cw = fs * 0.56;
    for (const h of [...hot].sort((a, b) => b.weight - a.weight)) {
      const [x, y] = project(h.lat, h.lng), text = `${h.name}${h.count ? ` · ${h.count}` : ""}`, w = text.length * cw, r = (10 + h.weight * 10) * k;
      const tries = [[0, -r, "middle"], [0, r + fs, "middle"], [r * 0.8, fs * 0.35, "start"], [-r * 0.8, fs * 0.35, "end"]];
      for (const [dx, dy, anchor] of tries) {
        const x0 = x + dx - (anchor === "middle" ? w / 2 : anchor === "end" ? w : 0), box = [x0, y + dy - fs, x0 + w, y + dy + 2 * k];
        if (placed.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
        placed.push(box); out.set(h.name, { dx, dy, anchor, text }); break;
      }
    }
    return out;
  }, [hot, k]);
  const pts = useMemo(() => dots.map((d) => ({ id: d[0], xy: project(d[1], d[2]), level: d[3], dup: d[4], early: d[5] })), [dots]);

  return (
    <div className={`atlas-map${compact ? " compact" : ""}${dim ? " dim" : ""}`}>
      <motion.svg ref={svgRef} viewBox={FULL.join(" ")} animate={{ viewBox: vb.join(" ") }} transition={{ duration: 1.1, ease: [0.3, 0.7, 0.1, 1] }}
        role="img" aria-label={`Map of India${focus ? `, focused on ${focus}` : ""}, one point per MPLADS work`}>
        <defs>
          <radialGradient id="land" cx="50%" cy="40%" r="70%"><stop offset="0" stopColor="#1b3d2e" /><stop offset="1" stopColor="#12291f" /></radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation={2.2 * k} result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {india.locations.map((l) => {
          const active = regions[l.name] != null;
          const tone = active && regionTone ? regionTone(regions[l.name]) : null;
          return (
            <path key={l.id} d={l.path} data-name={l.name}
              className={`st${active ? " on" : ""}${focus === l.name ? " focus" : ""}${focus && focus !== l.name ? " away" : ""}`}
              style={tone ? { fill: tone } : undefined}
              strokeWidth={0.7 * k}
              onClick={active && onPickState ? () => onPickState(l.name) : undefined}
              onMouseMove={active ? (e) => setTip({ x: e.clientX, y: e.clientY, name: l.name, v: regions[l.name] }) : undefined}
              onMouseLeave={() => setTip(null)} />
          );
        })}
        {links.map(([a, b], i) => {
          const [x1, y1] = project(a[0], a[1]), [x2, y2] = project(b[0], b[1]);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--glow-high)" strokeWidth={1.2 * k} strokeDasharray={`${2 * k} ${1.5 * k}`} />;
        })}
        <g filter="url(#glow)">
          {pts.map((p) => (
            <circle key={p.id} cx={p.xy[0]} cy={p.xy[1]} r={(p.level === "high" ? 2.4 : p.level === "medium" ? 1.9 : 1.25) * k * (compact ? 1.5 : 1)}
              fill={LEVEL_GLOW[p.level]} opacity={emphasis ? (emphasis(p) ? 1 : 0.14) : p.level === "clear" ? 0.55 : 0.95} className={onPickDot ? "dot live" : "dot"}
              onClick={onPickDot ? () => onPickDot(p.id) : undefined}
              onMouseMove={onPickDot ? (e) => setTip({ x: e.clientX, y: e.clientY, id: p.id, level: p.level }) : undefined}
              onMouseLeave={() => setTip(null)} />
          ))}
        </g>
        {hot.map((h, i) => {
          const [x, y] = project(h.lat, h.lng);
          const lab = labels.get(h.name);
          return (
            <g key={h.name} transform={`translate(${x} ${y})`} style={{ cursor: onPickHot ? "pointer" : "default", color: h.color || "var(--glow-high)" }} onClick={onPickHot ? () => onPickHot(h.name) : undefined}>
              <circle r={(8 + h.weight * 14) * k} className="pulse" style={{ animationDelay: `${(i % 5) * 0.45}s` }} />
              <circle r={(3 + h.weight * 5) * k} className="pulse-core" />
              {showLabels && !compact && lab && <text x={lab.dx} y={lab.dy} textAnchor={lab.anchor} fontSize={11 * k} className="map-label">{lab.text}</text>}
            </g>
          );
        })}
      </motion.svg>
      {tip && (
        <div className="map-float" style={{ left: tip.x + 14, top: tip.y + 14 }}>
          {tip.name ? <><b>{tip.name}</b><div>{tip.v?.label}</div>{onPickState && <div className="muted">click to fly in</div>}</> : <><b className="mono">{tip.id}</b><div style={{ textTransform: "capitalize" }}>{tip.level === "incomplete" ? "can’t assess" : tip.level} priority · click to open</div></>}
        </div>
      )}
    </div>
  );
}
