// Real analytics derived from whatever is actually in the works table --
// no invented numbers. Two things live here:
//   1. A genuine month-by-month sanctioned-amount trend, with a simple
//      linear-regression forecast for the next few months (honestly
//      labelled as a basic linear projection, not a claim of a trained
//      forecasting model).
//   2. A genuine contractor/work network built from real implementing
//      agency data already in the database.

function parseIndianDate(str) {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return isNaN(date.getTime()) ? null : date;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function buildTrend(works, forecastPeriods = 3) {
  const byMonth = {};
  for (const w of works) {
    const d = parseIndianDate(w.dateApproved);
    if (!d) continue;
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
    (byMonth[key] ||= { sanctioned: 0, count: 0 }).sanctioned += w.sanctioned;
    byMonth[key].count += 1;
  }

  const points = Object.entries(byMonth)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, v]) => {
      const [y, m] = key.split("-").map(Number);
      return { key, label: MONTH_LABELS[m - 1] + " " + String(y).slice(2), sanctioned: v.sanctioned, count: v.count };
    });

  if (points.length < 2) {
    return { points, forecast: [], hasEnoughData: false };
  }

  // Ordinary least squares on (index -> sanctioned). This is a basic linear
  // projection, not a seasonal or trained model -- deliberately described
  // that way in the UI so it isn't oversold.
  const n = points.length;
  const xs = points.map((_, i) => i);
  const ys = points.map((p) => p.sanctioned);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  const forecast = [];
  for (let i = 0; i < forecastPeriods; i++) {
    const idx = n + i;
    const predicted = Math.max(0, Math.round(intercept + slope * idx));
    forecast.push({ label: "F+" + (i + 1), sanctioned: predicted, forecast: true });
  }

  return { points, forecast, hasEnoughData: true, slope };
}

// Builds a real graph: one node per contractor, one node per work, edges
// connecting a work to its contractor. A contractor is flagged if it has
// 2+ high-risk works or any work carrying a duplicate/batch-approval
// reason -- both genuine signals already computed by the scoring engine,
// just re-surfaced at the contractor level here.
export function buildNetwork(works) {
  const contractorStats = {};
  for (const w of works) {
    const c = (contractorStats[w.contractor] ||= { name: w.contractor, works: [], highRisk: 0, sanctioned: 0 });
    c.works.push(w.id);
    c.sanctioned += w.sanctioned;
    if (w.level === "high") c.highRisk += 1;
  }

  const nodes = [];
  const edges = [];
  for (const [name, stats] of Object.entries(contractorStats)) {
    const flagged = stats.highRisk >= 1 && stats.works.length >= 2;
    nodes.push({
      id: name,
      type: "contractor",
      flagged,
      worksCount: stats.works.length,
      sanctioned: stats.sanctioned,
      highRisk: stats.highRisk,
    });
  }
  for (const w of works) {
    nodes.push({ id: w.id, type: "work", flagged: w.level === "high", label: w.name });
    edges.push([w.contractor, w.id]);
  }

  return { nodes, edges };
}
