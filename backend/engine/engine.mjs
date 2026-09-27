// Sentinel analysis engine. Every check returns one of three outcomes:
//   flag  - attention needed, with the evidence and a plausible innocent explanation
//   clear - no signal on the available evidence
//   na    - cannot assess (missing data is never treated as a pass)
import { IsolationForest } from "../lib/isolationForest.js";

const DAY = 86400000;
const dd = (a, b) => Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / DAY);
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const cr = (v) => v / 1e7;
const plus = (s, n) => new Date(new Date(s + "T00:00:00Z").getTime() + n * DAY).toISOString().slice(0, 10);
const lakh = (v) => `₹${(v / 1e5).toFixed(2)} L`;

// Guideline list of works not permissible, as phrases that appear in real work descriptions.
export const NEGATIVE_LIST = [
  { key: "maintenance", label: "Maintenance or repair", clause: "maintenance works of any type, or repair and renovation other than special repair of a durable asset", re: /\b(maintenance|whitewash\w*|painting|repairs?|renovation)\b|मरम्मत|रखरखाव|पुताई/i, unless: /special repair/i },
  { key: "religious", label: "Inside a place of worship", clause: "works within places of religious worship or on land belonging to a religious faith or group", re: /\b(inside|within)\b[^,]*\b(temple|mosque|masjid|church|gurudwara|dargah)\b[^,]*\b(premises|campus|compound)\b|(मंदिर|मस्जिद|गुरुद्वारा|चर्च)\s*परिसर/i },
  { key: "office", label: "Government office or staff housing", clause: "office and residential buildings of government departments and agencies", re: /\b(staff quarters?|residential quarters?|office building)\b|कार्यालय भवन|कर्मचारी आवास/i },
  { key: "land", label: "Land acquisition", clause: "acquisition of land or compensation for land", re: /\bland acquisition\b|\bacquisition of land\b|compensation for land|भूमि अधिग्रहण/i },
  { key: "named", label: "Named asset or memorial", clause: "assets named after any person, or memorials", re: /\b(smriti|smarak|memorial|statue)\b|\blate shri\b|स्मृति|स्मारक|प्रतिमा/i },
  { key: "grant", label: "Grant, loan or contribution", clause: "grants, loans or contributions to any fund or body", re: /\b(grant|loan|contribution)s?\s+(to|for)\b|अनुदान/i },
  { key: "private", label: "Private or commercial body", clause: "works for private, cooperative or commercial bodies, or for individual benefit", re: /\b(private|co-?operative society|commercial)\b/i },
];
export function screenText(title) {
  const hits = [];
  for (const r of NEGATIVE_LIST) {
    const m = String(title).match(r.re);
    if (m && !(r.unless && r.unless.test(title))) hits.push({ key: r.key, label: r.label, clause: r.clause, phrase: m[0] });
  }
  return hits;
}

export const RULES = {
  SANCTION_45: {
    title: "Sanction beyond 45 days", kind: "rule", domain: "Compliance",
    basis: "MPLADS Guidelines 2023: the District Authority sanctions or rejects a recommended work within 45 days of receipt.",
  },
  DEADLINE: {
    title: "Past completion deadline", kind: "rule", domain: "Delivery",
    basis: "MPLADS Guidelines 2023: works are ordinarily completed within one year of sanction; any exception is recorded in the sanction order.",
  },
  COST: {
    title: "Unit cost far above peers", kind: "statistical", domain: "Cost",
    basis: "Robust peer comparison: rupees per unit against the median of the same work type in the same state (median / MAD, minimum 8 peers).",
  },
  COST_OVERRUN: {
    title: "Cost overrun", kind: "rule", domain: "Cost",
    basis: "The approved cost is the sanctioned amount. A revised estimate more than 20% above it, or payments beyond the approved cost, needs a recorded justification.",
  },
  PHOTO: {
    title: "Payment without asset photo", kind: "rule", domain: "Evidence",
    basis: "eSAKSHI process: implementing agencies upload asset photographs at each stage of payment processing.",
  },
  PAY_PROGRESS: {
    title: "Payment ahead of physical progress", kind: "rule", domain: "Payments",
    basis: "Staged vendor payments are released against recorded progress; a gap above 20 points needs an explanation.",
  },
  MARK_COMPLETE: {
    title: "Fully paid, not marked complete", kind: "rule", domain: "Reporting",
    basis: "eSAKSHI process: after the final payment the implementing agency marks the work complete; only then does it count as completed.",
  },
  DUPLICATE: {
    title: "Possible duplicate work", kind: "statistical", domain: "Duplication",
    basis: "Same work type within 250 m and a closely matching description, sanctioned separately. Phases and distinct segments are excluded.",
  },
  SPLIT: {
    title: "Possible split work", kind: "statistical", domain: "Procurement",
    basis: "Three or more works of the same type for the same vendor, sanctioned within 45 days and within 1.5 km, each just under the open-tender value (demo: ₹5 L, configurable per state).",
  },
  NOT_PERMISSIBLE: {
    title: "Work may not be permissible", kind: "rule", domain: "Eligibility",
    basis: "MPLADS Guidelines list works that are not permissible (maintenance, government offices and quarters, places of worship, land acquisition, named assets, grants and loans, private bodies). Work descriptions in English and Hindi are screened against that list.",
  },
  VENDOR: {
    title: "Vendor concentration", kind: "statistical", domain: "Procurement",
    basis: "One vendor holds more than 30% of a constituency's sanctioned value across at least 6 works.",
  },
  ML_OUTLIER: {
    title: "Statistical outlier (Isolation Forest)", kind: "ml", domain: "Pattern",
    basis: "Isolation Forest over cost ratio, sanction lag, payment-progress gap and overrun. An exploratory signal, never a finding on its own.",
  },
  DELAY_RISK: {
    title: "Predicted to miss its deadline", kind: "ml", domain: "Early warning",
    basis: "Logistic model trained on completed works in the dataset: sanction lag, agency workload, vendor track record, work type and size.",
  },
};

