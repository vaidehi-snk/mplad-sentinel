// Hand-built SVG visuals. Each has a text alternative for screen readers.
import { useMemo, useState } from "react";
import { crore, int, month, date, days } from "./core";

const C = { forest: "#14452f", forest2: "#2f6b52", brass: "#a87b22", brass2: "#c9a24d", high: "#b8322a", medium: "#c26a16", watch: "#8f7a2a", rule: "#ddd6c6", muted: "#6d7a72", paper: "#f6f3ea", ink: "#15201a", na: "#6e7b85" };

// ---------- money river: recommended -> sanctioned -> paid -> completed ----------
export function FundRibbon({ funnel, dark = false }) {
  const st = [
    ["Recommended", funnel.recommended], ["Sanctioned", funnel.sanctioned], ["Paid to vendors", funnel.paid], ["Marked complete", funnel.completed],
  ];
  const W = 1000, H = 190, top = 26, maxH = 120, xs = [30, 340, 650, 970];
  const max = Math.max(...st.map(([, v]) => v.cr)) || 1;
  const h = (v) => Math.max(6, (v / max) * maxH);
  const yc = top + maxH / 2;
  let d = `M${xs[0]} ${yc - h(st[0][1].cr) / 2}`;
  for (let i = 1; i < 4; i++) { const mx = (xs[i - 1] + xs[i]) / 2; d += ` C${mx} ${yc - h(st[i - 1][1].cr) / 2}, ${mx} ${yc - h(st[i][1].cr) / 2}, ${xs[i]} ${yc - h(st[i][1].cr) / 2}`; }
  d += ` L${xs[3]} ${yc + h(st[3][1].cr) / 2}`;
  for (let i = 3; i > 0; i--) { const mx = (xs[i - 1] + xs[i]) / 2; d += ` C${mx} ${yc + h(st[i][1].cr) / 2}, ${mx} ${yc + h(st[i - 1][1].cr) / 2}, ${xs[i - 1]} ${yc + h(st[i - 1][1].cr) / 2}`; }
  const gap = funnel.sanctioned.cr - funnel.completed.cr;
  const spine = `M${xs[0]} ${yc} L${xs[3]} ${yc}`;
  return (
    <figure className={`ribbon${dark ? " dark" : ""}`} style={{ margin: 0 }}>
      <div className="ribbon-labels">
        {st.map(([l, v], i) => (
          <div key={l} style={{ left: `${(xs[i] / W) * 100}%` }} className={i === 3 ? "end" : i === 0 ? "start" : ""}>
            <div className="ribbon-value tnum">{crore(v.cr)}</div>
            <div className="ribbon-name">{l} <span className="muted">· {int(v.n)} works</span></div>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={st.map(([l, v]) => `${l} ${crore(v.cr)}`).join(", ")} style={{ width: "100%", display: "block" }}>
        <defs>
          <linearGradient id="rib" x1="0" x2="1">
            <stop offset="0" stopColor={C.forest} /><stop offset="0.55" stopColor={C.forest2} /><stop offset="1" stopColor={C.brass2} />
          </linearGradient>
          <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="7" fill={C.high} opacity=".22" /></pattern>
        </defs>
        <path d={d} fill="url(#rib)" className="draw-in" />
        {/* money in motion: particles drift along the flow, thinning as it narrows */}
        <path id="spine" d={spine} fill="none" stroke="none" />
        {Array.from({ length: 16 }, (_, i) => (
          <circle key={i} r={i % 3 ? 2.2 : 3.2} fill="#f6e7b8" opacity=".75">
            <animateMotion dur={`${6 + (i % 5)}s`} begin={`${-i * 0.9}s`} repeatCount="indefinite" path={`M${xs[0]} ${yc + ((i * 37) % 60) - 30} C300 ${yc + ((i * 53) % 50) - 25}, 650 ${yc + ((i * 29) % 30) - 15}, ${xs[3]} ${yc + ((i * 41) % 16) - 8}`} />
            <animate attributeName="opacity" values="0;.85;.85;0" dur={`${6 + (i % 5)}s`} begin={`${-i * 0.9}s`} repeatCount="indefinite" />
          </circle>
        ))}
        {xs.map((x) => <line key={x} x1={x} x2={x} y1={top - 14} y2={top + maxH + 14} stroke={C.ink} strokeOpacity=".25" strokeDasharray="3 4" />)}
        <text x={(xs[2] + xs[3]) / 2} y={H - 8} textAnchor="middle" fontSize="12.5" fill={C.high} fontFamily="IBM Plex Sans">
          {crore(gap)} sanctioned but not yet marked complete
        </text>
      </svg>
    </figure>
  );
}

// ---------- India outline map (equirectangular, approximate border) ----------
const INDIA = [[35.5,74.5],[36,77],[34.5,78.5],[32.5,79],[30.5,81],[28.5,84],[27.5,88],[28,88.8],[27.2,92],[28.2,95.5],[27.5,97],[25.2,94.6],[23.5,93.4],[21.9,92.6],[23.7,91.5],[24.3,92.2],[25.2,92],[25.2,89.8],[26.4,89.8],[26.2,88.5],[24.3,88.7],[22.9,88.9],[21.6,88.9],[21.5,87],[20,86.5],[19.2,84.8],[17.7,83.3],[16.3,81.3],[15.8,80.3],[13.4,80.3],[12,79.9],[10.3,79.8],[9.2,79],[8.1,77.5],[8.9,76.5],[10.8,75.8],[12.8,74.8],[15.4,73.8],[17.2,73.2],[19.5,72.8],[21.1,72.6],[22.2,72.6],[21,70.2],[22.3,68.9],[23.6,68.4],[24.3,71],[25.8,70.2],[27.2,70.4],[28,71.8],[29.6,73.6],[30.4,74],[31.6,74.6],[32.4,75.4],[33,74.2],[34.5,73.8],[35.5,74.5]];

export function IndiaMap({ points, onPick, metricLabel = "high-priority cases", height = 420 }) {
  const [hover, setHover] = useState(null);
  const W = 520, H = height;
  const view = useMemo(() => {
    const lats = points.map((p) => p.lat), lngs = points.map((p) => p.lng);
    let [la0, la1, lo0, lo1] = points.length > 1 ? [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)] : [6.5, 37, 68, 97.5];
    if (points.length > 1 && la1 - la0 < 4) { const c = (la0 + la1) / 2; la0 = c - 2.5; la1 = c + 2.5; }
    if (points.length > 1 && lo1 - lo0 < 4) { const c = (lo0 + lo1) / 2; lo0 = c - 2.5; lo1 = c + 2.5; }
    if (points.length > 6) { la0 = 6.5; la1 = 37; lo0 = 68; lo1 = 97.5; } // national view keeps the whole country
    const pad = 0.12;
    la0 -= (la1 - la0) * pad; la1 += (la1 - la0) * pad; lo0 -= (lo1 - lo0) * pad; lo1 += (lo1 - lo0) * pad;
    const k = Math.cos(((la0 + la1) / 2) * Math.PI / 180);
    const sx = W / ((lo1 - lo0) * k), sy = H / (la1 - la0), s = Math.min(sx, sy);
    const ox = (W - (lo1 - lo0) * k * s) / 2, oy = (H - (la1 - la0) * s) / 2;
    return (lat, lng) => [ox + (lng - lo0) * k * s, oy + (la1 - lat) * s];
  }, [points, W, H]);
  const outline = INDIA.map(([la, lo]) => view(la, lo).map((v) => v.toFixed(1)).join(",")).join(" ");
  const maxV = Math.max(1, ...points.map((p) => p.size));
  const shares = points.map((p) => p.share).sort((a, b) => a - b);
  const q = (f) => shares[Math.min(shares.length - 1, Math.floor(f * shares.length))] ?? 0;
  const [t1, t2, t3] = [q(0.25), q(0.5), q(0.75)];
  const hv = hover != null ? points[hover] : null;
  return (
    <div className="map-wrap" style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} role="img" aria-label={`Map of ${points.length} areas sized by sanctioned value, coloured by ${metricLabel}`}>
        <defs>
          <pattern id="dots" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1.1" fill="#c8bfa9" /></pattern>
          <clipPath id="india-clip"><polygon points={outline} /></clipPath>
        </defs>
        <rect width={W} height={H} fill="url(#dots)" opacity=".35" />
        <polygon points={outline} fill="#fbf8f0" stroke="#b9ae93" strokeWidth="1.2" strokeLinejoin="round" />
        <rect width={W} height={H} fill="url(#dots)" clipPath="url(#india-clip)" opacity=".9" />
        {points.map((p, i) => {
          const [x, y] = view(p.lat, p.lng);
          const r = (points.length > 6 ? 6 : 9) + Math.sqrt(p.size / maxV) * (points.length > 6 ? 13 : 20);
          const tone = points.length < 2 ? C.medium : p.share >= t3 ? C.high : p.share >= t2 ? C.medium : p.share >= t1 ? C.watch : C.forest2;
          return (
            <g key={p.name} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => onPick?.(p.name)} style={{ cursor: onPick ? "pointer" : "default" }}>
              <circle cx={x} cy={y} r={r + 5} fill={tone} opacity={hover === i ? 0.22 : 0.1} />
              <circle cx={x} cy={y} r={r} fill={tone} fillOpacity=".82" stroke="#fffdf8" strokeWidth="2" />
              {r > 11 && <text x={x} y={y + 4} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#fff" fontFamily="IBM Plex Mono">{p.value}</text>}
              <text x={x + r + 4} y={y + 4} fontSize="11" fill={C.ink} fontFamily="IBM Plex Sans" fontWeight="600" paintOrder="stroke" stroke="#fbf8f0" strokeWidth="3">{p.name}</text>
            </g>
          );
        })}
      </svg>
      {points.length > 1 && <div className="legend" style={{ padding: "0 8px" }}>
        {[[C.forest2, "lowest quarter"], [C.watch, ""], [C.medium, ""], [C.high, "highest quarter"]].map(([c, l], i) => <span key={i}><i style={{ background: c, width: 10, height: 10, borderRadius: 5 }} />{l}</span>)}
        <span style={{ marginLeft: "auto" }}>share of works needing attention · number = high-priority cases</span>
      </div>}
      {hv && (
        <div className="map-tip">
          <b>{hv.name}</b>
          <div>{hv.value} {metricLabel} · {crore(hv.sanctionedCr)} sanctioned</div>
          <div className="muted">{Math.round(hv.share * 100)}% of works need attention{onPick ? " · click to drill in" : ""}</div>
        </div>
      )}
    </div>
  );
}

// ---------- monthly bars + payment line ----------
export function MonthlyChart({ rows, height = 200 }) {
  const [hover, setHover] = useState(null);
  const data = rows.filter((r) => r.month >= "2023-04");
  const W = 900, H = height, pl = 44, pr = 10, pt = 14, pb = 26;
  const max = Math.max(1, ...data.map((r) => Math.max(r.sanctionedCr, r.paidCr)));
  const bw = (W - pl - pr) / Math.max(1, data.length);
  const y = (v) => pt + (1 - v / max) * (H - pt - pb);
  const line = data.map((r, i) => `${i ? "L" : "M"}${pl + i * bw + bw / 2},${y(r.paidCr)}`).join(" ");
  const ticks = [0, max / 2, max];
  const hv = hover != null ? data[hover] : null;
  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} role="img" aria-label="Monthly sanctions (bars) and payments (line) in crore rupees">
        {ticks.map((t) => (
          <g key={t}><line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} stroke={C.rule} strokeDasharray={t ? "2 4" : ""} />
            <text x={pl - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={C.muted} fontFamily="IBM Plex Mono">{t ? t.toFixed(0) : 0}</text></g>
        ))}
        {data.map((r, i) => (
          <g key={r.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect x={pl + i * bw} y={pt} width={bw} height={H - pt - pb} fill={hover === i ? "#efe8d6" : "transparent"} />
            <rect x={pl + i * bw + bw * 0.18} y={y(r.sanctionedCr)} width={bw * 0.64} height={H - pb - y(r.sanctionedCr)} rx="2" fill={C.forest} opacity=".85" />
            {r.flagged > 0 && <rect x={pl + i * bw + bw * 0.18} y={y(r.sanctionedCr)} width={bw * 0.64} height={Math.min(H - pb - y(r.sanctionedCr), 3)} fill={C.high} />}
            {(i % 3 === 0) && <text x={pl + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="10.5" fill={C.muted} fontFamily="IBM Plex Sans">{month(r.month)}</text>}
          </g>
        ))}
        <path d={line} fill="none" stroke={C.brass} strokeWidth="2.2" />
      </svg>
      {hv && (
        <div className="map-tip" style={{ top: 6, left: `${Math.min(80, (hover / data.length) * 100)}%` }}>
          <b>{month(hv.month)}</b>
          <div>{crore(hv.sanctionedCr)} sanctioned · {hv.sanctionedN} works</div>
          <div>{crore(hv.paidCr)} paid · {hv.completedN} marked complete</div>
          {hv.flagged > 0 && <div style={{ color: "var(--high)" }}>{hv.flagged} now need attention</div>}
        </div>
      )}
      <div className="legend"><span><i style={{ background: C.forest }} />Sanctioned (₹ cr)</span><span><i style={{ background: C.brass, height: 2 }} />Paid to vendors (₹ cr)</span><span><i style={{ background: C.high }} />Month with flagged works</span></div>
    </div>
  );
}

// ---------- sanction-lag histogram with the 45-day rule ----------
export function LagHistogram({ rows }) {
  const W = 520, H = 180, pl = 30, pb = 26, pt = 10;
  const max = Math.max(1, ...rows.map((r) => r.n));
  const bw = (W - pl) / rows.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} role="img" aria-label="Distribution of days from recommendation to sanction; the 45-day limit is marked">
      {rows.map((r, i) => {
        const h = (r.n / max) * (H - pb - pt);
        const over = r.from >= 45;
        return (
          <g key={r.bucket}>
            <rect x={pl + i * bw + 3} y={H - pb - h} width={bw - 6} height={h} rx="2" fill={over ? C.high : C.forest2} opacity={over ? 0.85 : 0.8} />
            <text x={pl + i * bw + bw / 2} y={H - pb - h - 4} textAnchor="middle" fontSize="10.5" fill={C.ink} fontFamily="IBM Plex Mono">{r.n || ""}</text>
            <text x={pl + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill={C.muted} fontFamily="IBM Plex Sans">{r.bucket}</text>
          </g>
        );
      })}
      <line x1={pl + 3 * bw} x2={pl + 3 * bw} y1={pt} y2={H - pb} stroke={C.high} strokeDasharray="4 3" strokeWidth="1.5" />
      <text x={pl + 3 * bw + 6} y={pt + 12} fontSize="11" fill={C.high} fontFamily="IBM Plex Sans" fontWeight="600">45-day limit</text>
    </svg>
  );
}

