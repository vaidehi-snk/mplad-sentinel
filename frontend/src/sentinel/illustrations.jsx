// "Every work, watched": a constituency drawn from the assets MPLADS actually builds.
// A brass scan line sweeps across; each asset gets its verdict as the line passes.
import { motion } from "motion/react";

const INK = "#15201a", FOREST = "#14452f", FOREST2 = "#2f6b52", BRASS = "#c9a24d", PAPER = "#fbf7ec", SAND = "#e9dfc6", HIGH = "#b8322a", CLEAR = "#2f6b52";
const SWEEP = 6; // seconds per sweep

function Tag({ x, y, ok, label, delay }) {
  return (
    <motion.g initial={{ opacity: 0, scale: 0.4, y: 8 }} animate={{ opacity: [0, 1, 1, 1, 0], scale: [0.4, 1.08, 1, 1, 0.9], y: [8, 0, 0, 0, 0] }}
      transition={{ duration: SWEEP, times: [0, 0.06, 0.1, 0.9, 1], delay, repeat: Infinity, repeatDelay: 0 }} style={{ transformOrigin: `${x}px ${y}px` }}>
      <line x1={x} y1={y + 12} x2={x} y2={y + 30} stroke={ok ? CLEAR : HIGH} strokeWidth="1.5" strokeDasharray="2 2" />
      <rect x={x - (label.length * 3.4 + 18)} y={y - 12} width={label.length * 6.8 + 36} height={24} rx={12} fill={ok ? "#e2efe7" : "#f8e4df"} stroke={ok ? CLEAR : HIGH} strokeWidth="1.2" />
      <circle cx={x - (label.length * 3.4 + 18) + 13} cy={y} r="7" fill={ok ? CLEAR : HIGH} />
      {ok ? <path d={`M${x - label.length * 3.4 - 9} ${y}l2.5 2.5 4.5-5`} stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        : <path d={`M${x - label.length * 3.4 - 5} ${y - 3.5}v4M${x - label.length * 3.4 - 5} ${y + 3}v.5`} stroke="#fff" strokeWidth="2" strokeLinecap="round" />}
      <text x={x - (label.length * 3.4 + 18) + 25} y={y + 4} fontSize="11" fontWeight="600" fill={ok ? CLEAR : HIGH} fontFamily="IBM Plex Sans">{label}</text>
    </motion.g>
  );
}

