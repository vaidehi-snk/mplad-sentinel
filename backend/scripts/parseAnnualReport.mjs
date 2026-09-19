// Parses the transcribed MPLADS Annual Report 2016-17 (Ministry of Statistics
// and Programme Implementation, mplads.gov.in) into structured per-MP
// records with real performance metrics.
//
// IMPORTANT: this is aggregate annual data per MP (release, expenditure,
// works recommended/sanctioned/completed for the year), NOT individual
// work-level line items. It cannot feed the cost-anomaly / duplicate-work
// / same-day-batch detectors built for the works-level dataset -- those
// need individual work records. What it CAN do is something the paid
// per-work dataset can't: cover almost every real MP in the country in
// one free document, ranked by real utilization and completion rates.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const inputPath = path.join(__dirname, "raw_sources", "annual_report_2016_17.txt");
const raw = fs.readFileSync(inputPath, "utf8");

const lines = raw.split("\n");
let currentState = null;
let currentHouse = null;
const records = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;

  if (trimmed === "16th Lok Sabha") {
    currentHouse = "Lok Sabha";
    continue;
  }
  if (trimmed === "Member of Rajya Sabha") {
    currentHouse = "Rajya Sabha";
    continue;
  }
  if (trimmed.startsWith("STATE_TOTAL")) {
    currentState = null;
    continue;
  }
  // State header lines look like "3.1 ANDHRA PRADESH"
  const stateHeaderMatch = trimmed.match(/^3\.\d+\s+([A-Z& ]+)$/);
  if (stateHeaderMatch) {
    currentState = stateHeaderMatch[1]
      .trim()
      .split(" ")
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(" ");
    continue;
  }

  // Data rows: "1 Name|Constituency|release|expenditure|recommended|sanctioned|completed"
  const rowMatch = trimmed.match(/^\d+\s+(.+)$/);
  if (rowMatch && trimmed.includes("|") && currentState) {
    const rest = rowMatch[1];
    const parts = rest.split("|");
    if (parts.length === 7) {
      const [mp, constituency, release, expenditure, recommended, sanctioned, completed] = parts;
      records.push({
        state: currentState,
        house: currentHouse || "Lok Sabha",
        mp: mp.trim(),
        constituency: constituency.trim(),
        releaseCrore: parseFloat(release) || 0,
        expenditureCrore: parseFloat(expenditure) || 0,
        recommended: parseInt(recommended, 10) || 0,
        sanctioned: parseInt(sanctioned, 10) || 0,
        completed: parseInt(completed, 10) || 0,
        year: "2016-17",
      });
    }
  }
}

// Derived, real metrics -- computed from the numbers above, nothing invented.
const withMetrics = records.map((r) => {
  const utilizationPct = r.releaseCrore > 0 ? Math.round((r.expenditureCrore / r.releaseCrore) * 1000) / 10 : null;
  const completionPct = r.sanctioned > 0 ? Math.round((r.completed / r.sanctioned) * 1000) / 10 : null;
  const backlog = Math.max(0, r.sanctioned - r.completed);

  const reasons = [];
  let concernScore = 0;

  // Recommended works but literally zero sanctioned -- a real, checkable
  // stall in the pipeline.
  if (r.recommended > 20 && r.sanctioned === 0) {
    concernScore += 40;
    reasons.push(`${r.recommended} works recommended but zero sanctioned this year`);
  }
  // Funds released with negligible completion.
  if (r.releaseCrore > 2 && completionPct !== null && completionPct < 15) {
    concernScore += 30;
    reasons.push(`Only ${completionPct}% of sanctioned works completed despite \u20b9${r.releaseCrore}cr released`);
  }
  // Utilization far below 100% (funds released but not spent).
  if (utilizationPct !== null && utilizationPct < 40 && r.releaseCrore > 1) {
    concernScore += 25;
    reasons.push(`Utilization only ${utilizationPct}% of funds released`);
  }
  // Utilization wildly above 100% (spending beyond what was released this year, drawing down carry-forward).
  if (utilizationPct !== null && utilizationPct > 200) {
    concernScore += 15;
    reasons.push(`Expenditure ${utilizationPct}% of release \u2014 unusually high, check carry-forward funds`);
  }

  concernScore = Math.min(100, concernScore);
  const level = concernScore >= 50 ? "high" : concernScore >= 25 ? "medium" : "low";
  if (reasons.length === 0) reasons.push("No anomaly signals in aggregate annual figures");

  return { ...r, utilizationPct, completionPct, backlog, concernScore, level, reasons };
});

const outPath = path.join(__dirname, "..", "data", "mpPerformance2016_17.json");
fs.writeFileSync(outPath, JSON.stringify(withMetrics, null, 2));

console.log(`Parsed ${withMetrics.length} real MP records across ${new Set(withMetrics.map((r) => r.state)).size} states.`);
console.log(`High concern: ${withMetrics.filter((r) => r.level === "high").length}`);
console.log(`Written to ${outPath}`);
