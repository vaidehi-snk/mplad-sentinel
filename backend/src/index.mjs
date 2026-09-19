import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import multer from "multer";
import Papa from "papaparse";
import {
  db,
  appendLedgerEntry,
  upsertWork,
  clearAllData,
  isRealData,
  markRealData,
} from "./db.mjs";
import {
  buildGroupStats,
  buildBatchCounts,
  buildDuplicateGroups,
  buildIsolationScores,
  scoreWork,
} from "../lib/riskScoring.js";
import { buildTrend, buildNetwork } from "../lib/analytics.js";
import { issueToken, requireAuth, requireRole, resolveScope, isInScope } from "./auth.mjs";

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 600 * 1024 * 1024 } });

const PORT = process.env.PORT || 4000;

function rowToWork(row) {
  return { ...row, reasons: JSON.parse(row.reasons) };
}

// ---- Auth ----
// Real login: validates the jurisdiction against what's actually loaded
// (so nobody can mint a token for a jurisdiction that doesn't exist),
// then issues a signed JWT carrying role + jurisdiction. Everything below
// that touches real data requires this token, and derives scope from it
// -- not from whatever the client's request claims.
app.post("/api/auth/login", (req, res) => {
  const { name, roleId, jurisdiction } = req.body || {};
  if (!name || !roleId) return res.status(400).json({ error: "name and roleId are required" });

  if (roleId !== "ministry") {
    const field = { mp: "constituency", district: "district", state: "state" }[roleId];
    if (!field) return res.status(400).json({ error: "Invalid role" });
    if (jurisdiction) {
      const exists = db.prepare(`SELECT 1 FROM works WHERE ${field} = ? LIMIT 1`).get(jurisdiction);
      if (!exists) return res.status(400).json({ error: `No data loaded for that ${field}` });
    }
  }

  try {
    const token = issueToken({ name, roleId, jurisdiction });
    res.json({ token, name, role: roleId, jurisdiction: roleId === "ministry" ? null : jurisdiction || null });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---- MP roster ----
// This is the actual point of a fraud-monitoring platform: an oversight
// official (Ministry/State/District) browsing ALL MPs, sorted by risk, and
// drilling into any one of them -- not each MP only ever seeing their own
// data. Scoped by state/district query params so District/State roles see
// only the MPs in their jurisdiction.
app.get("/api/mps", requireAuth, requireRole("district", "state", "ministry"), (req, res) => {
  const state = resolveScope(req, "state");
  const district = resolveScope(req, "district");
  let sql = "SELECT * FROM works WHERE 1=1";
  const params = [];
  if (state) { sql += " AND state = ?"; params.push(state); }
  if (district) { sql += " AND district = ?"; params.push(district); }
  const rows = db.prepare(sql).all(...params);

  const byMp = {};
  for (const row of rows) {
    const key = row.mp + "|" + row.constituency;
    const mp = (byMp[key] ||= {
      mp: row.mp,
      constituency: row.constituency,
      district: row.district,
      state: row.state,
      worksCount: 0,
      highRisk: 0,
      mediumRisk: 0,
      sanctioned: 0,
      maxScore: 0,
    });
    mp.worksCount += 1;
    mp.sanctioned += row.sanctioned;
    mp.maxScore = Math.max(mp.maxScore, row.score);
    if (row.level === "high") mp.highRisk += 1;
    if (row.level === "medium") mp.mediumRisk += 1;
  }

  const list = Object.values(byMp).sort((a, b) => b.maxScore - a.maxScore || b.highRisk - a.highRisk);
  res.json(list);
});

// ---- Jurisdictions ----
// Lets the login screen offer real choices instead of the app silently
// guessing a jurisdiction from whatever the first row happens to be.
app.get("/api/jurisdictions", (req, res) => {
  const rows = db.prepare("SELECT DISTINCT constituency, district, state FROM works").all();
  const constituencies = [...new Set(rows.map((r) => r.constituency).filter(Boolean))].sort();
  const districts = [...new Set(rows.map((r) => r.district).filter(Boolean))].sort();
  const states = [...new Set(rows.map((r) => r.state).filter(Boolean))].sort();
  res.json({ constituencies, districts, states });
});

// ---- National MP performance (free, real, from the government's own
// annual report -- NOT the per-work dataset, this is aggregate annual
// figures per MP: release, expenditure, works recommended/sanctioned/
// completed). Covers far more MPs than the per-work dataset currently
// does, at the cost of not having individual work-level detail.
let mpPerformanceCache = null;
function loadMpPerformance() {
  if (!mpPerformanceCache) {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const p = path.join(__dirname, "..", "data", "mpPerformance2016_17.json");
    mpPerformanceCache = JSON.parse(fs.readFileSync(p, "utf8"));
  }
  return mpPerformanceCache;
}

app.get("/api/mp-performance", requireAuth, (req, res) => {
  const { state } = req.query;
  const data = loadMpPerformance();
  const filtered = state ? data.filter((r) => r.state === state) : data;
  const sorted = [...filtered].sort((a, b) => b.concernScore - a.concernScore);
  res.json(sorted);
});

// ---- Status ----
// Lets the frontend show an honest "Real MPLADS data" vs "Demo data"
// badge based on what's actually in the database right now, not a
// bundled assumption.
app.get("/api/status", (req, res) => {
  const workCount = db.prepare("SELECT COUNT(*) AS c FROM works").get().c;
  const ledgerCount = db.prepare("SELECT COUNT(*) AS c FROM ledger").get().c;
  const distinctConstituencies = db.prepare("SELECT COUNT(DISTINCT constituency) AS c FROM works").get().c;
  res.json({
    realData: isRealData(),
    workCount,
    ledgerCount,
    distinctConstituencies,
    isSmallSample: isRealData() && workCount < 50,
  });
});

// ---- Works ----
// Supports scoping by state / district / constituency so the four
// dashboard roles (MP, District, State Nodal, Ministry) can all be served
// by the same endpoint with different query params.
app.get("/api/works", requireAuth, (req, res) => {
  const state = resolveScope(req, "state");
  const district = resolveScope(req, "district");
  const constituency = resolveScope(req, "constituency");
  let sql = "SELECT * FROM works WHERE 1=1";
  const params = [];
  if (state) { sql += " AND state = ?"; params.push(state); }
  if (district) { sql += " AND district = ?"; params.push(district); }
  if (constituency) { sql += " AND constituency = ?"; params.push(constituency); }
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map(rowToWork));
});

app.get("/api/works/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM works WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "not found" });
  if (!isInScope(req, row)) return res.status(403).json({ error: "Out of your jurisdiction" });
  const ledgerRows = db
    .prepare("SELECT * FROM ledger WHERE work = ? ORDER BY seq ASC")
    .all(req.params.id);
  res.json({ ...rowToWork(row), ledger: ledgerRows });
});

app.post("/api/works/:id/request-verification", requireAuth, (req, res) => {
  const work = db.prepare("SELECT * FROM works WHERE id = ?").get(req.params.id);
  if (!work) return res.status(404).json({ error: "not found" });
  if (!isInScope(req, work)) return res.status(403).json({ error: "Out of your jurisdiction" });
  const entry = appendLedgerEntry("FIELD_VERIFICATION_REQUESTED", req.params.id, req.auth.name || "Officer (via Sentinel UI)");
  res.json({ ok: true, entry });
});

// ---- Real trend + forecast ----
// Derived entirely from dateApproved + sanctioned in the works table.
// Honest about being a basic linear projection, not a trained model.
app.get("/api/trends", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM works").all().map(rowToWork);
  const result = buildTrend(rows);
  res.json(result);
});

