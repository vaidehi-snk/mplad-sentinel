// Sentinel API. Loads the demo dataset, runs the engine once at start-up, and serves
// role-scoped views. Review decisions and the hash-linked ledger persist in SQLite.
import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import jwt from "jsonwebtoken";
import { buildEngine, summarise, monthly, RULES } from "../engine/engine.mjs";
import { parseCaseQuery, applyCaseQuery } from "../lib/nlSearch.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, "..", "data", "demo", "works.json");
const raw = fs.readFileSync(DATA, "utf8");
const datasetDigest = crypto.createHash("sha256").update(raw).digest("hex");
const E = buildEngine(JSON.parse(raw));

// ---------- storage: decisions + hash-linked ledger ----------
const db = new DatabaseSync(process.env.SENTINEL_DB_PATH || path.join(__dirname, "..", "data", "sentinel-demo.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS decisions (id INTEGER PRIMARY KEY AUTOINCREMENT, work TEXT NOT NULL, decision TEXT NOT NULL,
    note TEXT NOT NULL, actor TEXT NOT NULL, role TEXT NOT NULL, createdAt TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS ledger (seq INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, work TEXT, actor TEXT NOT NULL,
    detail TEXT, prevHash TEXT NOT NULL, hash TEXT NOT NULL, createdAt TEXT NOT NULL);
`);
const entryHash = (e) => crypto.createHash("sha256").update(JSON.stringify([e.action, e.work, e.actor, e.detail, e.prevHash, e.createdAt])).digest("hex");
function appendLedger(action, work, actor, detail = "") {
  const last = db.prepare("SELECT hash FROM ledger ORDER BY seq DESC LIMIT 1").get();
  const e = { action, work: work || null, actor, detail, prevHash: last ? last.hash : "0".repeat(64), createdAt: new Date().toISOString() };
  e.hash = entryHash(e);
  db.prepare("INSERT INTO ledger (action, work, actor, detail, prevHash, hash, createdAt) VALUES (?,?,?,?,?,?,?)").run(e.action, e.work, e.actor, e.detail, e.prevHash, e.hash, e.createdAt);
  return e;
}
if (!db.prepare("SELECT 1 FROM ledger WHERE detail = ? LIMIT 1").get(datasetDigest)) {
  appendLedger("DATASET_LOADED", null, "Sentinel engine", datasetDigest);
  appendLedger("SCREENING_RUN", null, "Sentinel engine", `${E.works.length} works screened; ${E.works.filter((w) => w.level === "high").length} high-priority`);
}
const decisionsFor = (id) => db.prepare("SELECT decision, note, actor, role, createdAt FROM decisions WHERE work = ? ORDER BY id DESC").all(id);
const latestDecisions = () => new Map(db.prepare("SELECT work, decision, createdAt FROM decisions d WHERE id = (SELECT MAX(id) FROM decisions WHERE work = d.work)").all().map((r) => [r.work, r]));

// ---------- personas (demo roles; production would use NIC Parichay SSO) ----------
const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const C = E.constituencies;
const PERSONAS = {
  ministry: { label: "Ministry (MoSPI · CNA)", level: "India", options: ["India"] },
  state: { label: "State Nodal Authority", level: "state", options: [...new Set(C.map((c) => c.state))] },
  district: { label: "District Authority", level: "district", options: [...new Set(C.map((c) => c.district))] },
  mp: { label: "Member of Parliament", level: "constituency", options: C.map((c) => c.pc) },
};
function auth(req, res, next) {
  const t = (req.headers.authorization || "").replace(/^Bearer /, "");
  try { req.persona = jwt.verify(t, SECRET); next(); } catch { res.status(401).json({ error: "Choose a desk to continue" }); }
}

// scope = persona's jurisdiction, optionally narrowed (never widened) by drill-down query params
function scopeOf(req) {
  const p = req.persona, q = req.query;
  const f = { state: null, district: null, constituency: null };
  if (p.role === "state") f.state = p.jurisdiction;
  if (p.role === "district") f.district = p.jurisdiction;
  if (p.role === "mp") f.constituency = p.jurisdiction;
  if (p.role === "ministry" && q.state) f.state = q.state;
  if ((p.role === "ministry" || p.role === "state") && q.district) f.district = q.district;
  if (p.role !== "mp" && q.constituency) f.constituency = q.constituency;
  const inScope = (w) => (!f.state || w.state === f.state) && (!f.district || w.district === f.district) && (!f.constituency || w.constituency === f.constituency);
  // a narrowing param must still sit inside the persona's own jurisdiction
  const home = (w) => p.role === "ministry" || (p.role === "state" && w.state === p.jurisdiction) || (p.role === "district" && w.district === p.jurisdiction) || (p.role === "mp" && w.constituency === p.jurisdiction);
  const list = E.works.filter((w) => inScope(w) && home(w));
  const level = f.constituency ? "constituency" : f.district ? "district" : f.state ? "state" : "India";
  const label = f.constituency || f.district || f.state || "India";
  const crumbs = [{ level: "India", label: "India" }];
  const any = list[0];
  if (any && (f.state || f.district || f.constituency)) crumbs.push({ level: "state", label: any.state });
  if (any && (f.district || f.constituency)) crumbs.push({ level: "district", label: any.district });
  if (any && f.constituency) crumbs.push({ level: "constituency", label: any.constituency });
  return { list, f, level, label, crumbs };
}

// ---------- auto-escalation: a new serious case left unreviewed rises to the State desk ----------
// Cases flagged before go-live form the backlog worked through in rounds; the clock applies to new ones.
const SLA = { high: 21, medium: 30 };
const DAY = 86400000;
const daysBetween = (a, b) => Math.round((new Date(b.slice(0, 10) + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / DAY);
const plusDays = (s, n) => new Date(new Date(s + "T00:00:00Z").getTime() + n * DAY).toISOString().slice(0, 10);
function escalation(w, dec) {
  if (!w.openSince || w.openSince <= E.meta.goLive || !SLA[w.level] || dec?.has(w.id)) return null;
  const age = daysBetween(w.openSince, E.today), sla = SLA[w.level];
  return age > sla ? { stage: "state", age, sla, on: plusDays(w.openSince, sla) } : { stage: "district", age, sla, dueIn: sla - age };
}

const light = (w, dec) => ({
  id: w.id, title: w.title, lang: w.lang, category: w.category, categoryLabel: w.categoryLabel, state: w.state, district: w.district,
  constituency: w.constituency, fy: w.fy, sanctioned: w.sanctioned, estimate: w.estimate, status: w.status, progress: w.progress,
  level: w.level, score: w.score, deadline: w.deadline, delayRisk: w.delayRisk ?? null, implementingAgency: w.implementingAgency, vendor: w.vendor,
  signals: w.signals.map((s) => ({ code: s.code, severity: s.severity, title: s.title })), decision: dec?.get(w.id) || null, lat: w.lat, lng: w.lng,
  openSince: w.openSince, escalation: escalation(w, dec),
});
const byPriority = (a, b) => b.score - a.score || (b.sanctioned || 0) - (a.sanctioned || 0);

function breakdown(list, level) {
  const key = level === "India" ? "state" : level === "state" ? "district" : level === "district" ? "constituency" : null;
  if (!key) return [];
  const g = new Map();
  for (const w of list) { if (!g.has(w[key])) g.set(w[key], []); g.get(w[key]).push(w); }
  return [...g.entries()].map(([name, ws]) => {
    const s = summarise(E, ws);
    const pcs = new Set(ws.map((w) => w.constituency));
    return { name, key, works: ws.length, sanctionedCr: s.funnel.sanctioned.cr, completedCr: s.funnel.completed.cr, paidCr: s.funnel.paid.cr, high: s.levels.high, medium: s.levels.medium,
      atRiskCr: s.atRiskCr, sanctionWithin45: s.compliance.sanctionWithin45, onTime: s.compliance.onTimeCompletion, photo: s.compliance.photoCoverage, code: ws[0].stateCode,
      duplicates: ws.filter((w) => w.checks.DUPLICATE === "flag" && w.signals.some((x) => x.code === "DUPLICATE" && x.severity === "high")).length,
      vendors: E.vendorFlags.filter((v) => pcs.has(v.constituency)).length,
      early: ws.filter((w) => w.checks.DELAY_RISK === "flag").length,
      overdue: ws.filter((w) => w.checks.DEADLINE === "flag" && !w.completedOn).length,
      scst: E.compliance.filter((c) => pcs.has(c.constituency) && c.fy !== "2026-27" && (!c.scOk || !c.stOk)).length,
      overrun: ws.filter((w) => w.checks.COST_OVERRUN === "flag").length,
      notPermissible: ws.filter((w) => w.checks.NOT_PERMISSIBLE === "flag").length,
      splits: ws.filter((w) => w.checks.SPLIT === "flag").length,
      slowFunds: E.utilisation.filter((u) => pcs.has(u.constituency) && u.slow).length,
      bursts: E.trendAlerts.filter((t) => pcs.has(t.constituency)).length,
      lat: ws.reduce((a, w) => a + w.lat, 0) / ws.length, lng: ws.reduce((a, w) => a + w.lng, 0) / ws.length };
  }).sort((a, b) => b.high - a.high || b.atRiskCr - a.atRiskCr);
}

// ---------- app ----------
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/meta", (_req, res) => {
  res.json({
    asOf: E.today, meta: E.meta, datasetDigest, nationalContext: E.nationalContext, personas: PERSONAS,
    geo: C.map((c) => ({ pc: c.pc, district: c.district, state: c.state, code: c.code, reserved: c.reserved })),
    totals: { works: E.works.length, constituencies: C.length, states: PERSONAS.state.options.length, sanctionedCr: summarise(E, E.works).funnel.sanctioned.cr },
    evaluation: E.evaluation,
  });
});

app.post("/api/session", (req, res) => {
  const { role, jurisdiction, name } = req.body || {};
  const P = PERSONAS[role];
  if (!P) return res.status(400).json({ error: "Unknown role" });
  const j = role === "ministry" ? "India" : jurisdiction;
  if (!P.options.includes(j)) return res.status(400).json({ error: "Unknown jurisdiction" });
  const persona = { role, jurisdiction: j, label: P.label, name: String(name || "").slice(0, 60) || `${P.label} reviewer` };
  res.json({ token: jwt.sign(persona, SECRET, { expiresIn: "12h" }), persona });
});

app.get("/api/brief", auth, (req, res) => {
  const S = scopeOf(req);
  const dec = latestDecisions();
  const sum = summarise(E, S.list);
  const inScope = new Set(S.list.map((w) => w.constituency));
  res.json({
    scope: { level: S.level, label: S.label, crumbs: S.crumbs, filter: S.f },
    summary: sum,
    monthly: monthly(S.list),
    top: S.list.filter((w) => w.level === "high").sort(byPriority).slice(0, 8).map((w) => light(w, dec)),
    earlyWarnings: S.list.filter((w) => w.checks.DELAY_RISK === "flag").sort((a, b) => b.delayRisk - a.delayRisk).slice(0, 6).map((w) => light(w, dec)),
    breakdown: breakdown(S.list, S.level),
    vendorAlerts: E.vendorFlags.filter((v) => inScope.has(v.constituency)).map(({ ids, ...v }) => v),
    scst: E.compliance.filter((c) => inScope.has(c.constituency) && (!c.scOk || !c.stOk)).length,
    reviewed: S.list.filter((w) => dec.has(w.id)).length,
    escalation: (() => {
      const rows = S.list.map((w) => [w, escalation(w, dec)]).filter(([, e]) => e);
      const up = rows.filter(([, e]) => e.stage === "state"), due = rows.filter(([, e]) => e.stage === "district").sort((a, b) => a[1].dueIn - b[1].dueIn);
      return { sla: SLA, escalated: up.length, pending: due.length, dueThisWeek: due.filter(([, e]) => e.dueIn <= 7).length,
        items: [...up.sort((a, b) => b[1].age - a[1].age), ...due].slice(0, 6).map(([w]) => light(w, dec)) };
    })(),
    utilisation: E.utilisation.filter((u) => inScope.has(u.constituency)),
    trendAlerts: E.trendAlerts.filter((t) => inScope.has(t.constituency)),
    newChecks: { overrun: S.list.filter((w) => w.checks.COST_OVERRUN === "flag").length, notPermissible: S.list.filter((w) => w.checks.NOT_PERMISSIBLE === "flag").length, splits: S.list.filter((w) => w.checks.SPLIT === "flag").length },
    dots: S.list.filter((w) => w.lat).map((w) => [w.id, +w.lat.toFixed(3), +w.lng.toFixed(3), w.level, w.checks.DUPLICATE === "flag" ? 1 : 0, w.checks.DELAY_RISK === "flag" ? 1 : 0]),
    persona: req.persona,
  });
});

// Live pulse: real decisions from this session first, then a replay of recorded events from the last weeks of data.
app.get("/api/pulse", auth, (req, res) => {
  const S = scopeOf(req);
  const ids = new Set(S.list.map((w) => w.id));
  const since = new Date(new Date(E.today).getTime() - 180 * 86400000).toISOString().slice(0, 10);
  const ev = [];
  for (const w of S.list) {
    const place = `${w.district}`;
    if (w.sanctionedOn >= since) ev.push({ on: w.sanctionedOn, kind: "sanction", id: w.id, text: `Sanctioned ${w.categoryLabel.toLowerCase()}`, place, amount: w.sanctioned, flag: w.checks.SANCTION_45 === "flag" ? "45-day window missed" : null });
    for (const p of w.payments || []) if (p.on >= since) ev.push({ on: p.on, kind: "payment", id: w.id, text: `${p.stage}% stage payment released`, place, amount: p.amount, flag: !p.photo ? "no asset photo" : w.checks.PAY_PROGRESS === "flag" && p.stage === w.payments.at(-1).stage ? "paid ahead of progress" : null });
    if (w.markedCompleteOn >= since) ev.push({ on: w.markedCompleteOn, kind: "complete", id: w.id, text: `${w.categoryLabel} marked complete`, place, amount: w.sanctioned, flag: null });
    if (w.recommendedOn >= since && !w.sanctionedOn) ev.push({ on: w.recommendedOn, kind: "recommend", id: w.id, text: `New recommendation · ${w.categoryLabel.toLowerCase()}`, place, amount: w.estimate, flag: null });
  }
  ev.sort((a, b) => b.on.localeCompare(a.on) || (b.flag ? 1 : 0) - (a.flag ? 1 : 0));
  const live = db.prepare("SELECT work, decision, actor, role, createdAt FROM decisions ORDER BY id DESC LIMIT 20").all().filter((d) => ids.has(d.work))
    .map((d) => ({ on: d.createdAt, kind: "decision", id: d.work, text: DECISIONS[d.decision], place: E.byId.get(d.work)?.district, actor: d.actor, live: true }));
  res.json({ asOf: E.today, screened: S.list.length, events: [...live, ...ev.slice(0, 40)] });
});

app.get("/api/cases", auth, (req, res) => {
  const S = scopeOf(req);
  const dec = latestDecisions();
  const { level, signal, q, status, review, sort = "priority" } = req.query;
  const page = Math.max(1, +req.query.page || 1), size = Math.min(100, Math.max(5, +req.query.size || 25));
  let list = S.list;
  const facets = { level: {}, signal: {} };
  list.forEach((w) => { facets.level[w.level] = (facets.level[w.level] || 0) + 1; w.signals.forEach((s) => (facets.signal[s.code] = (facets.signal[s.code] || 0) + 1)); });
  if (level) list = list.filter((w) => level.split(",").includes(w.level));
  if (signal) list = list.filter((w) => w.signals.some((s) => s.code === signal));
  if (status) list = list.filter((w) => w.status === status);
  if (review === "open") list = list.filter((w) => !dec.has(w.id));
  if (review === "done") list = list.filter((w) => dec.has(w.id));
  if (req.query.escalated) list = list.filter((w) => escalation(w, dec)?.stage === "state");
  if (req.query.clock) list = list.filter((w) => escalation(w, dec));
  if (q) { list = applyCaseQuery(list, parseCaseQuery(q)); }
  const clockRank = (w) => { const e = escalation(w, dec); return !e ? 0 : e.stage === "state" ? 3 : e.dueIn <= 7 ? 2 : 1; };
  const sorters = { round: (a, b) => clockRank(b) - clockRank(a) || byPriority(a, b), priority: byPriority, amount: (a, b) => (b.sanctioned || 0) - (a.sanctioned || 0), recent: (a, b) => (b.sanctionedOn || b.recommendedOn).localeCompare(a.sanctionedOn || a.recommendedOn), deadline: (a, b) => (a.deadline || "9").localeCompare(b.deadline || "9") };
  list = [...list].sort(sorters[sort] || byPriority);
  res.json({ scope: { level: S.level, label: S.label, crumbs: S.crumbs }, total: list.length, page, size, facets, items: list.slice((page - 1) * size, page * size).map((w) => light(w, dec)) });
});

app.get("/api/cases/:id", auth, (req, res) => {
  const S = scopeOf({ ...req, query: {} });
  const w = E.byId.get(req.params.id);
  if (!w || !S.list.includes(w)) return res.status(404).json({ error: "Work not found in your jurisdiction" });
  const pairWork = w.signals.find((s) => s.pair) ? E.byId.get(w.signals.find((s) => s.pair).pair) : null;
  const { truth, ...pub } = w;
  const group = w.signals.find((s) => s.group)?.group;
  res.json({
    work: { ...pub, escalation: escalation(w, latestDecisions()) }, rules: RULES,
    splitGroup: group ? group.map((id) => light(E.byId.get(id))) : null,
    decisions: decisionsFor(w.id),
    ledger: db.prepare("SELECT seq, action, actor, detail, hash, prevHash, createdAt FROM ledger WHERE work = ? ORDER BY seq").all(w.id),
    pair: pairWork ? (({ truth: _t, ...p }) => p)(pairWork) : null,
    siblings: E.works.filter((o) => o.vendor === w.vendor && o.constituency === w.constituency && o.id !== w.id).slice(0, 8).map((o) => light(o)),
    asOf: E.today,
  });
});

const DECISIONS = { escalate: "Escalated to District Authority", evidence: "Evidence requested", explained: "Explanation accepted", cleared: "Cleared — no issue" };
app.post("/api/cases/:id/decision", auth, (req, res) => {
  const w = E.byId.get(req.params.id);
  const { decision, note } = req.body || {};
  if (!w) return res.status(404).json({ error: "Unknown work" });
  if (req.persona.role === "mp") return res.status(403).json({ error: "MPs can view and comment, but decisions are recorded by the reviewing authority" });
  if (!DECISIONS[decision]) return res.status(400).json({ error: "Unknown decision" });
  if (typeof note !== "string" || note.trim().length < 10) return res.status(400).json({ error: "Add a note of at least 10 characters" });
  const createdAt = new Date().toISOString();
  db.prepare("INSERT INTO decisions (work, decision, note, actor, role, createdAt) VALUES (?,?,?,?,?,?)").run(w.id, decision, note.trim(), req.persona.name, req.persona.label, createdAt);
  const entry = appendLedger(`DECISION_${decision.toUpperCase()}`, w.id, `${req.persona.name} · ${req.persona.label}`, note.trim());
  res.json({ ok: true, decision: { decision, label: DECISIONS[decision], note: note.trim(), createdAt }, ledger: entry });
});

app.get("/api/compliance", auth, (req, res) => {
  const S = scopeOf(req);
  const inScope = new Set(S.list.map((w) => w.constituency));
  const live = S.list.filter((w) => w.sanctionedOn && w.status !== "rejected");
  const lagHist = Array.from({ length: 10 }, (_, i) => ({ bucket: i < 9 ? `${i * 15}–${i * 15 + 14}` : "135+", from: i * 15, n: 0 }));
  live.forEach((w) => { if (w.sanctionLag != null) lagHist[Math.min(9, Math.floor(w.sanctionLag / 15))].n++; });
  res.json({
    scope: { level: S.level, label: S.label, crumbs: S.crumbs },
    summary: summarise(E, S.list).compliance,
    lagHistogram: lagHist,
    scst: E.compliance.filter((c) => inScope.has(c.constituency)),
    byUnit: breakdown(S.list, S.level).map((b) => ({ name: b.name, sanctionWithin45: b.sanctionWithin45, onTime: b.onTime, works: b.works })),
    photo: { payments: live.flatMap((w) => w.payments).length, missing: live.flatMap((w) => w.payments).filter((p) => !p.photo).length },
    overdue: live.filter((w) => w.checks.DEADLINE === "flag" && !w.completedOn).length,
    unmarked: live.filter((w) => w.checks.MARK_COMPLETE === "flag").length,
    notPermissible: S.list.filter((w) => w.checks.NOT_PERMISSIBLE === "flag").map((w) => ({ ...light(w), matched: w.signals.find((x) => x.code === "NOT_PERMISSIBLE").evidence })),
    overruns: live.filter((w) => w.checks.COST_OVERRUN === "flag").map((w) => ({ ...light(w), approvedCost: w.approvedCost, paidTotal: w.paidTotal, overrun: w.overrun })).sort((a, b) => b.overrun - a.overrun),
    utilisation: E.utilisation.filter((u) => inScope.has(u.constituency)),
  });
});

app.get("/api/duplicates", auth, (req, res) => {
  const S = scopeOf(req);
  const ids = new Set(S.list.map((w) => w.id));
  const strip = ({ truth, checks, signals, ...p }) => p;
  res.json({ pairs: E.pairs.filter((p) => ids.has(p.a) || ids.has(p.b)).map((p) => ({ ...p, first: strip(E.byId.get(p.a)), second: strip(E.byId.get(p.b)) })) });
});

app.get("/api/vendors", auth, (req, res) => {
  const S = scopeOf(req);
  const inScope = new Set(S.list.map((w) => w.constituency));
  const flagged = new Set(E.vendorFlags.map((v) => `${v.constituency}|${v.vendor}`));
  const rows = E.vendorStats.filter((v) => inScope.has(v.constituency)).map(({ ids, ...v }) => ({ ...v, flagged: flagged.has(`${v.constituency}|${v.vendor}`),
    signals: ids.reduce((n, id) => n + (E.byId.get(id).level === "high" ? 1 : 0), 0) })).sort((a, b) => b.share - a.share);
  const ids = new Set(S.list.map((w) => w.id));
  res.json({ rows, splitGroups: E.splitGroups.filter((g) => ids.has(g[0])).map((g) => g.map((id) => light(E.byId.get(id)))) });
});

app.get("/api/trends", auth, (req, res) => {
  const S = scopeOf(req);
  const dec = latestDecisions();
  const open = S.list.filter((w) => w.sanctionedOn && !w.completedOn && w.status !== "rejected");
  const horizon = open.filter((w) => w.deadline > E.today && w.deadline <= "2026-12-31");
  res.json({
    monthly: monthly(S.list),
    forecast: { dueSoon: horizon.length, likelyLate: horizon.filter((w) => (w.delayRisk || 0) >= 0.4).length, items: horizon.sort((a, b) => (b.delayRisk || 0) - (a.delayRisk || 0)).slice(0, 12).map((w) => light(w, dec)) },
    byCategory: Object.values(S.list.reduce((m, w) => { const r = m[w.category] || { category: w.categoryLabel, works: 0, cr: 0, high: 0 }; r.works++; r.cr += (w.sanctioned || 0) / 1e7; r.high += w.level === "high" ? 1 : 0; m[w.category] = r; return m; }, {})).sort((a, b) => b.cr - a.cr),
    model: E.evaluation.model,
    trendAlerts: E.trendAlerts.filter((t) => S.list.some((w) => w.constituency === t.constituency)),
    splitGroups: E.splitGroups.filter((g) => S.list.some((w) => w.id === g[0])).map((g) => g.map((id) => light(E.byId.get(id)))),
  });
});

app.get("/api/method", (_req, res) => {
  res.json({ rules: RULES, evaluation: E.evaluation, meta: E.meta, datasetDigest, nationalContext: E.nationalContext,
    fields: ["id", "title", "category", "unit", "quantity", "state", "district", "constituency", "implementingAgency", "vendor", "scArea", "stArea", "lat", "lng", "estimate", "sanctioned", "revisions[on, from, to, reason]", "recommendedOn", "sanctionedOn", "deadline", "extension", "status", "progress", "payments[stage, amount, on, photo]", "completedOn", "markedCompleteOn", "ucUploaded"] });
});

app.get("/api/ledger", auth, (_req, res) => {
  res.json({ entries: db.prepare("SELECT seq, action, work, actor, detail, hash, prevHash, createdAt FROM ledger ORDER BY seq DESC LIMIT 200").all() });
});
app.post("/api/ledger/verify", auth, (_req, res) => {
  const rows = db.prepare("SELECT * FROM ledger ORDER BY seq").all();
  let prev = "0".repeat(64);
  for (const r of rows) {
    if (r.prevHash !== prev || entryHash(r) !== r.hash) return res.json({ ok: false, brokenAt: r.seq, checked: rows.length });
    prev = r.hash;
  }
  res.json({ ok: true, checked: rows.length, head: prev });
});

const PORT = process.env.PORT || 4000;
if (process.env.NODE_ENV !== "test") app.listen(PORT, "0.0.0.0", () => console.log(`Sentinel API on port ${PORT} — ${E.works.length} works screened`));
export { app, E };
