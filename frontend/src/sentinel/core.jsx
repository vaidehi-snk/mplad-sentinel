import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

// ---------- API ----------
const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:4000";
const KEY = "sentinel.desk";

export async function call(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  const t = token ?? readDesk()?.token;
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(API + path, body ? { method, headers, body: JSON.stringify(body) } : { method, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Request failed (${res.status})`), { status: res.status });
  return data;
}
function readDesk() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }

// ---------- desk (role session) ----------
const DeskCtx = createContext(null);
export function DeskProvider({ children }) {
  const [desk, setDesk] = useState(readDesk);
  const [meta, setMeta] = useState(null);
  const [picker, setPicker] = useState(false);
  useEffect(() => { call("/api/meta").then(setMeta).catch(() => setMeta({ offline: true })); }, []);
  const open = useCallback(async (role, jurisdiction, name) => {
    const r = await call("/api/session", { method: "POST", body: { role, jurisdiction, name }, token: "" });
    localStorage.setItem(KEY, JSON.stringify(r));
    setDesk(r); setPicker(false);
    return r;
  }, []);
  const leave = useCallback(() => { localStorage.removeItem(KEY); setDesk(null); }, []);
  const value = useMemo(() => ({ desk, meta, open, leave, picker, setPicker }), [desk, meta, open, leave, picker]);
  return <DeskCtx.Provider value={value}>{children}</DeskCtx.Provider>;
}
export const useDesk = () => useContext(DeskCtx);

// ---------- data hook, scoped by the URL's drill-down params ----------
export function useScopeQuery() {
  const [sp] = useSearchParams();
  const q = new URLSearchParams();
  for (const k of ["state", "district", "constituency"]) if (sp.get(k)) q.set(k, sp.get(k));
  return q.toString();
}
export function useApi(path, deps = []) {
  const { desk, leave } = useDesk();
  const [state, set] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    if (!path) { set({ data: null, error: null, loading: false }); return undefined; }
    set((s) => ({ ...s, loading: true }));
    call(path)
      .then((data) => live && set({ data, error: null, loading: false }))
      .catch((error) => { if (!live) return; if (error.status === 401) leave(); set({ data: null, error, loading: false }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, desk?.token, tick, ...deps]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

// ---------- formatting (Indian conventions) ----------
export const crore = (cr, d = 1) => (cr == null ? "—" : cr >= 100 ? `₹${Math.round(cr).toLocaleString("en-IN")} cr` : `₹${cr.toFixed(d)} cr`);
export const rupees = (v) => {
  if (v == null) return "—";
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
};
export const int = (n) => (n == null ? "—" : Math.round(n).toLocaleString("en-IN"));
export const pct = (x, d = 0) => (x == null ? "—" : `${(x * 100).toFixed(d)}%`);
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const date = (s) => { if (!s) return "—"; const [y, m, d] = s.slice(0, 10).split("-"); return `${+d} ${MON[+m - 1]} ${y}`; };
export const month = (s) => { const [y, m] = s.split("-"); return `${MON[+m - 1]} ’${y.slice(2)}`; };
export const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

export const LEVEL_LABEL = { high: "High", medium: "Medium", watch: "Watch", clear: "Clear", incomplete: "Can’t assess", na: "Can’t assess" };
export const DECISION_LABEL = { escalate: "Escalated", evidence: "Evidence requested", explained: "Explained", cleared: "Cleared" };
export const ROLE_SHORT = { ministry: "Ministry", state: "State Nodal", district: "District", mp: "MP" };