// ---------- peer strip: where this work's unit cost sits among comparable works ----------
export function PeerStrip({ rates, value, median, unit }) {
  const W = 560, H = 86, pad = 24;
  const all = [...rates, value];
  const lo = Math.log(Math.min(...all) * 0.9), hi = Math.log(Math.max(...all) * 1.1);
  const x = (v) => pad + ((Math.log(v) - lo) / (hi - lo)) * (W - pad * 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} role="img" aria-label={`This work's rate ${Math.round(value)} per ${unit} against a peer median of ${median}`}>
      <line x1={pad} x2={W - pad} y1={42} y2={42} stroke={C.rule} />
      {rates.map((r, i) => <circle key={i} cx={x(r)} cy={42 + ((i * 37) % 17) - 8} r="3.6" fill={C.forest2} opacity=".45" />)}
      <line x1={x(median)} x2={x(median)} y1={18} y2={66} stroke={C.forest} strokeWidth="1.5" />
      <text x={x(median)} y={14} textAnchor="middle" fontSize="10.5" fill={C.forest} fontFamily="IBM Plex Sans" fontWeight="600">peer median</text>
      <line x1={x(median * 1.6)} x2={x(median * 1.6)} y1={24} y2={60} stroke={C.medium} strokeDasharray="3 3" />
      <circle cx={x(value)} cy={42} r="8" fill={C.high} stroke="#fff" strokeWidth="2.5" />
      <text x={x(value)} y={80} textAnchor="middle" fontSize="11" fill={C.high} fontFamily="IBM Plex Sans" fontWeight="600">this work</text>
    </svg>
  );
}

