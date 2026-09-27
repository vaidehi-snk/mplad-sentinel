// Sentinel's own icon set: 24px grid, 1.6 stroke, one brass accent per glyph.
// Drawn for this product — each icon depicts the actual check it stands for.
const Base = ({ size = 20, children, className, title, accent = "var(--icon-accent, #c9a24d)", style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
    className={className} style={{ "--a": accent, flexShrink: 0, ...style }} role={title ? "img" : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
    {children}
  </svg>
);
const A = { fill: "var(--a)", stroke: "none" };
const AS = { stroke: "var(--a)" };

// ---------- the checks ----------
export const ISanction = (p) => (
  <Base {...p}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 13 L12 5 A8 8 0 0 0 4.2 11.3 Z" {...A} opacity=".9" />
    <path d="M12 13l3.5 2" /><path d="M9.5 2.5h5" />
  </Base>
);
export const IDeadline = (p) => (
  <Base {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    <path d="M13.5 12.5l-2 3h2.5l-2 3" {...AS} strokeWidth="1.8" />
  </Base>
);
export const ICost = (p) => (
  <Base {...p}>
    <path d="M12 4v16M7 20h10M5 7h14" />
    <path d="M5 7l-2.5 6a3 3 0 0 0 5 0L5 7z" />
    <path d="M19 7l-2.5 6a3 3 0 0 0 5 0L19 7z" {...A} />
    <circle cx="12" cy="4" r="1.2" {...A} />
  </Base>
);
export const IPhoto = (p) => (
  <Base {...p}>
    <path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
    <path d="M3 21L21 4" {...AS} strokeWidth="2" />
  </Base>
);
export const IPayAhead = (p) => (
  <Base {...p}>
    <rect x="2.5" y="15" width="12" height="4" rx="2" />
    <rect x="2.5" y="15" width="6" height="4" rx="2" fill="currentColor" opacity=".25" />
    <circle cx="17.5" cy="8" r="4" {...A} />
    <path d="M16.2 6.6h2.6M16.2 8h2.6M17 6.6c1.4 0 1.4 2.8-.8 2.8l2 1.6" stroke="#fff" strokeWidth="1" />
  </Base>
);
export const IUnmarked = (p) => (
  <Base {...p}>
    <path d="M5 21V3.5" />
    <path d="M5 4h11l-2.5 3.5L16 11H5" />
    <rect x="13.5" y="14.5" width="6.5" height="6.5" rx="1.5" {...AS} strokeDasharray="2 1.6" />
  </Base>
);
export const IDuplicate = (p) => (
  <Base {...p}>
    <path d="M9 21s-5.5-5-5.5-9.5A5.5 5.5 0 0 1 14.5 11.5C14.5 16 9 21 9 21z" />
    <circle cx="9" cy="11.5" r="1.8" />
    <path d="M15 17.5s-4-3.6-4-7a4 4 0 0 1 8 0c0 3.4-4 7-4 7z" {...A} opacity=".92" />
  </Base>
);
export const IVendor = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="3.6" {...A} />
    <circle cx="4.5" cy="5" r="1.6" /><circle cx="19.5" cy="5" r="1.6" /><circle cx="4.5" cy="19" r="1.6" /><circle cx="19.5" cy="19" r="1.6" /><circle cx="12" cy="3" r="1.3" />
    <path d="M5.7 6.2l3.6 3.3M18.3 6.2l-3.6 3.3M5.7 17.8l3.6-3.3M18.3 17.8l-3.6-3.3M12 4.3v4.1" />
  </Base>
);
export const IOutlier = (p) => (
  <Base {...p}>
    <circle cx="6" cy="15" r="1.3" fill="currentColor" /><circle cx="9" cy="17.5" r="1.3" fill="currentColor" /><circle cx="8.5" cy="13" r="1.3" fill="currentColor" />
    <circle cx="11.5" cy="16" r="1.3" fill="currentColor" /><circle cx="5.5" cy="19" r="1.3" fill="currentColor" />
    <circle cx="18" cy="6" r="1.8" {...A} /><circle cx="18" cy="6" r="4" {...AS} strokeDasharray="2 1.7" />
  </Base>
);
export const IForecast = (p) => (
  <Base {...p}>
    <path d="M6 3h9M6 21h9M7 3c0 5 7 5 7 9s-7 4-7 9M14 3c0 5-7 5-7 9" />
    <path d="M15.5 14.5l3-3.5 3 2" {...AS} strokeWidth="1.8" />
    <path d="M21.5 13v-2.5H19" {...AS} strokeWidth="1.8" />
  </Base>
);

// cost bar pushed past its sanctioned mark
export const IOverrun = (p) => (
  <Base {...p}>
    <path d="M3 19h18" />
    <rect x="4" y="11" width="11" height="5" rx="1.5" />
    <path d="M15 13.5h4.5" {...AS} strokeWidth="5" strokeLinecap="butt" opacity=".9" />
    <path d="M15 7v12" strokeDasharray="1.8 1.6" />
    <path d="M17.5 5.5l2.5 2.5-2.5 2.5" {...AS} />
  </Base>
);
// a document with a struck-through clause
export const INotPermissible = (p) => (
  <Base {...p}>
    <path d="M6 3h8l4 4v14H6z" />
    <path d="M14 3v4h4" />
    <path d="M9 11h6M9 14.5h4" opacity=".55" />
    <circle cx="16.5" cy="17" r="4" {...AS} />
    <path d="M13.8 19.7l5.4-5.4" {...AS} />
  </Base>
);
// one block cut into three just below a line
export const ISplit = (p) => (
  <Base {...p}>
    <path d="M2.5 6.5h19" {...AS} strokeDasharray="2.2 1.8" />
    <rect x="3" y="9" width="5" height="11" rx="1.2" />
    <rect x="9.5" y="9" width="5" height="11" rx="1.2" />
    <rect x="16" y="9" width="5" height="11" rx="1.2" />
    <path d="M5.5 9V7.5M12 9V7.5M18.5 9V7.5" {...AS} />
  </Base>
);
// clock hand with an arrow climbing a level
export const IEscalate = (p) => (
  <Base {...p}>
    <circle cx="10" cy="13" r="7" />
    <path d="M10 9v4l2.5 1.5" />
    <path d="M17 4.5h4v4" {...AS} strokeWidth="1.9" />
    <path d="M21 4.5l-5 5" {...AS} strokeWidth="1.9" />
  </Base>
);
// bar chart with one spiking bar
export const ITrend = (p) => (
  <Base {...p}>
    <path d="M3 20h18" />
    <path d="M5 17v-3M8.5 17v-4M12 17v-3M19 17v-4" strokeWidth="2.2" />
    <path d="M15.5 17V5" {...AS} strokeWidth="2.6" />
  </Base>
);

export const CHECK_ICON = {
  SANCTION_45: ISanction, DEADLINE: IDeadline, COST: ICost, COST_OVERRUN: IOverrun, PHOTO: IPhoto, PAY_PROGRESS: IPayAhead,
  MARK_COMPLETE: IUnmarked, DUPLICATE: IDuplicate, SPLIT: ISplit, NOT_PERMISSIBLE: INotPermissible, VENDOR: IVendor, ML_OUTLIER: IOutlier, DELAY_RISK: IForecast,
};
// the order checks run in, everywhere they are listed
export const CHECK_ORDER = ["SANCTION_45", "DEADLINE", "COST", "COST_OVERRUN", "PHOTO", "PAY_PROGRESS", "MARK_COMPLETE", "DUPLICATE", "SPLIT", "NOT_PERMISSIBLE", "VENDOR", "ML_OUTLIER", "DELAY_RISK"];

// ---------- places & roles ----------
export const IToday = (p) => (
  <Base {...p}>
    <path d="M3 18h18M5.5 21h13" />
    <path d="M7 18a5 5 0 0 1 10 0" {...AS} />
    <path d="M12 6.5V9M5.6 9.6l1.7 1.7M18.4 9.6l-1.7 1.7M3 14h1.5M19.5 14H21" />
  </Base>
);
export const IAtlas = (p) => (
  <Base {...p}>
    <path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z" />
    <path d="M9 4v13.5M15 6.5V20" opacity=".5" />
    <circle cx="12" cy="11" r="2.4" {...A} />
  </Base>
);
export const ILedger = (p) => (
  <Base {...p}>
    <rect x="2.5" y="8" width="7" height="8" rx="2" />
    <rect x="14.5" y="8" width="7" height="8" rx="2" {...AS} />
    <path d="M9.5 12h5" strokeDasharray="1.6 1.6" />
    <path d="M5 11h2M17 11h2M5 13.5h2M17 13.5h2" opacity=".6" />
  </Base>
);
export const IMethod = (p) => (
  <Base {...p}>
    <path d="M12 5.5c-1.6-1-4-1.4-6-1v13c2 -.4 4.4 0 6 1 1.6-1 4-1.4 6-1v-13c-2-.4-4.4 0-6 1z" />
    <path d="M12 5.5v13" opacity=".5" />
    <path d="M7.5 8h2M7.5 10.5h2" {...AS} />
  </Base>
);
export const IRound = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" opacity=".35" />
    <path d="M12 3a9 9 0 0 1 8.5 6" {...AS} strokeWidth="2.2" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1.4" {...A} />
  </Base>
);
export const IMinistry = (p) => (
  <Base {...p}>
    <path d="M3 9.5L12 4l9 5.5" /><path d="M4.5 9.5h15" />
    <path d="M6.5 10v7M10 10v7M14 10v7M17.5 10v7" />
    <path d="M3.5 17.5h17v2.5h-17z" {...A} />
  </Base>
);
export const IState = (p) => (
  <Base {...p}>
    <path d="M7 3.5l5 1.5 3-1 3.5 3-1 4 2.5 3-3 3 .5 3.5-4.5.5-2.5 2-3-3.5-3.5-1 .5-4-2-3 2.5-2.5z" />
    <circle cx="12" cy="11.5" r="2" {...A} />
  </Base>
);
export const IDistrict = (p) => (
  <Base {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3.5" opacity=".45" />
    <path d="M12 18s-4.5-4-4.5-7.3a4.5 4.5 0 0 1 9 0C16.5 14 12 18 12 18z" />
    <circle cx="12" cy="10.6" r="1.6" {...A} />
  </Base>
);
export const IMP = (p) => (
  <Base {...p}>
    <circle cx="12" cy="6.5" r="3" />
    <path d="M6.5 21v-3.5a5.5 5.5 0 0 1 11 0V21" />
    <path d="M8.5 13.5h7l-1 7.5h-5z" {...A} />
  </Base>
);
export const ROLE_GLYPH = { ministry: IMinistry, state: IState, district: IDistrict, mp: IMP };

// ---------- status marks ----------
export const IStamp = (p) => (
  <Base {...p}>
    <path d="M9 3.5h6v4.5l2.5 3.5h-11L9 8z" />
    <rect x="4" y="11.5" width="16" height="4" rx="1.2" />
    <path d="M4.5 20h15" {...AS} strokeWidth="2.4" />
  </Base>
);
export const IPulse = (p) => (
  <Base {...p}>
    <path d="M2 12h4l2.5-6 4 13 3-9 1.5 2H22" />
  </Base>
);
export const IClear = (p) => (
  <Base {...p}>
    <path d="M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6z" />
    <path d="M8.5 12l2.5 2.5 4.5-5" {...AS} strokeWidth="2" />
  </Base>
);