// ---- Real contractor/work network ----
app.get("/api/network", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM works").all().map(rowToWork);
  const result = buildNetwork(rows);
  res.json(result);
});

// ---- Ledger ----

app.get("/api/ledger", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM ledger ORDER BY seq ASC").all();
  res.json(rows);
});

app.post("/api/ledger/verify", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM ledger ORDER BY seq ASC").all();
  let expectedPrev = "0".repeat(64);
  for (const row of rows) {
    if (row.prevHash !== expectedPrev) {
      return res.json({ verified: false, brokenAtSeq: row.seq, reason: "prevHash mismatch" });
    }
    const payload = JSON.stringify({
      action: row.action,
      work: row.work,
      actor: row.actor,
      prevHash: row.prevHash,
      createdAt: row.createdAt,
    });
    const recomputed = crypto.createHash("sha256").update(payload).digest("hex");
    if (recomputed !== row.hash) {
      return res.json({ verified: false, brokenAtSeq: row.seq, reason: "hash mismatch" });
    }
    expectedPrev = row.hash;
  }
  res.json({ verified: true, entriesChecked: rows.length });
});

// ---- Citizen reports ----

app.get("/api/citizen-reports", requireAuth, (req, res) => {
  const rows = db.prepare("SELECT * FROM citizen_reports ORDER BY id DESC").all();
  res.json(rows);
});

