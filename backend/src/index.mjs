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

import { assessWorks, evidencePacket } from "../lib/evidence.js";

const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const PORT = process.env.PORT || 4000;


app.post("/api/auth/login", (req, res) => {
  const { name, roleId, jurisdiction } = req.body || {};
  if (typeof name !== "string" || !name.trim() || name.length > 120 || !roleId) return res.status(400).json({ error: "name and roleId are required" });

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

app.get("/api/mps", requireAuth, requireRole("district", "state", "ministry"), (req, res) => {
  const state = resolveScope(req, "state");
  const district = resolveScope(req, "district");
  let sql = "SELECT * FROM works WHERE 1=1";
  const params = [];
  if (state) { sql += " AND state = ?"; params.push(state); }
  if (district) { sql += " AND district = ?"; params.push(district); }
  const rows = assessWorks(db.prepare(sql).all(...params));

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

app.get("/api/jurisdictions", (req, res) => {
  const rows = db.prepare("SELECT DISTINCT constituency, district, state FROM works").all();
  const constituencies = [...new Set(rows.map((r) => r.constituency).filter(Boolean))].sort();
  const districts = [...new Set(rows.map((r) => r.district).filter(Boolean))].sort();
  const states = [...new Set(rows.map((r) => r.state).filter(Boolean))].sort();
  res.json({ constituencies, districts, states });
});

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
  if (req.auth.role !== "ministry" && req.auth.role !== "state") return res.status(403).json({ error: "Historical aggregates are available to state and ministry demo roles only" });
  const effectiveState = req.auth.role === "state" ? req.auth.jurisdiction : state;
  const filtered = effectiveState ? data.filter((r) => r.state === effectiveState) : data;
  const sorted = [...filtered].sort((a, b) => b.concernScore - a.concernScore);
  res.json(sorted);
});

app.get("/api/status", (req, res) => {
  const workCount = db.prepare("SELECT COUNT(*) AS c FROM works").get().c;
  const ledgerCount = db.prepare("SELECT COUNT(*) AS c FROM ledger").get().c;
  const distinctConstituencies = db.prepare("SELECT COUNT(DISTINCT constituency) AS c FROM works").get().c;
  res.json({
    realData: false,
    provenance: "Bundled historical sample or user-supplied import; not independently verified",
    workCount,
    ledgerCount,
    distinctConstituencies,
    isSmallSample: workCount < 50,
  });
});

app.get("/api/works", requireAuth, (req, res) => {
  const state = resolveScope(req, "state");
  const district = resolveScope(req, "district");
  const constituency = resolveScope(req, "constituency");
  let sql = "SELECT * FROM works WHERE 1=1";
  const params = [];
  if (state) { sql += " AND state = ?"; params.push(state); }
  if (district) { sql += " AND district = ?"; params.push(district); }
  if (constituency) { sql += " AND constituency = ?"; params.push(constituency); }
  const rows = assessWorks(db.prepare(sql).all(...params));
  res.json(rows);
});

app.get("/api/works/:id", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM works WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "not found" });
  if (!isInScope(req, row)) return res.status(403).json({ error: "Out of your jurisdiction" });
  const ledgerRows = db
    .prepare("SELECT * FROM ledger WHERE work = ? ORDER BY seq ASC")
    .all(req.params.id);
  const assessed = assessWorks(db.prepare("SELECT * FROM works").all().filter(w => isInScope(req, w))).find(w => w.id === row.id);
  const reviews = db.prepare("SELECT * FROM reviews WHERE work = ? ORDER BY id").all(row.id);
  res.json({ ...assessed, ledger: ledgerRows, reviews });
});

app.post("/api/works/:id/request-verification", requireAuth, (req, res) => {
  const work = db.prepare("SELECT * FROM works WHERE id = ?").get(req.params.id);
  if (!work) return res.status(404).json({ error: "not found" });
  if (!isInScope(req, work)) return res.status(403).json({ error: "Out of your jurisdiction" });
  const entry = appendLedgerEntry("FIELD_VERIFICATION_REQUESTED", req.params.id, req.auth.name || "Officer (via Sentinel UI)");
  res.json({ ok: true, entry });
});

app.get("/api/trends", requireAuth, (req, res) => {
  const rows = assessWorks(db.prepare("SELECT * FROM works").all().filter(w => isInScope(req, w)));
  const result = buildTrend(rows);
  res.json(result);
});

app.get("/api/network", requireAuth, (req, res) => {
  const rows = assessWorks(db.prepare("SELECT * FROM works").all().filter(w => isInScope(req, w)));
  const result = buildNetwork(rows);
  res.json(result);
});


app.get("/api/reviews", requireAuth, (req, res) => {
  const visible = new Set(db.prepare("SELECT * FROM works").all().filter(w => isInScope(req, w)).map(w => w.id));
  const reviews = db.prepare("SELECT * FROM reviews ORDER BY id ASC").all().filter(r => visible.has(r.work));
  res.json(reviews);
});

