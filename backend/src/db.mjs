import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { works as fallbackWorks } from "../data/mockData.js";
import { realWorks } from "../data/realWorks.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.SENTINEL_DB_PATH || path.join(__dirname, "..", "sentinel-review.db");

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT, work TEXT NOT NULL, decision TEXT NOT NULL,
    note TEXT NOT NULL, actor TEXT NOT NULL, createdAt TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS works (
    id TEXT PRIMARY KEY,
    name TEXT,
    constituency TEXT,
    district TEXT,
    state TEXT,
    mp TEXT,
    contractor TEXT,
    sanctioned REAL,
    utilized REAL,
    score INTEGER,
    level TEXT,
    reasons TEXT,
    dateApproved TEXT,
    lastUpdated TEXT
  );

  CREATE TABLE IF NOT EXISTS ledger (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT,
    work TEXT,
    actor TEXT,
    hash TEXT,
    prevHash TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS citizen_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    work TEXT,
    note TEXT,
    status TEXT,
    createdAt TEXT
  );
`);

// Auto-repair: if this database file was created by an older version of
// this schema (missing a column we've since added), add the missing
// column instead of crashing. CREATE TABLE IF NOT EXISTS above does
// nothing when the table already exists with an old shape, so without
// this, every schema change would require manually deleting sentinel.db.
const REQUIRED_COLUMNS = {
  works: [
    ["id", "TEXT"], ["name", "TEXT"], ["constituency", "TEXT"], ["district", "TEXT"],
    ["state", "TEXT"], ["mp", "TEXT"], ["contractor", "TEXT"], ["sanctioned", "REAL"],
    ["utilized", "REAL"], ["score", "INTEGER"], ["level", "TEXT"], ["reasons", "TEXT"],
    ["dateApproved", "TEXT"], ["lastUpdated", "TEXT"],
  ],
};
for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
  const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
  for (const [name, type] of columns) {
    if (!existing.has(name)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
      console.log(`Migrated: added missing column "${name}" to ${table}`);
    }
  }
}

export function appendLedgerEntry(action, work, actor) {
  const last = db.prepare("SELECT hash FROM ledger ORDER BY seq DESC LIMIT 1").get();
  const prevHash = last ? last.hash : "0".repeat(64);
  const createdAt = new Date().toISOString();
  const payload = JSON.stringify({ action, work, actor, prevHash, createdAt });
  const hash = crypto.createHash("sha256").update(payload).digest("hex");
  db.prepare(
    "INSERT INTO ledger (action, work, actor, hash, prevHash, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(action, work, actor, hash, prevHash, createdAt);
  return { action, work, actor, hash, prevHash, createdAt };
}

const insertWorkStmt = db.prepare(`
  INSERT OR REPLACE INTO works (id, name, constituency, district, state, mp, contractor, sanctioned, utilized, score, level, reasons, dateApproved, lastUpdated)
  VALUES (@id, @name, @constituency, @district, @state, @mp, @contractor, @sanctioned, @utilized, @score, @level, @reasons, @dateApproved, @lastUpdated)
`);

export function upsertWork(w) {
  insertWorkStmt.run({
    id: w.id,
    name: w.name,
    constituency: w.constituency,
    district: w.district || w.constituency || "",
    state: w.state,
    mp: w.mp || "Unknown MP",
    contractor: w.contractor,
    sanctioned: w.sanctioned,
    utilized: null,
    score: w.score,
    level: w.level,
    reasons: JSON.stringify(w.reasons),
    dateApproved: w.dateApproved || "",
    lastUpdated: w.lastUpdated || "",
  });
}

export function clearAllData() {
  db.exec("DELETE FROM works; DELETE FROM ledger; DELETE FROM citizen_reports;");
}

let dataIsReal = Boolean(realWorks && realWorks.length);
export function isRealData() {
  return dataIsReal;
}
export function markRealData(value) {
  dataIsReal = value;
}

function seedIfEmpty() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM works").get().c;
  if (count > 0) return;

  const source = realWorks && realWorks.length ? realWorks : fallbackWorks;
  dataIsReal = Boolean(realWorks && realWorks.length);

  db.exec("BEGIN TRANSACTION");
  try {
    for (const w of source) {
      upsertWork(w);
      appendLedgerEntry("RECORD_IMPORTED", w.id, "Bundled historical sample; source provenance unverified");
      if (w.level === "high" || w.level === "medium") {
        appendLedgerEntry("RISK_FLAGGED", w.id, "Sentinel Engine");
      }
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  console.log(`Seeded ${source.length} works (${dataIsReal ? "real" : "demo"} data) and their ledger entries.`);
}

seedIfEmpty();