app.post("/api/citizen-reports", requireAuth, (req, res) => {
  const { work, note, status } = req.body;
  if (!work || !note || !status) return res.status(400).json({ error: "work, note and status are required" });
  const createdAt = new Date().toISOString();
  const result = db
    .prepare("INSERT INTO citizen_reports (work, note, status, createdAt) VALUES (?, ?, ?, ?)")
    .run(work, note, status, createdAt);
  if (status === "confirmed") {
    appendLedgerEntry("CITIZEN_VERIFIED", work, `Public Report #${result.lastInsertRowid}`);
  }
  res.json({ ok: true, id: result.lastInsertRowid });
});

// ---- Live data ingestion ----
// Lets an officer upload a real MPLADS CSV export straight through the UI
// and see it scored immediately, instead of requiring someone to run a
// CLI script beforehand. This replaces the entire dataset (works + ledger)
// with whatever's in the uploaded file.
app.post("/api/ingest", requireAuth, requireRole("district", "state", "ministry"), upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no file uploaded" });

  let parsed;
  try {
    parsed = Papa.parse(req.file.buffer.toString("utf8"), { header: true, skipEmptyLines: true });
  } catch (e) {
    return res.status(400).json({ error: "could not parse CSV: " + e.message });
  }

  const rows = parsed.data
    .map((r) => ({
      ...r,
      sanction_amount: Number(String(r.sanction_amount || "0").replace(/,/g, "")),
      state: (r.state || "").trim(),
      district: (r.nodal_district_per_source || r.district || r.constituency || "").trim(),
      constituency: (r.constituency || "").trim(),
      mp_name: (r.mp_name || "").trim(),
      work_name: (r.work_name || "").trim(),
      implementing_agency_name: (r.implementing_agency_name || "").trim(),
      unique_work_number: (r.unique_work_number || "").trim(),
    }))
    .filter((r) => r.sanction_amount > 0 && r.work_name);

  if (rows.length === 0) {
    return res.status(400).json({ error: "no valid rows found (check column names match the MPLADS export schema)" });
  }

  const stats = buildGroupStats(rows);
  const batchCounts = buildBatchCounts(rows);
  const duplicateCounts = buildDuplicateGroups(rows);
  const mlScores = buildIsolationScores(rows, stats, batchCounts);

  const works = rows.map((r, i) => {
    const result = scoreWork(r, stats, batchCounts, duplicateCounts, mlScores[i]);
    return {
      id: r.unique_work_number || `${r.state}-${r.constituency}-${i}`,
      name: r.work_name,
      constituency: r.constituency,
      district: r.district,
      state: r.state,
      mp: r.mp_name || "Unknown MP",
      contractor: r.implementing_agency_name,
      sanctioned: r.sanction_amount,
      utilized: r.sanction_amount,
      score: result.score,
      level: result.level,
      reasons: result.reasons,
      dateApproved: r.date_of_administrative_approval,
      lastUpdated: r.data_as_on || "",
    };
  });

  clearAllData();
  markRealData(true);
  // A transaction batches all these writes into one commit instead of one
  // fsync per row -- without this, ingesting tens of thousands of rows
  // takes minutes instead of seconds, which looks exactly like the app
  // hanging or doing nothing.
  db.exec("BEGIN TRANSACTION");
  try {
    for (const w of works) {
      upsertWork(w);
      appendLedgerEntry("FUND_RELEASED", w.id, "Live CSV Ingestion");
      if (w.level === "high" || w.level === "medium") {
        appendLedgerEntry("RISK_FLAGGED", w.id, "Sentinel Engine");
      }
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  const highRisk = works.filter((w) => w.level === "high").length;
  res.json({ ok: true, inserted: works.length, highRisk });
});

// Catches multer errors (oversized file, etc) and any other thrown errors
// as clean JSON instead of an HTML crash page the frontend can't parse.
app.use((err, req, res, next) => {
  console.error("Request error:", err.message);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large (limit is 600MB). Try filtering it down in Excel first." });
  }
  res.status(500).json({ error: err.message || "Something went wrong on the server." });
});

app.listen(PORT, () => {
  console.log(`MPLAD Sentinel API listening on http://localhost:${PORT}`);
});