const SEV_POINTS = { high: 40, medium: 22, watch: 10 };

function tokens(s) {
  return new Set(String(s).toLowerCase().replace(/constn\./g, "construction").replace(/upto/g, "to").split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 1));
}
function jaccard(a, b) { let i = 0; for (const t of a) if (b.has(t)) i++; return i / (a.size + b.size - i || 1); }
function metres(a, b) {
  const R = 6371000, toR = Math.PI / 180;
  const x = (b.lng - a.lng) * toR * Math.cos(((a.lat + b.lat) / 2) * toR), y = (b.lat - a.lat) * toR;
  return Math.sqrt(x * x + y * y) * R;
}

// ---------- tiny logistic regression (gradient descent, standardised features) ----------
function trainLogistic(X, y, { epochs = 600, lr = 0.15, l2 = 0.002 } = {}) {
  const n = X.length, k = X[0].length;
  const mu = Array(k).fill(0), sd = Array(k).fill(0);
  X.forEach((r) => r.forEach((v, j) => (mu[j] += v / n)));
  X.forEach((r) => r.forEach((v, j) => (sd[j] += (v - mu[j]) ** 2 / n)));
  sd.forEach((v, j) => (sd[j] = Math.sqrt(v) || 1));
  const Z = X.map((r) => r.map((v, j) => (v - mu[j]) / sd[j]));
  const w = Array(k).fill(0); let b = 0;
  const sig = (z) => 1 / (1 + Math.exp(-z));
  for (let e = 0; e < epochs; e++) {
    const gw = Array(k).fill(0); let gb = 0;
    for (let i = 0; i < n; i++) {
      const p = sig(Z[i].reduce((s, v, j) => s + v * w[j], b));
      const err = p - y[i];
      Z[i].forEach((v, j) => (gw[j] += err * v));
      gb += err;
    }
    w.forEach((_, j) => (w[j] -= lr * (gw[j] / n + l2 * w[j])));
    b -= lr * gb / n;
  }
  const predict = (r) => sig(r.reduce((s, v, j) => s + ((v - mu[j]) / sd[j]) * w[j], b));
  return { predict, weights: w, bias: b };
}
function auc(scores, labels) {
  const pos = [], neg = [];
  scores.forEach((s, i) => (labels[i] ? pos : neg).push(s));
  if (!pos.length || !neg.length) return null;
  let wins = 0;
  for (const p of pos) for (const q of neg) wins += p > q ? 1 : p === q ? 0.5 : 0;
  return wins / (pos.length * neg.length);
}