export function TownScene() {
  // x positions double as the moment the scan line reaches each asset
  const at = (x) => (x / 640) * SWEEP;
  return (
    <svg viewBox="0 0 640 440" className="town" role="img" aria-label="Illustration: a town's MPLADS works being checked one by one">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fbf7ec" /><stop offset="1" stopColor="#efe4c9" /></linearGradient>
        <linearGradient id="scan" x1="0" x2="1"><stop offset="0" stopColor={BRASS} stopOpacity="0" /><stop offset="0.85" stopColor={BRASS} stopOpacity="0.28" /><stop offset="1" stopColor={BRASS} stopOpacity="0.9" /></linearGradient>
        <clipPath id="frame"><rect width="640" height="440" rx="26" /></clipPath>
        <pattern id="field" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)"><path d="M0 5h10" stroke="#d9cda9" strokeWidth="1.2" /></pattern>
      </defs>
      <g clipPath="url(#frame)">
        <rect width="640" height="440" fill="url(#sky)" />
        <circle cx="520" cy="92" r="46" fill={BRASS} opacity=".22" />
        <circle cx="520" cy="92" r="28" fill={BRASS} opacity=".35" />
        {/* hills */}
        <path d="M0 250 C90 200 170 215 250 240 C330 262 390 205 470 212 C540 218 600 236 640 228 V440 H0z" fill="#d7e1cf" />
        <path d="M0 282 C110 250 210 268 320 276 C430 284 520 256 640 262 V440 H0z" fill="#c6d6bf" />
        <rect x="0" y="300" width="640" height="140" fill={SAND} />
        <rect x="0" y="300" width="640" height="140" fill="url(#field)" opacity=".5" />
        {/* CC road */}
        <path d="M-20 440 C140 380 220 350 330 342 C440 334 540 320 660 318 L660 350 C540 352 450 362 340 372 C230 382 170 410 90 460z" fill="#cfc2a0" />
        <path d="M20 432 C160 380 240 360 335 356 C440 350 540 338 650 334" stroke="#fbf7ec" strokeWidth="2.5" strokeDasharray="12 10" fill="none" />

        {/* school */}
        <g transform="translate(40 212)">
          <rect x="0" y="30" width="150" height="62" fill={PAPER} stroke={INK} strokeWidth="1.6" />
          <path d="M-8 32 L75 0 L158 32z" fill={FOREST} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
          {[14, 42, 94, 122].map((x) => <rect key={x} x={x} y="46" width="16" height="16" fill="#d8e6de" stroke={INK} strokeWidth="1.2" />)}
          <rect x="64" y="56" width="22" height="36" fill={BRASS} stroke={INK} strokeWidth="1.4" />
          <line x1="166" y1="92" x2="166" y2="18" stroke={INK} strokeWidth="1.6" />
          <path d="M166 18 L188 24 L166 30z" fill={BRASS} stroke={INK} strokeWidth="1.2" />
        </g>
        {/* community hall */}
        <g transform="translate(222 222)">
          <rect x="0" y="22" width="112" height="66" fill="#f3ead2" stroke={INK} strokeWidth="1.6" />
          <path d="M-6 24 L56 -4 L118 24z" fill={FOREST2} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M40 88 V62 a16 16 0 0 1 32 0 V88" fill={FOREST} stroke={INK} strokeWidth="1.4" />
          <circle cx="56" cy="38" r="7" fill={PAPER} stroke={INK} strokeWidth="1.2" />
          <rect x="10" y="44" width="18" height="14" fill="#d8e6de" stroke={INK} strokeWidth="1.2" /><rect x="84" y="44" width="18" height="14" fill="#d8e6de" stroke={INK} strokeWidth="1.2" />
        </g>
        {/* water tank + hand pump */}
        <g transform="translate(366 150)">
          <path d="M10 150 L22 58 M60 150 L48 58 M16 110 H54 M13 130 H57" stroke={INK} strokeWidth="1.6" fill="none" />
          <rect x="0" y="22" width="70" height="40" rx="6" fill="#dfe9e3" stroke={INK} strokeWidth="1.6" />
          <path d="M0 30 Q35 16 70 30" fill="none" stroke={INK} strokeWidth="1.2" />
          <rect x="8" y="10" width="54" height="14" rx="7" fill={FOREST} stroke={INK} strokeWidth="1.4" />
          <g transform="translate(86 118)"><rect x="0" y="10" width="8" height="24" fill={FOREST2} stroke={INK} strokeWidth="1.3" /><path d="M4 12 L26 2" stroke={INK} strokeWidth="2" strokeLinecap="round" /><path d="M8 20 h8 v6" stroke={INK} strokeWidth="1.3" fill="none" /></g>
        </g>
        {/* anganwadi */}
        <g transform="translate(486 250)">
          <rect x="0" y="22" width="78" height="50" fill={PAPER} stroke={INK} strokeWidth="1.6" />
          <path d="M-6 24 L39 0 L84 24z" fill={BRASS} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
          <rect x="30" y="42" width="18" height="30" fill={FOREST2} stroke={INK} strokeWidth="1.3" />
          <circle cx="15" cy="40" r="5" fill="#f2a33a" /><circle cx="63" cy="40" r="5" fill="#5fc28e" />
        </g>
        {/* solar lights along the road */}
        {[[168, 318], [300, 300], [440, 296], [600, 290]].map(([x, y]) => (
          <g key={x} transform={`translate(${x} ${y})`}>
            <line x1="0" y1="0" x2="0" y2="-62" stroke={INK} strokeWidth="1.6" />
            <rect x="-14" y="-74" width="22" height="10" rx="1.5" fill="#35507a" stroke={INK} strokeWidth="1.2" transform="rotate(-12 -3 -69)" />
            <circle cx="6" cy="-56" r="4" fill="#f6e3a2" stroke={INK} strokeWidth="1.1" />
          </g>
        ))}
        {/* bus shelter */}
        <g transform="translate(560 318)">
          <path d="M-8 0 H56 L50 -10 H-2z" fill={FOREST} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M0 0 V34 M48 0 V34 M-2 22 H50" stroke={INK} strokeWidth="1.5" />
        </g>
        {/* trees */}
        {[[208, 300, 18], [350, 296, 14], [616, 272, 16], [18, 296, 20]].map(([x, y, r]) => (
          <g key={x}><line x1={x} y1={y} x2={x} y2={y - r - 8} stroke={INK} strokeWidth="1.5" /><circle cx={x} cy={y - r - 12} r={r} fill={FOREST2} stroke={INK} strokeWidth="1.4" /></g>
        ))}

        {/* the scan */}
        <motion.g initial={{ x: -120 }} animate={{ x: 700 }} transition={{ duration: SWEEP, ease: "linear", repeat: Infinity }}>
          <rect x="-110" y="0" width="120" height="440" fill="url(#scan)" />
          <line x1="10" y1="0" x2="10" y2="440" stroke={BRASS} strokeWidth="2" />
          <circle cx="10" cy="22" r="5" fill={BRASS} />
        </motion.g>

        <Tag x={116} y={176} ok label="School · on track" delay={at(116)} />
        <Tag x={278} y={186} ok={false} label="Hall · paid ahead of work" delay={at(278)} />
        <Tag x={401} y={128} ok label="Water tank · photos ✓" delay={at(401)} />
        <Tag x={526} y={216} ok={false} label="Anganwadi · 2 sanctions?" delay={at(526)} />
        <Tag x={300} y={404} ok label="CC road · complete" delay={at(300)} />
      </g>
      <rect x="0.75" y="0.75" width="638.5" height="438.5" rx="25.5" fill="none" stroke="#d8ceb4" strokeWidth="1.5" />
    </svg>
  );
}
