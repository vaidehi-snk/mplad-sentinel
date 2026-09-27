// Lets the existing Ctrl+K search box (shell.jsx -> /api/cases?q=) understand a
// few structured qualifiers -- risk level, work category, sanctioned-amount
// threshold, state, and check/signal name -- on top of the plain substring
// match it already does. Nothing in the frontend changes: this only makes the
// same search box smarter server-side.
//
// Deliberately rule-based (regex + lookup tables), not an LLM call, for the
// same reason as the rest of the engine: it must work with no network and no
// API key at judging time, and every match is traceable to an explicit rule.

const LEVEL_WORDS = {
  high: /\bhigh[\s-]?risk\b|\brisky\b/,
  medium: /\bmedium[\s-]?risk\b/,
  watch: /\bwatch(?:list)?\b/,
  clear: /\blow[\s-]?risk\b|\bclean\b|\bcompliant\b|\bclear(?:ed)?\b/,
};

const CATEGORY_WORDS = {
  road: ["road", "roads", "street", "cc road"],
  hall: ["hall", "community hall", "community centre", "community center"],
  classroom: ["classroom", "classrooms", "school"],
  water: ["water", "borewell", "handpump", "hand pump", "drinking water"],
  solar: ["solar", "street light", "street lights", "streetlight", "high-mast", "high mast"],
  toilet: ["toilet", "toilets", "sanitation", "sanitary complex"],
  drain: ["drain", "drainage", "storm water"],
  anganwadi: ["anganwadi"],
  shelter: ["bus shelter", "shelter"],
  gym: ["gym", "open gym", "sports facility", "sports ground"],
};

const SIGNAL_WORDS = {
  SANCTION_45: ["45-day", "45 day", "sanction delay", "sanction beyond"],
  DEADLINE: ["past deadline", "missed deadline", "overdue"],
  COST: ["cost vs peer", "above peer", "unit cost", "expensive"],
  COST_OVERRUN: ["cost overrun", "overrun"],
  PHOTO: ["no photo", "photo evidence", "without asset photo", "missing photo"],
  PAY_PROGRESS: ["pay vs progress", "paid ahead", "payment ahead"],
  MARK_COMPLETE: ["not marked complete", "marked complete"],
  DUPLICATE: ["duplicate", "duplicates"],
  SPLIT: ["split work", "split works", "tender limit"],
  NOT_PERMISSIBLE: ["not permissible", "not permitted", "ineligible", "eligibility"],
  VENDOR: ["vendor share", "vendor concentration"],
  ML_OUTLIER: ["outlier", "unusual mix"],
  DELAY_RISK: ["delay forecast", "predicted delay", "likely to miss"],
};

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir",
];

function toRupees(numStr, unit) {
  const n = parseFloat(numStr.replace(/,/g, ""));
  if (Number.isNaN(n)) return null;
  const u = (unit || "").toLowerCase();
  if (u === "lakh" || u === "lac" || u === "l") return n * 100000;
  if (u === "crore" || u === "cr") return n * 10000000;
  return n;
}

// Parses free text into { level, category, state, signal, amount:{op,value}, rest }.
// `rest` is whatever text was left over after stripping matched phrases, so it
// can still be used for a plain substring match (e.g. a place name typed
// alongside a filter: "high risk works in Nashik").
export function parseCaseQuery(text) {
  let q = ` ${String(text || "").toLowerCase()} `;
  const out = {};
  const strip = (re) => { const m = q.match(re); if (m) q = q.replace(m[0], " "); return m; };

  for (const [level, re] of Object.entries(LEVEL_WORDS)) {
    if (re.test(q)) { out.level = level; strip(re); break; }
  }
  // Longest phrase first, so "photo evidence" is consumed whole rather than
  // leaving a trailing "evidence" behind after a shorter "no photo" match.
  for (const [cat, words] of Object.entries(CATEGORY_WORDS)) {
    const sorted = [...words].sort((a, b) => b.length - a.length);
    const hit = sorted.find((w) => q.includes(w));
    if (hit) { out.category = cat; q = q.replace(hit, " "); break; }
  }
  for (const [code, words] of Object.entries(SIGNAL_WORDS)) {
    const sorted = [...words].sort((a, b) => b.length - a.length);
    const hit = sorted.find((w) => q.includes(w));
    if (hit) { out.signal = code; q = q.replace(hit, " "); break; }
  }
  for (const state of STATES) {
    if (q.includes(state.toLowerCase())) { out.state = state; q = q.replace(state.toLowerCase(), " "); break; }
  }
  const over = strip(/(?:over|above|more than|greater than|exceeding)\s*(?:₹|rs\.?|inr)?\s*([\d,.]+)\s*(lakh|lac|crore|cr)?/);
  if (over) { const v = toRupees(over[1], over[2]); if (v !== null) out.amount = { op: "over", value: v }; }
  else {
    const under = strip(/(?:under|below|less than)\s*(?:₹|rs\.?|inr)?\s*([\d,.]+)\s*(lakh|lac|crore|cr)?/);
    if (under) { const v = toRupees(under[1], under[2]); if (v !== null) out.amount = { op: "under", value: v }; }
  }

  // Final cleanup: strip connector words AND every word from our own
  // vocabulary lists (even ones that weren't the winning match for their
  // category) -- leftover fragments like "evidence" or "risk" are noise
  // from our own phrasing, not a place/vendor name the user typed, so they
  // must not survive into the free-text filter and wrongly zero out results.
  const vocab = [
    ...Object.values(LEVEL_WORDS).map((re) => re.source.replace(/[\\^$.|?*+()[\]{}]/g, " ")),
    ...Object.values(CATEGORY_WORDS).flat(),
    ...Object.values(SIGNAL_WORDS).flat(),
  ].join(" ").split(/\s+/).filter((w) => w.length > 1);
  const stop = new Set(["works?", "in", "of", "with", "the", "a", "an", "for", ...vocab]);
  q = q
    .split(/\s+/)
    .filter((w) => w && !stop.has(w) && !stop.has(w.replace(/s$/, "")))
    .join(" ")
    .trim();
  out.rest = q;
  return out;
}

export function applyCaseQuery(list, parsed) {
  let result = list;
  if (parsed.level) result = result.filter((w) => w.level === parsed.level);
  if (parsed.category) result = result.filter((w) => w.category === parsed.category);
  if (parsed.state) result = result.filter((w) => (w.state || "").toLowerCase() === parsed.state.toLowerCase());
  if (parsed.signal) result = result.filter((w) => w.signals.some((s) => s.code === parsed.signal));
  if (parsed.amount) {
    const { op, value } = parsed.amount;
    result = result.filter((w) => (op === "over" ? w.sanctioned > value : w.sanctioned < value));
  }
  if (parsed.rest && parsed.rest.length >= 2) {
    const t = parsed.rest;
    result = result.filter((w) => `${w.id} ${w.title} ${w.vendor} ${w.implementingAgency} ${w.district} ${w.constituency}`.toLowerCase().includes(t));
  }
  return result;
}
