const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:4000";
const SESSION_KEY = "sentinel_session";

// Plain module, not a React hook, so it reads the token straight from
// storage rather than through context. Every authenticated request
// attaches it as a Bearer token; the backend is what actually enforces
// what that token is allowed to see.
function getToken() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw).token : null;
  } catch {
    return null;
  }
}

async function safeFetch(path, options = {}) {
  try {
    const token = getToken();
    const headers = { ...options.headers };
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch(API_BASE + path, { ...options, headers, signal: AbortSignal.timeout(20000) });
    if (!res.ok) throw new Error("Request failed: " + res.status);
    return await res.json();
  } catch {
    return null; // caller decides how to fall back
  }
}

export const api = {
  getEvidence: (id) => safeFetch(`/api/works/${encodeURIComponent(id)}/evidence`),
  saveReview: (id, decision, note) => safeFetch(`/api/works/${encodeURIComponent(id)}/reviews`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, note }),
  }),
  getReviews: () => safeFetch("/api/reviews"),
  getStatus: () => safeFetch("/api/status"),
  getJurisdictions: () => safeFetch("/api/jurisdictions"),
  getMpPerformance: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return safeFetch("/api/mp-performance" + (qs ? `?${qs}` : ""));
  },
  getMps: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return safeFetch("/api/mps" + (qs ? `?${qs}` : ""));
  },
  getTrends: () => safeFetch("/api/trends"),
  getNetwork: () => safeFetch("/api/network"),
  getWorks: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return safeFetch("/api/works" + (qs ? `?${qs}` : ""));
  },
  getWorkDetail: (id) => safeFetch(`/api/works/${encodeURIComponent(id)}`),
  requestFieldVerification: (id) =>
    safeFetch(`/api/works/${encodeURIComponent(id)}/request-verification`, { method: "POST" }),
  getLedger: () => safeFetch("/api/ledger"),
  verifyLedger: () => safeFetch("/api/ledger/verify", { method: "POST" }),
  getCitizenReports: () => safeFetch("/api/citizen-reports"),
  submitCitizenReport: (report) =>
    safeFetch("/api/citizen-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(report),
    }),
  ingestCsv: async (file) => {
    const form = new FormData();
    form.append("file", file);
    try {
      const token = getToken();
      const headers = token ? { Authorization: "Bearer " + token } : {};
      const res = await fetch(API_BASE + "/api/ingest", { method: "POST", body: form, headers });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || "Upload failed" };
      return data;
    } catch {
      return { ok: false, error: "Could not reach the backend API. Is it running?" };
    }
  },
};