export function buildEngine(dataset) {
  const today = dataset.meta.asOf;
  const GO_LIVE = dataset.meta.goLive || today;
  const works = dataset.works.map((w) => ({ ...w, checks: {}, signals: [] }));
  const byId = new Map(works.map((w) => [w.id, w]));
  const live = works.filter((w) => w.sanctionedOn && w.status !== "rejected");

  const add = (w, code, outcome, extra = {}) => {
    w.checks[code] = outcome;
    if (outcome === "flag") w.signals.push({ code, ...RULES[code], ...extra });
    else if (extra.note) w.checks[code + "_note"] = extra.note;
  };

  // ---- 1. sanction within 45 days ----
  for (const w of works) {
    if (w.status === "rejected") { add(w, "SANCTION_45", "clear"); continue; }
    if (!w.recommendedOn) { add(w, "SANCTION_45", "na", { note: "Recommendation date missing" }); continue; }
    const lag = dd(w.recommendedOn, w.sanctionedOn || today);
    w.sanctionLag = w.sanctionedOn ? lag : null;
    if (lag > 45) {
      add(w, "SANCTION_45", "flag", {
        severity: lag > 100 ? "high" : "medium",
        message: w.sanctionedOn ? `Sanctioned ${lag} days after recommendation — ${lag - 45} days beyond the 45-day window.` : `Recommended ${lag} days ago and still awaiting a sanction decision.`,
        innocent: "The file may have been returned for a revised estimate or land clearance; the dates of any correspondence would show this.",
        evidence: [["Recommended", w.recommendedOn], ["Sanctioned", w.sanctionedOn || "pending"], ["Allowed", "45 days"]],
        action: "Ask the District Authority for the reason for delay and the date the recommendation was received.", since: plus(w.recommendedOn, 45),
      });
    } else add(w, "SANCTION_45", "clear");
  }

  // ---- 2. deadline ----
  for (const w of works) {
    if (!w.sanctionedOn || w.status === "rejected") { add(w, "DEADLINE", "na", { note: "Not sanctioned" }); continue; }
    const done = !!w.completedOn;
    const end = done ? w.completedOn : today;
    const over = dd(w.deadline, end);
    w.daysOverdue = !done && over > 0 ? over : 0;
    if (!done && over > 0) {
      add(w, "DEADLINE", "flag", {
        severity: over > 120 ? "high" : "medium",
        message: `${over} days past its ${w.extension ? "extended " : ""}deadline with physical progress at ${w.progress}%.`,
        innocent: w.extension ? "An extension is already recorded; check whether a further revision was approved." : "A revised timeline may have been approved without being entered on the portal.",
        evidence: [["Sanctioned", w.sanctionedOn], ["Deadline", w.deadline], ["Progress", `${w.progress}%`]],
        action: "Request the implementing agency's progress report and any approved time extension.", since: w.deadline,
      });
    } else if (done && over > 30 && !w.extension) {
      add(w, "DEADLINE", "flag", {
        severity: "watch", message: `Completed ${over} days after the one-year deadline, with no extension on record.`,
        innocent: "Work may have been paused for monsoon or elections; a recorded reason would close this.",
        evidence: [["Deadline", w.deadline], ["Completed", w.completedOn]], action: "Record the reason for the late completion.", since: w.completedOn,
      });
    } else add(w, "DEADLINE", "clear", w.extension ? { note: `Extension recorded: ${w.extension.reason}` } : {});
  }

  // ---- 3. cost benchmark (unit rate vs same type, same state) ----
  const groups = new Map();
  for (const w of live) if (w.quantity > 0) {
    w.unitRate = w.sanctioned / w.quantity;
    const k = `${w.category}|${w.state}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(w);
  }
  for (const w of works) {
    if (!w.sanctionedOn || w.status === "rejected") { add(w, "COST", "na", { note: "Not sanctioned" }); continue; }
    if (!(w.quantity > 0)) { add(w, "COST", "na", { note: "Quantity not recorded — unit cost cannot be compared" }); continue; }
    let peers = groups.get(`${w.category}|${w.state}`) || [];
    let scope = `${w.categoryLabel.toLowerCase()} works in ${w.state}`;
    if (peers.length < 8) { peers = live.filter((p) => p.category === w.category && p.quantity > 0); scope = `${w.categoryLabel.toLowerCase()} works nationally`; }
    peers = peers.filter((p) => p.id !== w.id);
    if (peers.length < 8) { add(w, "COST", "na", { note: "Fewer than 8 comparable works" }); continue; }
    const logs = peers.map((p) => Math.log(p.unitRate));
    const m = median(logs), mad = median(logs.map((v) => Math.abs(v - m))) * 1.4826 || 0.1;
    const ratio = w.unitRate / Math.exp(m);
    const z = (Math.log(w.unitRate) - m) / mad;
    w.costRatio = +ratio.toFixed(2);
    w.peerMedianRate = Math.round(Math.exp(m));
    w.peerRates = peers.slice(0, 60).map((p) => Math.round(p.unitRate));
    w.peerCount = peers.length; w.peerScope = scope;
    if (ratio >= 1.6 && z > 3) {
      add(w, "COST", "flag", {
        severity: ratio >= 2.2 ? "high" : "medium",
        message: `₹${Math.round(w.unitRate).toLocaleString("en-IN")} per ${w.unit} — ${ratio.toFixed(1)}× the median of ${peers.length} ${scope}.`,
        innocent: "Difficult terrain, higher specification or a longer lead distance for material can raise unit cost; the estimate and BOQ would show it.",
        evidence: [["This work", `₹${Math.round(w.unitRate).toLocaleString("en-IN")}/${w.unit}`], ["Peer median", `₹${w.peerMedianRate.toLocaleString("en-IN")}/${w.unit}`], ["Peers", String(peers.length)]],
        action: "Request the detailed estimate / bill of quantities and the rate schedule used.", since: w.sanctionedOn,
      });
    } else add(w, "COST", "clear");
  }

  // ---- 3b. cost overrun: revised estimate or payments beyond the approved cost ----
  for (const w of works) {
    if (!w.sanctionedOn || w.status === "rejected") { add(w, "COST_OVERRUN", "na", { note: "Not sanctioned" }); continue; }
    const rev = w.revisions?.at(-1);
    const approved = rev ? rev.to : w.sanctioned;
    const paidTotal = (w.payments || []).reduce((t, p) => t + p.amount, 0);
    w.approvedCost = approved; w.paidTotal = paidTotal;
    const over = approved / w.sanctioned - 1, beyond = paidTotal / approved - 1;
    w.overrun = +Math.max(over, beyond, 0).toFixed(3);
    if (beyond > 0.02) {
      const extra = w.payments.find((p) => p.extraBill) || w.payments.at(-1);
      add(w, "COST_OVERRUN", "flag", {
        severity: "high", message: `${lakh(paidTotal)} paid against an approved cost of ${lakh(approved)} — ${Math.round(beyond * 100)}% beyond it, with no revised estimate on record.`,
        innocent: "A revised estimate may have been approved offline and not yet entered; the sanction file would show it.",
        evidence: [["Approved cost", lakh(approved)], ["Paid so far", lakh(paidTotal)], ["Beyond approval", `${Math.round(beyond * 100)}%`]],
        action: "Hold further payments until the revised estimate and its approval are on record.", since: extra.on,
      });
    } else if (over > 0.2) {
      add(w, "COST_OVERRUN", "flag", {
        severity: over > 0.5 ? "high" : "medium",
        message: `Cost revised from ${lakh(w.sanctioned)} to ${lakh(approved)} (+${Math.round(over * 100)}%) on ${rev.on}. Reason recorded: “${rev.reason}”.`,
        innocent: "Scope can grow for good reasons (site conditions, added items); the revised estimate should say what changed and who approved it.",
        evidence: [["Sanctioned", lakh(w.sanctioned)], ["Revised", lakh(approved)], ["Increase", `+${Math.round(over * 100)}%`]],
        action: "Obtain the revised estimate, the itemised change and the approving authority's order.", since: rev.on,
      });
    } else add(w, "COST_OVERRUN", "clear", rev ? { note: `Revised +${Math.round(over * 100)}% (${rev.reason}), within the 20% band` } : {});
  }

  // ---- 4 & 5 & 6. payments ----
  for (const w of works) {
    if (!w.payments?.length) { ["PHOTO", "PAY_PROGRESS"].forEach((c) => add(w, c, w.sanctionedOn ? "clear" : "na", { note: "No payments yet" })); }
    else {
      const missing = w.payments.filter((p) => !p.photo);
      if (missing.length) add(w, "PHOTO", "flag", {
        severity: missing.some((p) => p.stage >= 90) ? "high" : "medium",
        message: `${missing.length === 1 ? "A payment" : missing.length + " payments"} released without an asset photograph (stage ${missing.map((p) => p.stage + "%").join(", ")}).`,
        innocent: "The photo may have been uploaded late or attached to a different stage.",
        evidence: missing.map((p) => [`${p.stage}% payment`, `${p.on} · ₹${(p.amount / 1e5).toFixed(2)} L · no photo`]),
        action: "Ask the implementing agency to upload geo-tagged photographs for the listed stages.", since: missing[0].on,
      });
      else add(w, "PHOTO", "clear");
      const paid = w.payments.at(-1).cumulativePct;
      if (paid - w.progress > 20) add(w, "PAY_PROGRESS", "flag", {
        severity: "high", message: `${paid}% of the value paid while physical progress stands at ${w.progress}%.`,
        innocent: "Progress may simply not have been updated on the portal after a site visit.",
        evidence: [["Paid", `${paid}%`], ["Progress", `${w.progress}%`]], action: "Schedule a site inspection before the next payment.", since: w.payments.at(-1).on,
      });
      else add(w, "PAY_PROGRESS", "clear");
    }
    const final = w.payments?.find((p) => p.stage === 100);
    if (final && !w.markedCompleteOn && dd(final.on, today) > 60) add(w, "MARK_COMPLETE", "flag", {
      severity: "medium", message: `Final payment released ${dd(final.on, today)} days ago but the work is not marked complete.`,
      innocent: "Often a reporting backlog rather than an unfinished asset — which is why this is a reporting check, not a delivery finding.",
      evidence: [["Final payment", final.on], ["Marked complete", "—"]], action: "Ask the implementing agency to mark completion or explain what remains.", since: plus(final.on, 60),
    });
    else add(w, "MARK_COMPLETE", final ? "clear" : "na", final ? {} : { note: "Final payment not yet released" });
  }

  // ---- 7. duplicates ----
  const pairs = [];
  const byPlace = new Map();
  for (const w of live) { const k = `${w.constituency}|${w.category}`; if (!byPlace.has(k)) byPlace.set(k, []); byPlace.get(k).push(w); }
  for (const w of works) w._tok = tokens(w.title);
  for (const list of byPlace.values()) {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      const dist = metres(a, b);
      if (dist > 250) continue;
      const sim = jaccard(a._tok, b._tok);
      if (sim < 0.45) continue;
      const phase = /phase|segment|stage ii|part/i.test(a.title + b.title);
      if (phase) continue;
      const [first, second] = a.sanctionedOn <= b.sanctionedOn ? [a, b] : [b, a];
      pairs.push({ a: first.id, b: second.id, distance: Math.round(dist), similarity: +sim.toFixed(2) });
      for (const [w, other] of [[second, first], [first, second]]) {
        if (w.checks.DUPLICATE === "flag") continue;
        add(w, "DUPLICATE", "flag", {
          severity: w === second ? "high" : "watch",
          message: `${Math.round(dist)} m from ${other.id} with a ${Math.round(sim * 100)}% matching description.`,
          innocent: "Two genuinely separate assets can sit close together (e.g. two classrooms blocks in one campus); site photos would settle it.",
          evidence: [["Other work", other.id], ["Distance", `${Math.round(dist)} m`], ["Description match", `${Math.round(sim * 100)}%`]],
          action: "Compare both sites' photographs and sanction orders before any further payment.", pair: other.id, since: second.sanctionedOn,
        });
      }
    }
  }
  for (const w of works) { delete w._tok; if (!w.checks.DUPLICATE) add(w, "DUPLICATE", w.lat ? "clear" : "na"); }

  // ---- 7b. split works: one job sanctioned as several just-under-limit works ----
  const LIMIT = dataset.meta.splitLimit || 500000;
  const near = live.filter((w) => w.sanctioned >= 0.8 * LIMIT && w.sanctioned < LIMIT);
  const bucket = new Map();
  for (const w of near) { const k = `${w.constituency}|${w.category}|${w.vendor}`; if (!bucket.has(k)) bucket.set(k, []); bucket.get(k).push(w); }
  const splitGroups = [];
  for (const list of bucket.values()) {
    if (list.length < 3) continue;
    const seen = new Set();
    for (const w of list) { // single linkage: within 45 days and 1.5 km of a group member
      if (seen.has(w.id)) continue;
      const group = [w]; seen.add(w.id);
      for (let i = 0; i < group.length; i++) for (const o of list) {
        if (seen.has(o.id)) continue;
        if (Math.abs(dd(group[i].sanctionedOn, o.sanctionedOn)) <= 45 && metres(group[i], o) <= 1500) { group.push(o); seen.add(o.id); }
      }
      if (group.length >= 3) splitGroups.push(group);
    }
  }
  for (const g of splitGroups) {
    const total = g.reduce((s, w) => s + w.sanctioned, 0);
    const dates = g.map((w) => w.sanctionedOn).sort();
    const span = dd(dates[0], dates.at(-1));
    const far = Math.max(...g.flatMap((a) => g.map((b) => metres(a, b))));
    for (const w of g) add(w, "SPLIT", "flag", {
      severity: g.length >= 4 ? "high" : "medium",
      message: `One of ${g.length} ${w.categoryLabel.toLowerCase()} works for ${w.vendor}, sanctioned within ${span} days and ${Math.round(far)} m of each other, each just under ${lakh(LIMIT)} — together ${lakh(total)}.`,
      innocent: "Several small works in one neighbourhood can be genuinely separate needs; the recommendation letters would show whether they were one proposal.",
      evidence: [["Works in group", String(g.length)], ["Combined value", lakh(total)], ["Tender limit (demo)", lakh(LIMIT)], ...g.filter((o) => o !== w).map((o) => ["Sibling", o.id])],
      action: "Check whether these were one job and whether the combined value required an open tender.", group: g.map((o) => o.id), since: dates.at(-1),
    });
  }
  for (const w of works) if (!w.checks.SPLIT) add(w, "SPLIT", w.sanctionedOn && w.status !== "rejected" ? "clear" : "na");

  // ---- 7c. eligibility: description screened against the guideline's non-permissible list ----
  for (const w of works) {
    if (w.status === "rejected") { add(w, "NOT_PERMISSIBLE", "clear", { note: "Rejected at sanction" }); continue; }
    const hits = screenText(w.title);
    if (!hits.length) { add(w, "NOT_PERMISSIBLE", "clear"); continue; }
    add(w, "NOT_PERMISSIBLE", "flag", {
      severity: w.sanctionedOn ? "high" : "medium",
      message: `${w.sanctionedOn ? "Sanctioned" : "Recommended"} work reads as “${hits[0].label.toLowerCase()}”: the description says “${hits[0].phrase}”. The guidelines do not permit ${hits[0].clause}.`,
      innocent: "Descriptions are sometimes imprecise — e.g. a new asset beside a temple rather than inside it; the sanction order and site plan would settle it.",
      evidence: hits.map((h) => [h.label, `“${h.phrase}”`]),
      action: w.sanctionedOn ? "Verify eligibility from the sanction order before any further payment." : "Screen eligibility before sanction.", since: w.sanctionedOn || w.recommendedOn,
    });
  }

  // ---- 8. vendor concentration ----
  const vendorStats = new Map();
  for (const w of live) {
    const k = `${w.constituency}|${w.vendor}`;
    const v = vendorStats.get(k) || { constituency: w.constituency, state: w.state, district: w.district, vendor: w.vendor, works: 0, value: 0, ids: [] };
    v.works++; v.value += w.sanctioned; v.ids.push(w.id); vendorStats.set(k, v);
  }
  const pcValue = new Map();
  for (const w of live) pcValue.set(w.constituency, (pcValue.get(w.constituency) || 0) + w.sanctioned);
  const vendorFlags = [];
  for (const v of vendorStats.values()) {
    v.share = v.value / pcValue.get(v.constituency);
    if (v.share > 0.3 && v.works >= 6) vendorFlags.push(v);
  }
  const flaggedVendor = new Map(vendorFlags.map((v) => [`${v.constituency}|${v.vendor}`, v]));
  for (const w of works) {
    const v = flaggedVendor.get(`${w.constituency}|${w.vendor}`);
    if (v && w.sanctionedOn) { w.checks.VENDOR = "flag"; w.vendorConcentration = { share: +v.share.toFixed(3), works: v.works }; }
    else add(w, "VENDOR", w.sanctionedOn ? "clear" : "na");
  }

  // ---- 9. Isolation Forest (exploratory) ----
  const feats = live.map((w) => [Math.log(w.costRatio || 1), (w.sanctionLag || 0) / 45, Math.max(0, (w.payments?.at(-1)?.cumulativePct || 0) - w.progress) / 100, (w.daysOverdue || 0) / 365, w.overrun || 0]);
  const forest = new IsolationForest();
  forest.fit(feats);
  const iso = forest.scoreAll(feats);
  live.forEach((w, i) => {
    w.outlierScore = +iso[i].toFixed(3);
    if (iso[i] > 0.66 && w.signals.length) add(w, "ML_OUTLIER", "flag", {
      severity: "watch", message: `Unusual combination of cost, timing and payment pattern (isolation score ${iso[i].toFixed(2)}).`,
      innocent: "Outlier means unusual, not wrong — this only raises the priority of the rule signals above.",
      evidence: [["Isolation score", iso[i].toFixed(2)], ["Threshold", "0.66"]], action: "Use as a tie-breaker when choosing which case to open first.",
    });
    else add(w, "ML_OUTLIER", "clear");
  });

  // ---- 10. delay prediction ----
  const agencyOpen = new Map();
  for (const w of live) if (!w.completedOn) agencyOpen.set(w.implementingAgency, (agencyOpen.get(w.implementingAgency) || 0) + 1);
  const vendorLate = new Map();
  const doneWorks = live.filter((w) => w.completedOn);
  for (const w of doneWorks) {
    const s = vendorLate.get(w.vendor) || [0, 0]; s[0] += w.completedOn > w.deadline ? 1 : 0; s[1]++; vendorLate.set(w.vendor, s);
  }
  const CAT_ORDER = ["road", "hall", "classroom", "anganwadi", "drain", "toilet", "gym", "solar", "water", "shelter"];
  const fx = (w) => {
    const vl = vendorLate.get(w.vendor) || [0, 0];
    return [Math.log(w.sanctioned), (w.sanctionLag || 0) / 45, agencyOpen.get(w.implementingAgency) || 0, (vl[0] + 1) / (vl[1] + 4), CAT_ORDER.indexOf(w.category) / 9];
  };
  const lab = (w) => (w.completedOn > w.deadline ? 1 : 0);
  const trainSet = doneWorks.filter((w) => w.sanctionedOn < "2024-10-01"), testSet = doneWorks.filter((w) => w.sanctionedOn >= "2024-10-01");
  const heldOut = trainLogistic(trainSet.map(fx), trainSet.map(lab));
  const testAuc = auc(testSet.map((w) => heldOut.predict(fx(w))), testSet.map(lab));
  const model = trainLogistic(doneWorks.map(fx), doneWorks.map(lab));
  const trainAuc = testAuc;
  for (const w of live) {
    if (w.completedOn) continue;
    w.delayRisk = +model.predict(fx(w)).toFixed(2);
    const left = dd(today, w.deadline);
    if (w.checks.DEADLINE !== "flag" && w.delayRisk >= 0.4 && left > 0) add(w, "DELAY_RISK", "flag", {
      severity: "watch", message: `${Math.round(w.delayRisk * 100)}% predicted chance of missing its deadline in ${left} days (progress ${w.progress}%).`,
      innocent: "A prediction, not an event: it points review attention before the deadline, when it can still help.",
      evidence: [["Deadline", w.deadline], ["Days left", String(left)], ["Model", `logistic, hold-out AUC ${testAuc?.toFixed(2)}`]],
      action: "Ask the agency for a work plan to the deadline.",
    });
  }

  // ---- priority ----
  const ORDER = { high: 3, medium: 2, watch: 1 };
  for (const w of works) {
    w.signals.sort((a, b) => ORDER[b.severity] - ORDER[a.severity]);
    const pts = w.signals.reduce((s, x) => s + SEV_POINTS[x.severity], 0);
    w.score = pts ? Math.round(100 * (1 - Math.exp(-(pts + (w.outlierScore || 0) * 6) / 60))) : 0;
    const top = w.signals[0]?.severity;
    const naCount = Object.entries(w.checks).filter(([k, v]) => !k.endsWith("_note") && v === "na").length;
    w.level = top || (naCount >= 3 && w.sanctionedOn ? "incomplete" : "clear");
    w.assessed = Object.entries(w.checks).filter(([k, v]) => !k.endsWith("_note") && v !== "na").length;
    w.assessable = Object.keys(w.checks).filter((k) => !k.endsWith("_note")).length;
    // When the case entered review: its earliest serious signal, never before Sentinel went live.
    const firsts = w.signals.filter((x) => x.severity !== "watch" && x.since).map((x) => x.since).sort();
    w.openSince = firsts.length ? (firsts[0] > GO_LIVE ? firsts[0] : GO_LIVE) : null;
  }

  // ---- SC / ST compliance per constituency and year ----
  const compliance = [];
  for (const c of dataset.constituencies) {
    for (const fy of ["2023-24", "2024-25", "2025-26"]) {
      const list = live.filter((w) => w.constituency === c.pc && w.fy === fy);
      const tot = 50000000;
      const sc = list.filter((w) => w.scArea).reduce((s, w) => s + w.sanctioned, 0);
      const st = list.filter((w) => w.stArea).reduce((s, w) => s + w.sanctioned, 0);
      compliance.push({ constituency: c.pc, state: c.state, district: c.district, fy, scShare: sc / tot, stShare: st / tot, scOk: sc / tot >= 0.15, stOk: st / tot >= 0.075 });
    }
  }

  // ---- fund utilisation per constituency and year (entitlement ₹5 crore a year) ----
  const FYS = ["2023-24", "2024-25", "2025-26", "2026-27"];
  const utilisation = [];
  for (const c of dataset.constituencies) for (const fy of FYS) {
    const all = works.filter((w) => w.constituency === c.pc && w.fy === fy);
    const lv = all.filter((w) => w.sanctionedOn && w.status !== "rejected");
    const fyEnd = `${Number(fy.slice(0, 4)) + 1}-03-31`;
    utilisation.push({
      constituency: c.pc, state: c.state, district: c.district, fy, closed: fyEnd < today, monthsSinceClose: fyEnd < today ? Math.round(dd(fyEnd, today) / 30.4) : 0,
      entitlement: 50000000, recommended: all.reduce((s, w) => s + (w.estimate || 0), 0), sanctioned: lv.reduce((s, w) => s + w.sanctioned, 0),
      spent: lv.reduce((s, w) => s + (w.paidTotal || 0), 0), works: all.length, completed: lv.filter((w) => w.markedCompleteOn).length,
    });
  }
  for (const fy of FYS) { // slow: a closed year where spending is well below the median constituency's
    const rows = utilisation.filter((u) => u.fy === fy && u.closed && u.monthsSinceClose >= 6);
    if (rows.length < 5) continue;
    const m = median(rows.map((u) => u.spent));
    for (const u of rows) { u.peerMedian = m; u.slow = u.spent < 0.65 * m; }
  }

  // ---- trend alerts: bursts of sanctions far above a constituency's own monthly rate ----
  const poissonTail = (k, lam) => { let p = Math.exp(-lam), c = p; for (let i = 1; i < k; i++) { p *= lam / i; c += p; } return Math.max(0, 1 - c); };
  const monthsOf = new Map();
  for (const w of live) { const k = `${w.constituency}|${w.sanctionedOn.slice(0, 7)}`; const r = monthsOf.get(k) || { n: 0, v: 0, ids: [] }; r.n++; r.v += w.sanctioned; r.ids.push(w.id); monthsOf.set(k, r); }
  const trendAlerts = [];
  const SPAN = 42; // months covered by the data
  const alpha = 0.05 / (dataset.constituencies.length * SPAN); // Bonferroni: one test per constituency-month
  for (const c of dataset.constituencies) {
    const mine = [...monthsOf].filter(([k]) => k.startsWith(c.pc + "|")).map(([k, r]) => ({ month: k.split("|")[1], ...r }));
    const lam = mine.reduce((s, r) => s + r.n, 0) / SPAN, medV = median(mine.map((r) => r.v));
    for (const r of mine) {
      const p = poissonTail(r.n, lam);
      if (p < alpha && r.v > 2.5 * medV) trendAlerts.push({
        constituency: c.pc, state: c.state, district: c.district, month: r.month, works: r.n, value: r.v, usual: +(lam).toFixed(1), usualValue: medV, p,
        kind: r.month.endsWith("-03") ? "Year-end rush" : "Unusual burst", ids: r.ids,
        message: `${r.n} works sanctioned in ${r.month} against a usual ${lam.toFixed(1)} a month${r.month.endsWith("-03") ? ", in the last month of the financial year" : ""}.`,
      });
    }
  }
  trendAlerts.sort((a, b) => a.p - b.p);

  // ---- evaluation against planted truth ----
  const expect = {
    cost_inflation: "COST", duplicate: "DUPLICATE", sanction_delay: "SANCTION_45", overdue: "DEADLINE",
    payment_without_photo: "PHOTO", payment_ahead_of_progress: "PAY_PROGRESS", paid_not_marked_complete: "MARK_COMPLETE",
    cost_overrun: "COST_OVERRUN", not_permissible: "NOT_PERMISSIBLE", split_works: "SPLIT",
  };
  const evaluation = { checks: [], controls: [], model: { testAuc: testAuc && +testAuc.toFixed(3), trainedOn: trainSet.length, testedOn: testSet.length, split: "sanctioned before / after 1 Oct 2024" } };
  for (const [scn, code] of Object.entries(expect)) {
    const planted = (dataset.truth.scenarios[scn] || []).map((id) => byId.get(id)).filter((w) => w && w.status !== "rejected"
      && (scn !== "overdue" || (w.deadline && w.deadline < today)));
    const found = planted.filter((w) => w.checks[code] === "flag").length;
    const flagged = code === "DUPLICATE" ? pairs.map((p) => byId.get(p.b)) : works.filter((w) => w.checks[code] === "flag");
    const exact = RULES[code].kind === "rule" && code !== "NOT_PERMISSIBLE";
    const tp = flagged.filter((w) => w.truth.includes(scn)).length;
    evaluation.checks.push({ code, title: RULES[code].title, kind: RULES[code].kind, planted: planted.length, found, recall: planted.length ? found / planted.length : null, flagged: flagged.length, precision: exact ? null : flagged.length ? tp / flagged.length : null });
  }
  const vendorTruth = new Set(dataset.truth.scenarios.vendor_concentration || []);
  const vf = vendorFlags.map((v) => `${v.constituency}|${v.vendor}`);
  evaluation.checks.push({ code: "VENDOR", title: RULES.VENDOR.title, kind: "statistical", planted: vendorTruth.size, found: vf.filter((k) => vendorTruth.has(k)).length, recall: vendorTruth.size ? vf.filter((k) => vendorTruth.has(k)).length / vendorTruth.size : null, flagged: vf.length, precision: vf.length ? vf.filter((k) => vendorTruth.has(k)).length / vf.length : null });
  const scTruth = new Set(dataset.truth.scenarios.sc_st_shortfall || []);
  const scFlag = compliance.filter((c) => !c.scOk || !c.stOk).map((c) => `${c.constituency}|${c.fy}`);
  evaluation.checks.push({ code: "SC_ST", title: "SC/ST allocation below 15% / 7.5%", kind: "rule", planted: scTruth.size, found: scFlag.filter((k) => scTruth.has(k)).length, recall: scTruth.size ? scFlag.filter((k) => scTruth.has(k)).length / scTruth.size : null, flagged: scFlag.length, precision: null });
  const rushTruth = new Set(dataset.truth.scenarios.year_end_rush || []);
  const rushFlag = trendAlerts.map((t) => `${t.constituency}|${t.month}`);
  evaluation.checks.push({ code: "TREND", title: "Burst of sanctions (trend alert)", kind: "statistical", planted: rushTruth.size, found: rushFlag.filter((k) => rushTruth.has(k)).length, recall: rushTruth.size ? rushFlag.filter((k) => rushTruth.has(k)).length / rushTruth.size : null, flagged: rushFlag.length, precision: rushFlag.length ? rushFlag.filter((k) => rushTruth.has(k)).length / rushFlag.length : null });
  const controlTest = {
    control_large_but_fair: "COST", control_approved_extension: "DEADLINE", control_phase_two: "DUPLICATE", control_missing_quantity: "COST",
    control_minor_revision: "COST_OVERRUN", control_permissible_lookalike: "NOT_PERMISSIBLE", control_far_apart_small_works: "SPLIT",
  };
  for (const [ctl, code] of Object.entries(controlTest)) {
    const list = (dataset.truth.controls[ctl] || []).map((id) => byId.get(id)).filter((w) => w && !w.truth.some((t) => !t.startsWith("control")));
    const wrong = list.filter((w) => w.checks[code] === "flag").length;
    const cannot = list.filter((w) => w.checks[code] === "na").length;
    evaluation.controls.push({ control: ctl, check: code, cases: list.length, falseAlerts: wrong, cannotAssess: cannot });
  }

  return { today, works, byId, pairs, splitGroups: splitGroups.map((g) => g.map((w) => w.id)), utilisation, trendAlerts, vendorFlags, vendorStats: [...vendorStats.values()], compliance, evaluation, constituencies: dataset.constituencies, nationalContext: dataset.nationalContext, meta: dataset.meta };
}

// ---------- scoped summaries ----------
export function summarise(E, list) {
  const live = list.filter((w) => w.sanctionedOn && w.status !== "rejected");
  const paid = live.reduce((s, w) => s + (w.payments || []).reduce((t, p) => t + p.amount, 0), 0);
  const completed = live.filter((w) => w.markedCompleteOn);
  const levels = { high: 0, medium: 0, watch: 0, incomplete: 0, clear: 0 };
  list.forEach((w) => (levels[w.level] = (levels[w.level] || 0) + 1));
  const bySignal = {};
  list.forEach((w) => w.signals.forEach((s) => (bySignal[s.code] = (bySignal[s.code] || 0) + 1)));
  const lags = live.map((w) => w.sanctionLag).filter((x) => x != null);
  const doneOnTime = live.filter((w) => w.completedOn).map((w) => w.completedOn <= w.deadline);
  const payments = live.flatMap((w) => w.payments || []);
  return {
    works: list.length,
    funnel: {
      recommended: { n: list.length, cr: cr(list.reduce((s, w) => s + (w.sanctioned || w.estimate || 0), 0)) },
      sanctioned: { n: live.length, cr: cr(live.reduce((s, w) => s + w.sanctioned, 0)) },
      paid: { n: live.filter((w) => w.payments?.length).length, cr: cr(paid) },
      completed: { n: completed.length, cr: cr(completed.reduce((s, w) => s + w.sanctioned, 0)) },
    },
    levels, bySignal,
    atRiskCr: cr(list.filter((w) => w.level === "high" || w.level === "medium").reduce((s, w) => s + (w.sanctioned || 0), 0)),
    compliance: {
      sanctionWithin45: lags.length ? lags.filter((l) => l <= 45).length / lags.length : null,
      onTimeCompletion: doneOnTime.length ? doneOnTime.filter(Boolean).length / doneOnTime.length : null,
      photoCoverage: payments.length ? payments.filter((p) => p.photo).length / payments.length : null,
      medianSanctionLag: lags.length ? median(lags) : null,
    },
    earlyWarnings: list.filter((w) => w.checks.DELAY_RISK === "flag").length,
  };
}

export function monthly(list) {
  const m = new Map();
  const bump = (k, f, v) => { const r = m.get(k) || { month: k, sanctionedCr: 0, sanctionedN: 0, paidCr: 0, completedN: 0, flagged: 0 }; r[f] += v; m.set(k, r); };
  for (const w of list) {
    if (w.sanctionedOn && w.status !== "rejected") {
      bump(w.sanctionedOn.slice(0, 7), "sanctionedCr", w.sanctioned / 1e7);
      bump(w.sanctionedOn.slice(0, 7), "sanctionedN", 1);
      if (w.level === "high" || w.level === "medium") bump(w.sanctionedOn.slice(0, 7), "flagged", 1);
    }
    for (const p of w.payments || []) bump(p.on.slice(0, 7), "paidCr", p.amount / 1e7);
    if (w.markedCompleteOn) bump(w.markedCompleteOn.slice(0, 7), "completedN", 1);
  }
  return [...m.values()].sort((a, b) => a.month.localeCompare(b.month));
}