// ---------- lifecycle: recommendation -> sanction -> payments -> deadline, with rule windows ----------
export function Lifecycle({ w, today, width = 1000 }) {
  const start = w.recommendedOn;
  const endCandidates = [w.deadline, today, w.completedOn, w.markedCompleteOn].filter(Boolean);
  const end = endCandidates.sort().at(-1);
  const span = Math.max(30, days(start, end));
  const W = width, H = 206, pl = 20, pr = 20;
  const x = (d) => pl + (days(start, d) / span) * (W - pl - pr);
  const rail = 124;
  const sanction45 = new Date(new Date(start).getTime() + 45 * 86400000).toISOString().slice(0, 10);
  const marks = [
    { d: w.recommendedOn, label: "Recommended", tone: C.ink, row: 0 },
    w.sanctionedOn && { d: w.sanctionedOn, label: "Sanctioned", tone: w.sanctionLag > 45 ? C.high : C.forest, row: 1 },
    w.completedOn && { d: w.completedOn, label: "Work complete", tone: C.forest, row: 0 },
    w.markedCompleteOn && { d: w.markedCompleteOn, label: "Marked complete", tone: C.forest2, row: 1 },
  ].filter(Boolean).sort((a, b) => a.d.localeCompare(b.d));
  // events a few pixels apart read as one: merge them into a single label
  const merged = [];
  for (const m of marks) {
    const prev = merged.at(-1);
    if (prev && x(m.d) - x(prev.d) < 16) prev.label = `${prev.label} · ${m.label.toLowerCase()}`;
    else merged.push({ ...m });
  }
  let lastPay = -99;
  const payLabel = (w.payments || []).map((p) => { const px = x(p.on); const show = px - lastPay >= 30 || !p.photo; if (show) lastPay = px; return show; });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} role="img" aria-label="Timeline of this work against the 45-day sanction window and the completion deadline">
      <rect x={x(start)} y={rail - 16} width={x(sanction45) - x(start)} height={32} fill="#e2efe7" rx="4" />
      <text x={x(start) + 2} y={rail + 30} fontSize="10" fill={C.forest2} fontFamily="IBM Plex Sans">45-day window</text>
      {w.sanctionedOn && w.deadline && <rect x={x(w.sanctionedOn)} y={rail - 4} width={Math.max(0, x(w.deadline) - x(w.sanctionedOn))} height={8} fill="#efe8d6" rx="4" />}
      <line x1={pl} x2={W - pr} y1={rail} y2={rail} stroke={C.rule} strokeWidth="2" />
      {w.sanctionedOn && <line x1={x(w.sanctionedOn)} x2={x(w.completedOn || (today < w.deadline ? today : w.deadline))} y1={rail} y2={rail} stroke={C.forest} strokeWidth="3" />}
      {!w.completedOn && w.deadline && today > w.deadline && <line x1={x(w.deadline)} x2={x(today)} y1={rail} y2={rail} stroke={C.high} strokeWidth="3" strokeDasharray="5 3" />}
      {w.deadline && <g>
        <line x1={x(w.deadline)} x2={x(w.deadline)} y1={rail - 26} y2={rail + 26} stroke={C.high} strokeWidth="1.5" />
        <text x={x(w.deadline)} y={rail + 40} textAnchor={x(w.deadline) > W - 110 ? "end" : x(w.deadline) < 110 ? "start" : "middle"} fontSize="11" fill={C.high} fontFamily="IBM Plex Sans" fontWeight="600">Deadline {date(w.deadline)}</text>
      </g>}
      <g>
        <line x1={x(today)} x2={x(today)} y1={rail - 34} y2={rail + 12} stroke={C.ink} strokeDasharray="2 2" />
        <text x={x(today)} y={rail - 38} textAnchor={x(today) > W - 30 ? "end" : "middle"} fontSize="10.5" fill={C.ink} fontFamily="IBM Plex Sans">today</text>
      </g>
      {(w.payments || []).map((p, k) => (
        <g key={p.stage + p.on}>
          <rect x={x(p.on) - 6} y={rail - 6} width="12" height="12" rx="2" transform={`rotate(45 ${x(p.on)} ${rail})`} fill={p.photo ? C.brass2 : "#fff"} stroke={p.photo ? C.brass : C.high} strokeWidth="2" />
          {payLabel[k] && <text x={x(p.on)} y={rail + 58} textAnchor="middle" fontSize="10" fill={p.photo ? C.muted : C.high} fontFamily="IBM Plex Mono">{p.stage}%{p.photo ? "" : " ✕"}</text>}
        </g>
      ))}
      {(() => {
        // stagger labels so close events never overprint: each label takes the next free row
        const rows = [];
        return merged.map((m, i) => {
          const px = x(m.d);
          const need = m.label.length * 6.4 + 12;
          let row = 0;
          while (row < 2 && rows[row] != null && px - rows[row] < need) row++;
          row = Math.min(row, 2);
          rows[row] = px;
          const y0 = rail - 26 - row * 28;
          const anchor = px < 90 ? "start" : px > W - 90 ? "end" : "middle";
          return (
            <g key={i}>
              <line x1={px} x2={px} y1={y0 + 4} y2={rail - 6} stroke={m.tone} strokeOpacity=".35" />
              <circle cx={px} cy={rail} r="6" fill="#fff" stroke={m.tone} strokeWidth="3" />
              <text x={px} y={y0 - 12} textAnchor={anchor} fontSize="11" fill={m.tone} fontFamily="IBM Plex Sans" fontWeight="600">{m.label}</text>
              <text x={px} y={y0} textAnchor={anchor} fontSize="10" fill={C.muted} fontFamily="IBM Plex Mono">{date(m.d)}</text>
            </g>
          );
        });
      })()}
    </svg>
  );
}

