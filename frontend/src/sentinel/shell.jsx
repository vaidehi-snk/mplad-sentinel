import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Search, ArrowRight, X, CornerDownLeft, BookOpen, ListOrdered } from "lucide-react";
import { call, useDesk, ROLE_SHORT, rupees, int } from "./core";
import { Sev } from "./ui";
import { IToday, IAtlas, ILedger, IMethod, IRound, ROLE_GLYPH } from "./icons";

export function Mark({ className = "brand-mark" }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#14452f" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="#c9a24d" strokeWidth="1.4" strokeDasharray="2 1.6" className="mark-ring" />
      <path d="M10.5 12.5h11M10.5 16h8M10.5 19.5h11" stroke="#f3eee0" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="21.6" cy="16" r="2" fill="#c9a24d" />
    </svg>
  );
}

const NAV = [
  { to: "/desk", label: "Today", icon: IToday, end: true },
  { to: "/desk/atlas", label: "Atlas", icon: IAtlas },
  { to: "/desk/ledger", label: "Ledger", icon: ILedger },
  { to: "/desk/method", label: "Method", icon: IMethod },
];
export const ROLE_ICON = ROLE_GLYPH;
const ease = [0.2, 0.7, 0.2, 1];

export function Shell() {
  const { desk, setPicker } = useDesk();
  const [palette, setPalette] = useState(false);
  const [screened, setScreened] = useState(null);
  const loc = useLocation();
  const nav = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
      if (e.target.closest?.("input, textarea, select")) return;
      if (e.key === "g" && !e.ctrlKey) window.__g = Date.now();
      else if (window.__g && Date.now() - window.__g < 800) {
        const to = { t: "/desk", a: "/desk/atlas", l: "/desk/ledger", r: "/desk/round" }[e.key];
        if (to) nav(to);
        window.__g = 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav]);
  useEffect(() => { call("/api/pulse").then((r) => setScreened(r.screened)).catch(() => {}); }, [desk?.token]);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);

  const p = desk.persona;
  const Glyph = ROLE_GLYPH[p.role];
  const inRound = loc.pathname.startsWith("/desk/round");
  const inAtlas = loc.pathname.startsWith("/desk/atlas");
  return (
    <div className={`app${inAtlas ? " app-dark" : ""}`}>
      {!inRound && (
        <header className="dock-wrap">
          <div className="dock-inner">
            <Link to="/desk" className="brand">
              <Mark />
              <span><span className="brand-name">Sentinel</span><span className="brand-sub">MPLADS oversight</span></span>
            </Link>
            <nav className="dock" aria-label="Primary">
              {NAV.map((t) => (
                <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `dock-item${isActive ? " on" : ""}`}>
                  {({ isActive }) => (
                    <>
                      {isActive && <motion.span layoutId="dock-pill" className="dock-pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                      <t.icon size={17} /><span>{t.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
              <Link to="/desk/round" className="dock-cta"><IRound size={17} /><span>Start round</span></Link>
            </nav>
            <div className="top-right">
              <span className="live-chip" title="Every work in your jurisdiction is re-screened whenever its record changes">
                <span className="live-dot" /><span>Live</span><span className="muted tnum">{screened ? `${int(screened)} works` : "…"}</span>
              </span>
              <button className="icon-btn" onClick={() => setPalette(true)} aria-label="Search (Ctrl+K)" title="Search · Ctrl K"><Search size={17} /></button>
              <button className="nameplate" onClick={() => setPicker(true)} title="Switch desk">
                <span className="seal"><Glyph size={16} accent="#14452f" /></span>
                <span style={{ textAlign: "left" }}><b>{ROLE_SHORT[p.role]} desk</b><small>{p.jurisdiction}</small></span>
              </button>
            </div>
          </div>
        </header>
      )}
      <AnimatePresence mode="wait">
        <motion.main key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.28, ease }}>
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <AnimatePresence>{palette && <Palette onClose={() => setPalette(false)} />}</AnimatePresence>
    </div>
  );
}

const GO = [
  { to: "/desk", label: "Today", icon: IToday },
  { to: "/desk/round", label: "Start my review round", icon: IRound },
  { to: "/desk/atlas", label: "Atlas", icon: IAtlas },
  { to: "/desk/cases", label: "All cases", icon: ListOrdered },
  { to: "/desk/ledger", label: "Ledger", icon: ILedger },
  { to: "/desk/method", label: "How Sentinel works", icon: BookOpen },
];

function Palette({ onClose }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    if (!q.trim()) { setItems([]); return; }
    const t = setTimeout(() => call(`/api/cases?q=${encodeURIComponent(q)}&size=8`).then((r) => { setItems(r.items); setSel(0); }).catch(() => {}), 140);
    return () => clearTimeout(t);
  }, [q]);
  const pages = GO.filter((t) => !q || t.label.toLowerCase().includes(q.toLowerCase()));
  const all = [...items.map((w) => ({ kind: "work", w })), ...pages.map((t) => ({ kind: "page", t }))];
  const go = (it) => { onClose(); nav(it.kind === "work" ? `/desk/cases/${encodeURIComponent(it.w.id)}` : it.t.to); };
  const onKey = (e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(all.length - 1, s + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    if (e.key === "Enter" && all[sel]) go(all[sel]);
  };
  return (
    <motion.div className="overlay" onMouseDown={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="palette" role="dialog" aria-label="Search" onMouseDown={(e) => e.stopPropagation()}
        initial={{ y: -14, scale: 0.98, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -8, opacity: 0 }} transition={{ type: "spring", stiffness: 420, damping: 32 }}>
        <div style={{ display: "flex", alignItems: "center", paddingLeft: 18 }}>
          <Search size={18} className="muted" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search a work ID, place, vendor… or jump anywhere" />
          <button className="btn btn-ghost" onClick={onClose} aria-label="Close" style={{ marginRight: 8 }}><X size={16} /></button>
        </div>
        <ul>
          {items.length > 0 && <li className="group label">Works</li>}
          {all.map((it, i) => (
            <li key={it.kind === "work" ? it.w.id : it.t.to}>
              {i === items.length && <div className="group label">Go to</div>}
              <button aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => go(it)}>
                {it.kind === "work" ? (
                  <>
                    <Sev level={it.w.level} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span lang={it.w.lang} style={{ display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500 }}>{it.w.title}</span>
                      <span className="mono muted" style={{ fontSize: 11.5 }}>{it.w.id} · {it.w.district} · {rupees(it.w.sanctioned)}</span>
                    </span>
                  </>
                ) : (<><it.t.icon size={17} /><span style={{ flex: 1 }}>{it.t.label}</span></>)}
                {i === sel && <CornerDownLeft size={14} className="muted" />}
              </button>
            </li>
          ))}
          {q && !all.length && <li className="empty">Nothing matches “{q}” in your jurisdiction.</li>}
        </ul>
        <div className="palette-foot"><span><span className="kbd">↑↓</span> move</span><span><span className="kbd">↵</span> open</span><span><span className="kbd">g</span> then <span className="kbd">t</span>/<span className="kbd">a</span>/<span className="kbd">l</span>/<span className="kbd">r</span> jump</span></div>
      </motion.div>
    </motion.div>
  );
}

// Choose a desk: one click per role. No passwords in the demo; production maps roles from NIC Parichay SSO.
const DESKS = [
  { role: "ministry", title: "Ministry", who: "MoSPI · Central Nodal Agency", does: "The national picture, states side by side, where money is stuck." },
  { role: "state", title: "State Nodal Authority", who: "State nodal department", does: "Districts compared, compliance slipping, vendor patterns." },
  { role: "district", title: "District Authority", who: "Sanctions and monitors works", does: "A short weekly round of cases, with evidence to decide on." },
  { role: "mp", title: "Member of Parliament", who: "Recommends works", does: "How your recommendations are moving — and what is stuck." },
];
export function DeskChooser({ compact = false, onDone }) {
  const { meta, open } = useDesk();
  const [busy, setBusy] = useState(null);
  const [err, setErr] = useState(null);
  const nav = useNavigate();
  const P = meta?.personas;
  const [pick, setPick] = useState({ state: "Maharashtra", district: "Nashik", mp: "Nashik" });
  if (!P) return <div className="muted">{meta?.offline ? "The Sentinel API is not reachable. Start the backend and reload." : "Loading desks…"}</div>;
  const go = async (role) => {
    setBusy(role); setErr(null);
    try { await open(role, pick[role]); onDone?.(); nav("/desk"); } catch (e) { setErr(e.message); } finally { setBusy(null); }
  };
  return (
    <div className="desks" data-compact={compact || undefined}>
      {DESKS.map((d, i) => {
        const Glyph = ROLE_GLYPH[d.role];
        return (
          <motion.div className="desk-card" key={d.role} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 * i, duration: 0.4, ease }}
            whileHover={{ y: -4 }}>
            <div className="desk-icon"><Glyph size={22} accent="#c9a24d" /></div>
            <div className="desk-title">{d.title}</div>
            <div className="muted" style={{ fontSize: 12.5 }}>{d.who}</div>
            {!compact && <p className="desk-does">{d.does}</p>}
            <div className="desk-foot">
              {d.role === "ministry" ? <span className="chip">All India</span> : (
                <select aria-label={`${d.title} jurisdiction`} value={pick[d.role]} onChange={(e) => setPick({ ...pick, [d.role]: e.target.value })}>
                  {P[d.role].options.map((o) => <option key={o}>{o}</option>)}
                </select>
              )}
              <button className="btn btn-primary" onClick={() => go(d.role)} disabled={!!busy}>
                {busy === d.role ? "Opening…" : "Enter"} <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        );
      })}
      {err && <div style={{ color: "var(--high)", gridColumn: "1/-1" }}>{err}</div>}
    </div>
  );
}

export function DeskDialog() {
  const { picker, setPicker, leave } = useDesk();
  const nav = useNavigate();
  return (
    <AnimatePresence>
      {picker && (
        <motion.div className="overlay" onMouseDown={() => setPicker(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="card" style={{ width: "min(1040px, 94vw)", padding: 26 }} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Switch desk"
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} transition={{ type: "spring", stiffness: 380, damping: 32 }}>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 18 }}>
              <div>
                <div className="eyebrow">Switch desk</div>
                <div className="h2">Same data, another role’s view</div>
              </div>
              <button className="btn btn-ghost" style={{ marginLeft: "auto" }} onClick={() => { leave(); setPicker(false); nav("/"); }}>Leave demo</button>
              <button className="btn btn-ghost" onClick={() => setPicker(false)} aria-label="Close"><X size={16} /></button>
            </div>
            <DeskChooser compact onDone={() => setPicker(false)} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