app.get("/api/ledger", requireAuth, (req, res) => {
  const visible = new Set(db.prepare("SELECT * FROM works").all().filter(w => isInScope(req, w)).map(w => w.id));
  const rows = db.prepare("SELECT * FROM ledger ORDER BY seq ASC").all().filter(r => visible.has(r.work));
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


app.get("/api/citizen-reports", requireAuth, (req, res) => {
  const visible = new Set(db.prepare("SELECT * FROM works").all().filter(w => isInScope(req, w)).map(w => w.id));
  const rows = db.prepare("SELECT * FROM citizen_reports ORDER BY id DESC").all().filter(r => visible.has(r.work));
  res.json(rows);
});

app.post("/api/citizen-reports", requireAuth, (req, res) => {
  const { work, note, status } = req.body;
  if (!work || !note || !status) return res.status(400).json({ error: "work, note and status are required" });
  const record = db.prepare("SELECT * FROM works WHERE id = ?").get(work);
  if (!record || !isInScope(req, record)) return res.status(403).json({ error: "Work unavailable in your jurisdiction" });
  if (typeof note !== "string" || note.length > 4000) return res.status(400).json({ error: "Invalid report note" });
  const createdAt = new Date().toISOString();
  const result = db
    .prepare("INSERT INTO citizen_reports (work, note, status, createdAt) VALUES (?, ?, ?, ?)")
    .run(work, note, status, createdAt);
  if (status === "confirmed") {
    appendLedgerEntry("CITIZEN_REPORT_RECEIVED", work, `Public Report #${result.lastInsertRowid}`);
  }
  res.json({ ok: true, id: result.lastInsertRowid });
});

app.post("/api/ingest", requireAuth, requireRole("ministry"), upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no file uploaded" });

  let parsed;
  try {
    parsed = Papa.parse(req.file.buffer.toString("utf8"), { header: true, skipEmptyLines: true });
  } catch (e) {
    return res.status(400).json({ error: "could not parse CSV: " + e.message });
  }

  if (parsed.errors.length) return res.status(400).json({ error: "CSV contains malformed rows; no records imported" });
  const ids = parsed.data.map(r => r.unique_work_number?.trim());
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) return res.status(400).json({ error: "Each row needs a unique, non-empty unique_work_number" });
  if (parsed.data.length > 10000) return res.status(400).json({ error: "Demo import limit is 10,000 rows" });
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
    .filter((r) => Number.isFinite(r.sanction_amount) && r.sanction_amount > 0 && r.work_name && r.state && r.constituency);
  if (rows.length !== parsed.data.length) return res.status(400).json({ error: "Every row needs state, constituency, work_name and a positive finite sanction_amount" });

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
      utilized: null,
      score: result.score,
      level: result.level,
      reasons: result.reasons,
      dateApproved: r.date_of_administrative_approval,
      lastUpdated: r.data_as_on || "",
    };
  });

  // Preserve historical ledger entries and review decisions on import.
  // A transaction batches all these writes into one commit instead of one
  // fsync per row -- without this, ingesting tens of thousands of rows
  // takes minutes instead of seconds, which looks exactly like the app
  // hanging or doing nothing.
  db.exec("BEGIN TRANSACTION");
  try {
    for (const w of works) {
      upsertWork(w);
      appendLedgerEntry("RECORD_IMPORTED", w.id, "User CSV; provenance not independently verified");
      if (w.level === "high" || w.level === "medium") {
        appendLedgerEntry("RISK_FLAGGED", w.id, "Sentinel Engine");
      }
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  const highRisk = assessWorks(db.prepare("SELECT * FROM works").all()).filter((w) => w.level === "high").length;
  res.json({ ok: true, inserted: works.length, highRisk });
});

app.get("/api/works/:id/evidence", requireAuth, (req, res) => {
  const visible = db.prepare("SELECT * FROM works").all().filter(w => isInScope(req, w));
  const work = assessWorks(visible).find(w => w.id === req.params.id);
  if (!work) return res.status(404).json({ error: "Work not found in your jurisdiction" });
  const reviews = db.prepare("SELECT * FROM reviews WHERE work = ? ORDER BY id").all(work.id);
  res.json(evidencePacket(work, reviews));
});

app.post("/api/works/:id/reviews", requireAuth, requireRole("district", "state", "ministry"), (req, res) => {
  const work = db.prepare("SELECT * FROM works WHERE id = ?").get(req.params.id);
  if (!work || !isInScope(req, work)) return res.status(404).json({ error: "Work not found in your jurisdiction" });
  const { decision, note } = req.body || {};
  if (!["under_review", "request_evidence", "explained", "escalated"].includes(decision)
      || typeof note !== "string" || note.trim().length < 10 || note.length > 4000) {
    return res.status(400).json({ error: "Choose a decision and provide a note of 10 to 4000 characters" });
  }
  const createdAt = new Date().toISOString();
  db.exec("BEGIN TRANSACTION");
  try {
    const record = { work: work.id, decision, note: note.trim(), actor: req.auth.name, createdAt };
    db.prepare("INSERT INTO reviews (work, decision, note, actor, createdAt) VALUES (?, ?, ?, ?, ?)")
      .run(record.work, decision, record.note, record.actor, createdAt);
    const digest = crypto.createHash("sha256").update(JSON.stringify(record)).digest("hex");
    appendLedgerEntry(`REVIEW:${decision}:${digest}`, work.id, req.auth.name);
    db.exec("COMMIT");
    res.json({ ok: true, review: record });
  } catch (error) { db.exec("ROLLBACK"); throw error; }
});

app.use((err, req, res, next) => {
  console.error("Request error:", err.message);
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File too large (limit is 10MB). Try filtering it down in Excel first." });
  }
  res.status(500).json({ error: err.message || "Something went wrong on the server." });
});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`MPLAD Sentinel API listening on http://localhost:${PORT}`);
});