// ---------- two works on a local grid, for duplicate comparison ----------
export function PairMap({ a, b }) {
  const W = 260, H = 200;
  const k = Math.cos(a.lat * Math.PI / 180) * 111320, m = 111320;
  const dx = (b.lng - a.lng) * k, dy = (b.lat - a.lat) * m;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const scale = Math.min(70 / Math.max(20, dist), 2.2);
  const ax = W / 2 - (dx * scale) / 2, ay = H / 2 + (dy * scale) / 2, bx = ax + dx * scale, by = ay - dy * scale;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", background: "#f1ecdf", borderRadius: 8 }} role="img" aria-label={`The two works are ${Math.round(dist)} metres apart`}>
      <defs><pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#ddd3bd" /></pattern></defs>
      <rect width={W} height={H} fill="url(#g)" />
      <circle cx={ax} cy={ay} r={250 * scale} fill="#b8322a" opacity=".06" stroke="#b8322a" strokeOpacity=".3" strokeDasharray="4 4" />
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#15201a" strokeDasharray="3 3" />
      <circle cx={ax} cy={ay} r="8" fill="#14452f" stroke="#fff" strokeWidth="2" /><text x={ax - 12} y={ay + 4} textAnchor="end" fontSize="11" fontWeight="700" fill="#14452f">A</text>
      <circle cx={bx} cy={by} r="8" fill="#b8322a" stroke="#fff" strokeWidth="2" /><text x={bx + 12} y={by + 4} fontSize="11" fontWeight="700" fill="#b8322a">B</text>
      <text x={W / 2} y={H - 10} textAnchor="middle" fontSize="11.5" fill="#15201a" fontFamily="IBM Plex Mono">{Math.round(dist)} m apart · 250 m ring</text>
    </svg>
  );
}

// ---------- share against a statutory threshold ----------
export function Threshold({ value, target, label }) {
  const max = Math.max(target * 2.2, value * 1.1, 0.01);
  const ok = value >= target;
  return (
    <div className="threshold" title={`${label}: ${(value * 100).toFixed(1)}% against ${(target * 100).toFixed(1)}%`}>
      <div className="threshold-track">
        <div className="threshold-fill" style={{ width: `${(value / max) * 100}%`, background: ok ? C.forest2 : C.high }} />
        <div className="threshold-mark" style={{ left: `${(target / max) * 100}%` }} />
      </div>
      <span className="tnum" style={{ color: ok ? "var(--ink)" : "var(--high)", fontWeight: ok ? 400 : 600 }}>{(value * 100).toFixed(1)}%</span>
    </div>
  );
}
