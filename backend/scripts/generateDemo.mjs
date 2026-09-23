// Generates the Sentinel demo dataset: synthetic MPLADS works shaped like eSAKSHI
// records (recommendation -> sanction -> staged payments with photos -> completion).
// Deterministic (seeded). Planted scenarios AND legitimate look-alikes are recorded
// in `truth` so detection can be measured honestly. Place names are real geography;
// MPs, agencies and vendors are generic/fictional and must not be read as allegations.
//
//   node backend/scripts/generateDemo.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "data", "demo", "works.json");
export const AS_OF = "2026-09-21";

// ---------- seeded randomness ----------
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(260102);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const between = (lo, hi) => lo + rnd() * (hi - lo);
const int = (lo, hi) => Math.floor(between(lo, hi + 1));
const chance = (p) => rnd() < p;
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const lognorm = (mu, s) => Math.exp(mu + s * gauss());

const DAY = 86400000;
const d = (s) => new Date(s + "T00:00:00Z");
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const addDays = (s, n) => iso(d(s).getTime() + Math.round(n) * DAY);
const diffDays = (a, b) => Math.round((d(b) - d(a)) / DAY);
const TODAY = AS_OF;

// ---------- geography (real places, approximate centroids) ----------
const STATES = [
  { state: "Maharashtra", code: "MH", cost: 1.08, pcs: [
    ["Nashik", "Nashik", 19.99, 73.79], ["Pune", "Pune", 18.52, 73.86], ["Nagpur", "Nagpur", 21.15, 79.09],
    ["Aurangabad", "Chhatrapati Sambhajinagar", 19.88, 75.34], ["Jalgaon", "Jalgaon", 21.0, 75.56]] },
  { state: "Uttar Pradesh", code: "UP", cost: 0.94, pcs: [
    ["Lucknow", "Lucknow", 26.85, 80.95], ["Varanasi", "Varanasi", 25.32, 82.97], ["Gorakhpur", "Gorakhpur", 26.76, 83.37],
    ["Agra", "Agra", 27.18, 78.01, "SC"], ["Bareilly", "Bareilly", 28.37, 79.43]] },
  { state: "Bihar", code: "BR", cost: 0.92, pcs: [
    ["Patna Sahib", "Patna", 25.59, 85.14], ["Gaya", "Gaya", 24.79, 85.0, "SC"], ["Muzaffarpur", "Muzaffarpur", 26.12, 85.39],
    ["Bhagalpur", "Bhagalpur", 25.24, 86.98], ["Darbhanga", "Darbhanga", 26.15, 85.9]] },
  { state: "West Bengal", code: "WB", cost: 0.97, pcs: [
    ["Kolkata Dakshin", "Kolkata", 22.5, 88.35], ["Howrah", "Howrah", 22.59, 88.31], ["Darjeeling", "Darjeeling", 27.04, 88.26],
    ["Bardhaman-Durgapur", "Paschim Bardhaman", 23.52, 87.32], ["Diamond Harbour", "South 24 Parganas", 22.19, 88.19]] },
  { state: "Tamil Nadu", code: "TN", cost: 1.05, pcs: [
    ["Chennai South", "Chennai", 13.0, 80.25], ["Madurai", "Madurai", 9.93, 78.12], ["Coimbatore", "Coimbatore", 11.02, 76.96],
    ["Tiruchirappalli", "Tiruchirappalli", 10.8, 78.69], ["Salem", "Salem", 11.66, 78.15]] },
  { state: "Rajasthan", code: "RJ", cost: 1.0, pcs: [
    ["Jaipur", "Jaipur", 26.91, 75.79], ["Jodhpur", "Jodhpur", 26.24, 73.02], ["Udaipur", "Udaipur", 24.59, 73.71, "ST"],
    ["Bikaner", "Bikaner", 28.02, 73.31, "SC"], ["Kota", "Kota", 25.18, 75.83]] },
  { state: "Odisha", code: "OD", cost: 0.96, pcs: [
    ["Bhubaneswar", "Khordha", 20.3, 85.82], ["Cuttack", "Cuttack", 20.46, 85.88], ["Koraput", "Koraput", 18.81, 82.71, "ST"],
    ["Sambalpur", "Sambalpur", 21.47, 83.97], ["Puri", "Puri", 19.81, 85.83]] },
  { state: "Karnataka", code: "KA", cost: 1.1, pcs: [
    ["Bangalore South", "Bengaluru Urban", 12.93, 77.58], ["Mysore", "Mysuru", 12.3, 76.64], ["Belgaum", "Belagavi", 15.85, 74.5],
    ["Gulbarga", "Kalaburagi", 17.33, 76.83, "SC"], ["Dharwad", "Dharwad", 15.46, 75.01]] },
];

// ---------- work catalogue: unit-rate benchmarks so cost checks compare like with like ----------
const CATS = {
  road: { label: "CC road", unit: "km", rate: 4500000, q: [0.2, 2.4], days: 200, t: ["Construction of CC road from {a} to {b}", "Cement concrete road in {a} village, ward {w}"], hi: "ग्राम {a} में सीसी सड़क निर्माण" },
  hall: { label: "Community hall", unit: "sq m", rate: 22000, q: [120, 420], days: 300, t: ["Construction of community hall at {a}", "Community hall with kitchen at {a}"], hi: "{a} में सामुदायिक भवन का निर्माण" },
  classroom: { label: "School classrooms", unit: "classroom", rate: 900000, q: [1, 6], days: 240, t: ["Additional classrooms at Govt. school, {a}", "Construction of classrooms at ZP school {a}"], hi: "राजकीय विद्यालय {a} में अतिरिक्त कक्ष" },
  water: { label: "Drinking water", unit: "borewell", rate: 180000, q: [1, 10], days: 90, t: ["Borewells with hand pumps at {a}", "Drinking water borewell at {a} ward {w}"], hi: "ग्राम {a} में हैंडपंप सहित बोरवेल" },
  solar: { label: "Solar street lights", unit: "light", rate: 32000, q: [10, 120], days: 100, t: ["Solar street lights in {a}", "Installation of solar high-mast lights at {a}"], hi: "{a} में सोलर स्ट्रीट लाइट" },
  toilet: { label: "Public toilet block", unit: "seat", rate: 110000, q: [4, 20], days: 150, t: ["Public toilet block at {a} market", "Community sanitary complex at {a}"], hi: "{a} में सामुदायिक शौचालय" },
  drain: { label: "Drainage", unit: "m", rate: 6500, q: [100, 1200], days: 160, t: ["Covered drain from {a} to {b}", "Storm water drain in {a}, ward {w}"], hi: "{a} में नाली निर्माण" },
  anganwadi: { label: "Anganwadi centre", unit: "centre", rate: 1100000, q: [1, 2], days: 220, t: ["Construction of anganwadi centre at {a}"], hi: "{a} में आंगनवाड़ी केंद्र भवन" },
  shelter: { label: "Bus shelter", unit: "shelter", rate: 400000, q: [1, 5], days: 90, t: ["Bus shelters on {a}-{b} road"], hi: "{a}-{b} मार्ग पर यात्री प्रतीक्षालय" },
  gym: { label: "Open gym / sports", unit: "set", rate: 600000, q: [1, 4], days: 110, t: ["Open gym equipment at {a} park", "Sports facility at {a} ground"], hi: "{a} पार्क में ओपन जिम" },
};
const CAT_KEYS = Object.keys(CATS);
const CAT_WEIGHTS = [0.24, 0.1, 0.1, 0.11, 0.11, 0.08, 0.1, 0.05, 0.05, 0.06];
const pickCat = () => { let r = rnd(), acc = 0; for (let i = 0; i < CAT_KEYS.length; i++) { acc += CAT_WEIGHTS[i]; if (r < acc) return CAT_KEYS[i]; } return "road"; };
const HINDI_STATES = new Set(["Uttar Pradesh", "Bihar", "Rajasthan"]);

const VILLAGE_A = ["Ram", "Shiv", "Kalyan", "Sona", "Hari", "Ganga", "Lakshmi", "Chandan", "Moti", "Anand", "Dev", "Gopal", "Sundar", "Nav", "Bhim", "Kesar"];
const VILLAGE_B = ["pur", "nagar", "gaon", "wadi", "ganj", "pura", "khedi", "tola", "palli", "garh", "wada", "halli"];
const VILLAGE_A_HI = ["राम", "शिव", "कल्याण", "सोना", "हरि", "गंगा", "लक्ष्मी", "चंदन", "मोती", "आनंद", "देव", "गोपाल", "सुंदर", "नव", "भीम", "केसर"];
const VILLAGE_B_HI = ["पुर", "नगर", "गांव", "वाड़ी", "गंज", "पुरा", "खेड़ी", "टोला", "पल्ली", "गढ़", "वाड़ा", "हल्ली"];
const placePair = () => { const i = Math.floor(rnd() * VILLAGE_A.length), j = Math.floor(rnd() * VILLAGE_B.length); return [VILLAGE_A[i] + VILLAGE_B[j], VILLAGE_A_HI[i] + VILLAGE_B_HI[j]]; };
const place = () => placePair()[0];
const FIRM_A = ["Shree", "Sai", "Om", "Maa", "Jai", "New", "Royal", "Laxmi", "Ganesh", "Balaji", "Durga", "Krishna", "Vijay", "Sagar"];
const FIRM_B = ["Constructions", "Infra", "Builders", "Enterprises", "Engineering Works", "Contractors", "Associates", "Buildcon"];

// ---------- build ----------
const FYS = [["2023-24", "2023-04-01"], ["2024-25", "2024-04-01"], ["2025-26", "2025-04-01"], ["2026-27", "2026-04-01"]];
const works = [];
const constituencies = [];
const truthLog = { scenarios: {}, controls: {} };
const plant = (w, kind, bucket = "scenarios") => {
  w.truth.push(kind);
  (truthLog[bucket][kind] ||= []).push(w.id);
};

for (const st of STATES) {
  for (const [pc, district, lat, lng, reserved] of st.pcs) {
    const pcCode = pc.slice(0, 3).toUpperCase();
    const vendors = Array.from({ length: 12 }, () => `${pick(FIRM_A)} ${pick(FIRM_B)}`).filter((v, i, a) => a.indexOf(v) === i);
    const agencies = [`Zilla Parishad, ${district}`, `PWD Division, ${district}`, `Rural Works Dept., ${district}`, `Municipal Corporation, ${district}`, `Block Development Office, ${place()}`];
    const vendorReliability = Object.fromEntries(vendors.map((v) => [v, lognorm(0, 0.25)]));
    const iaLoad = Object.fromEntries(agencies.map((a) => [a, between(0.8, 1.4)]));
    // One vendor per constituency is the "favoured" firm in ~30% of constituencies
    const concentrated = chance(0.3) ? vendors[0] : null;
    // Some MPs under-allocate to SC / ST areas (compliance scenario)
    const scShortfall = chance(0.25);
    const mp = `MP, ${pc}`;
    constituencies.push({ pc, district, state: st.state, code: st.code, lat, lng, reserved: reserved || "GEN", mp });

    let seq = 0;
    for (const [fy, fyStart] of FYS) {
      const fyEnd = addDays(fyStart, 364);
      if (fyStart > TODAY) continue;
      const windowEnd = fyEnd < TODAY ? fyEnd : TODAY;
      let budget = 50000000; // ₹5 crore entitlement per year
      let scAmt = 0, stAmt = 0;
      const nWorks = fy === "2026-27" ? int(5, 11) : int(14, 22);
      for (let k = 0; k < nWorks && budget > 800000; k++) {
        seq++;
        const cat = pickCat();
        const C = CATS[cat];
        const [a, aHi] = placePair(), [b, bHi] = placePair();
        let qty = C.unit === "km" ? +between(...C.q).toFixed(2) : Math.round(between(...C.q));
        const unitRate = C.rate * st.cost * lognorm(0, 0.12);
        let estimate = Math.round(qty * unitRate / 1000) * 1000;
        if (estimate > budget) continue;
        const useHindi = HINDI_STATES.has(st.state) && chance(0.35);
        const title = useHindi ? C.hi.replace("{a}", aHi).replace("{b}", bHi) : pick(C.t).replace("{a}", a).replace("{b}", b).replace("{w}", int(1, 24));
        const recommendedOn = addDays(fyStart, between(0, Math.max(1, diffDays(fyStart, windowEnd) - 5)));
        if (recommendedOn > TODAY) continue;
        // SC/ST area tagging; shortfall MPs tag fewer works
        const scProb = scShortfall ? 0.05 : (reserved === "SC" ? 0.36 : 0.27);
        const stProb = scShortfall ? 0.02 : (reserved === "ST" ? 0.34 : 0.17);
        const scArea = chance(scProb), stArea = !scArea && chance(stProb);
        const ia = pick(agencies);
        const vendor = concentrated && chance(0.45) ? concentrated : pick(vendors);
        const id = `MP/${st.code}/${pcCode}/${fy.slice(2, 4)}${fy.slice(5, 7)}/${String(seq).padStart(4, "0")}`;
        const w = {
          id, title, lang: useHindi ? "hi" : "en", category: cat, categoryLabel: C.label, unit: C.unit, quantity: qty,
          state: st.state, stateCode: st.code, district, constituency: pc, mp, fy,
          implementingAgency: ia, vendor, scArea, stArea,
          lat: +(lat + gauss() * 0.08).toFixed(5), lng: +(lng + gauss() * 0.08).toFixed(5),
          estimate, sanctioned: null, recommendedOn, sanctionedOn: null, deadline: null,
          extension: null, status: "recommended", progress: 0, payments: [],
          completedOn: null, markedCompleteOn: null, ucUploaded: false, rejectedReason: null, truth: [],
        };

        // --- sanction ---
        let lag = lognorm(Math.log(18), 0.45);
        if (chance(0.07)) { lag = between(62, 170); plant(w, "sanction_delay"); }
        const sanctionedOn = addDays(recommendedOn, lag);
        if (chance(0.03) && sanctionedOn <= TODAY) {
          w.status = "rejected"; w.rejectedReason = "Work not permissible under scheme guidelines"; w.sanctionedOn = sanctionedOn;
          works.push(w); continue;
        }
        if (sanctionedOn > TODAY) { works.push(w); budget -= estimate; continue; }
        w.sanctionedOn = sanctionedOn;
        w.sanctioned = estimate;

        // --- planted cost inflation vs legitimate big work ---
        if (chance(0.06)) { w.sanctioned = Math.round(estimate * between(1.9, 3.1) / 1000) * 1000; w.estimate = w.sanctioned; plant(w, "cost_inflation"); }
        else if (chance(0.03)) { // legitimately large: more quantity, normal unit rate
          const f = between(2.2, 3.0); w.quantity = C.unit === "km" ? +(qty * f).toFixed(2) : Math.round(qty * f);
          w.sanctioned = Math.round(w.quantity * unitRate / 1000) * 1000; w.estimate = w.sanctioned; plant(w, "control_large_but_fair", "controls");
        }
        budget -= w.sanctioned;
        if (scArea) scAmt += w.sanctioned; if (stArea) stAmt += w.sanctioned;

        // --- execution timeline ---
        let deadline = addDays(sanctionedOn, 365);
        if (chance(0.05)) { deadline = addDays(sanctionedOn, 540); w.extension = { days: 175, reason: "Monsoon damage to site; revised timeline recorded in sanction order" }; plant(w, "control_approved_extension", "controls"); }
        w.deadline = deadline;
        const expected = C.days * lognorm(0, 0.18) * iaLoad[ia] * vendorReliability[vendor] * (w.sanctioned > 3000000 ? 1.15 : 1);
        let actual = expected;
        let overdue = false;
        if (chance(0.08)) { actual = diffDays(sanctionedOn, deadline) + between(60, 300); overdue = true; plant(w, "overdue"); }
        const finishOn = addDays(sanctionedOn, actual);
        const elapsed = diffDays(sanctionedOn, TODAY);
        w.progress = Math.max(0, Math.min(100, Math.round((elapsed / actual) * 100)));
        if (overdue && w.progress >= 100) w.progress = int(55, 90);

        // --- staged payments (eSAKSHI: vendor payments with asset photographs) ---
        const stages = [[30, 0.3], [60, 0.6], [90, 0.9], [100, 1.0]];
        const noPhoto = chance(0.05);
        const advance = !noPhoto && chance(0.04);
        let noPhotoDone = false;
        for (const [pct, f] of stages) {
          const need = advance ? f * 0.45 : f; // advance scenario pays ahead of physical progress
          if (w.progress / 100 < need) break;
          const payOn = addDays(sanctionedOn, actual * need + between(3, 20));
          if (payOn > TODAY) break;
          const photo = !(noPhoto && !noPhotoDone && pct >= 60);
          if (!photo) noPhotoDone = true;
          w.payments.push({ stage: pct, amount: Math.round(w.sanctioned * (pct === 30 ? 0.3 : 0.3 * (pct < 100 ? 1 : 1 / 3))), cumulativePct: pct, on: payOn, photo });
        }
        if (noPhotoDone) plant(w, "payment_without_photo");
        if (advance && w.payments.length && w.payments.at(-1).cumulativePct > w.progress + 20) plant(w, "payment_ahead_of_progress");

        const paidFull = w.payments.some((p) => p.stage === 100);
        w.status = w.progress >= 100 ? "completed" : w.payments.length ? "in_progress" : "sanctioned";
        if (w.progress >= 100) {
          w.completedOn = finishOn <= TODAY ? finishOn : TODAY;
          if (paidFull && chance(0.06) && diffDays(w.completedOn, TODAY) > 75) {
            plant(w, "paid_not_marked_complete");
            w.status = "in_progress";
          } else {
            w.markedCompleteOn = addDays(w.completedOn, between(4, 30));
            if (w.markedCompleteOn > TODAY) w.markedCompleteOn = null;
            w.ucUploaded = !!w.markedCompleteOn && chance(0.93);
          }
        }
        // a slice of records arrive with gaps -> "cannot assess", never a silent pass
        if (chance(0.025)) { w.quantity = null; plant(w, "control_missing_quantity", "controls"); }
        works.push(w);
      }
      constituencies.at(-1)[`share_${fy}`] = { sc: scAmt, st: stAmt };
      if (scShortfall && fy !== "2026-27") (truthLog.scenarios.sc_st_shortfall ||= []).push(`${pc}|${fy}`);
    }
    if (concentrated) (truthLog.scenarios.vendor_concentration ||= []).push(`${pc}|${concentrated}`);
  }
}

// ---------- duplicates: same asset recommended twice, plus legitimate phase-II look-alikes ----------
const eligible = works.filter((w) => w.sanctionedOn && w.status !== "rejected" && w.lang === "en");
for (let i = 0; i < 26; i++) {
  const src = pick(eligible);
  const later = addDays(src.sanctionedOn, between(40, 400));
  if (later > TODAY) continue;
  const dup = structuredClone(src);
  dup.id = src.id.replace(/\/(\d{4})$/, (_, n) => `/${String(9000 + i).padStart(4, "0")}`);
  dup.title = src.title.replace(/^Construction of /, "Constn. of ").replace(" to ", " upto ");
  dup.lat = +(src.lat + gauss() * 0.0008).toFixed(5); dup.lng = +(src.lng + gauss() * 0.0008).toFixed(5);
  dup.recommendedOn = addDays(later, -20); dup.sanctionedOn = later; dup.deadline = addDays(later, 365);
  dup.vendor = chance(0.5) ? src.vendor : dup.vendor;
  dup.truth = []; dup.progress = Math.min(int(0, 45), Math.max(0, diffDays(later, TODAY) / 4 | 0));
  dup.payments = dup.progress >= 30 ? [{ stage: 30, amount: Math.round(dup.sanctioned * 0.3), cumulativePct: 30, on: addDays(later, int(40, 90)), photo: true }].filter((p) => p.on <= TODAY) : [];
  dup.status = dup.payments.length ? "in_progress" : "sanctioned";
  dup.extension = null;
  dup.completedOn = null; dup.markedCompleteOn = null; dup.ucUploaded = false;
  dup.duplicateOf = src.id;
  plant(dup, "duplicate");
  works.push(dup);
}
for (let i = 0; i < 12; i++) { // legitimate: same road, next segment, far enough apart, "Phase II"
  const src = pick(eligible.filter((w) => w.category === "road"));
  const ph = structuredClone(src);
  ph.id = src.id.replace(/\/(\d{4})$/, () => `/${String(9500 + i).padStart(4, "0")}`);
  ph.title = src.title + " — Phase II (next segment)";
  ph.lat = +(src.lat + 0.03 + rnd() * 0.02).toFixed(5); ph.lng = +(src.lng + 0.03).toFixed(5);
  ph.truth = []; plant(ph, "control_phase_two", "controls");
  works.push(ph);
}

// ---------- second stream: overruns, non-permissible works, split works ----------
// A separate seed so the scenarios above stay byte-identical when these are tuned.
const r2 = mulberry32(2601020);
const pick2 = (a) => a[Math.floor(r2() * a.length)];
const between2 = (lo, hi) => lo + r2() * (hi - lo);
const clean = () => works.filter((w) => w.sanctionedOn && w.status !== "rejected" && !w.truth.length && !w.duplicateOf && !w.revisions && !w.splitGroup);
const takeClean = (pred) => { const pool = clean().filter(pred); return pool.length ? pick2(pool) : null; };

// Cost overrun: revised estimate well above the sanctioned cost, or payments beyond the sanction.
for (let i = 0; i < 26; i++) {
  const w = takeClean((x) => x.payments.length >= 2);
  if (!w) break;
  const at = w.payments[Math.min(1, w.payments.length - 1)].on;
  if (i % 3 === 2 && w.payments.some((p) => p.stage === 100)) { // paid beyond sanction, no revision on record
    const extra = Math.round(w.sanctioned * between2(0.14, 0.4) / 1000) * 1000;
    w.payments.push({ stage: 100, amount: extra, cumulativePct: 100, on: addDays(w.payments.at(-1).on, between2(10, 60)), photo: true, extraBill: true });
  } else {
    const f = between2(1.28, 1.9);
    w.revisions = [{ on: at, from: w.sanctioned, to: Math.round(w.sanctioned * f / 1000) * 1000, reason: pick2(["Revised estimate: change in scope", "Revised estimate submitted by agency", "Additional items added during execution"]) }];
  }
  plant(w, "cost_overrun");
}
for (let i = 0; i < 14; i++) { // legitimate: small revision after a Schedule of Rates update
  const w = takeClean((x) => x.payments.length >= 1);
  if (!w) break;
  w.revisions = [{ on: w.payments[0].on, from: w.sanctioned, to: Math.round(w.sanctioned * between2(1.04, 1.15) / 1000) * 1000, reason: "Schedule of Rates revised by the State" }];
  plant(w, "control_minor_revision", "controls");
}

// Works the guidelines do not permit, written the way real records read (English and Hindi).
const NOT_PERMISSIBLE = [
  ["Repair and maintenance of panchayat office building at {a}", "hall"],
  ["Painting and whitewashing of community hall at {a}", "hall"],
  ["Construction of compound wall inside Shiv temple premises, {a}", "hall"],
  ["Staff quarters for tehsil office at {a}", "hall"],
  ["Land acquisition for playground at {a}", "gym"],
  ["Construction of Late Shri R. K. Verma Smriti Bhavan at {a}", "hall"],
  ["Grant to {a} cooperative society for godown", "hall"],
  ["Furniture for private coaching institute at {a}", "classroom"],
  ["Annual maintenance of solar street lights in {a}", "solar"],
  ["Statue and memorial park at {a} chowk", "gym"],
  ["{a} मंदिर परिसर में चबूतरा निर्माण", "hall", "hi"],
  ["पंचायत भवन की मरम्मत एवं रखरखाव, {a}", "hall", "hi"],
];
const PERMISSIBLE_LOOKALIKES = [ // mention temples, offices or repairs but are allowed
  ["Construction of CC road from {a} to Hanuman temple", "road"],
  ["Covered drain along {a} temple road", "drain"],
  ["Bus shelter at {a} tehsil office junction", "shelter"],
  ["Special repair of school roof at {a} (restoration of durable asset)", "classroom"],
  ["Solar street lights on {a} church road", "solar"],
  ["Public toilet block near {a} bus stand and market", "toilet"],
];
const retitle = (list, bucket, kind) => list.forEach(([t, cat, lang]) => {
  const w = takeClean((x) => x.category === cat && (lang === "hi" ? HINDI_STATES.has(x.state) : true));
  if (!w) return;
  const [a, aHi] = placePair();
  w.title = t.replace("{a}", lang === "hi" ? aHi : a); w.lang = lang || "en";
  plant(w, kind, bucket);
});
retitle(NOT_PERMISSIBLE, "scenarios", "not_permissible");
retitle(PERMISSIBLE_LOOKALIKES, "controls", "control_permissible_lookalike");

// Split works: one job broken into several small sanctions for the same site, type and vendor,
// each just under the value above which an open tender is normally needed.
const SPLIT_LIMIT = 500000; // demo value; configurable per state in deployment
const splitClone = (src, k, value, dLat, dLng, dayOffset, idBase) => {
  const w = structuredClone(src);
  w.id = src.id.replace(/\/(\d{4})$/, () => `/${String(idBase + k).padStart(4, "0")}`);
  const C = CATS[src.category];
  const rate = src.sanctioned / (src.quantity || 1);
  w.quantity = C.unit === "km" ? +(value / rate).toFixed(2) : Math.max(1, Math.round(value / rate));
  w.sanctioned = w.estimate = Math.round(value / 1000) * 1000;
  w.lat = +(src.lat + dLat).toFixed(5); w.lng = +(src.lng + dLng).toFixed(5);
  w.sanctionedOn = addDays(src.sanctionedOn, dayOffset); w.recommendedOn = addDays(w.sanctionedOn, -between2(8, 30));
  w.deadline = addDays(w.sanctionedOn, 365); w.extension = null;
  w.progress = Math.min(100, Math.max(0, Math.round(diffDays(w.sanctionedOn, TODAY) / C.days * 100)));
  w.payments = [[30, 0.3], [60, 0.6], [90, 0.9], [100, 1]].filter(([s]) => w.progress >= s)
    .map(([s, f]) => ({ stage: s, amount: Math.round(w.sanctioned * (s === 30 ? 0.3 : s < 100 ? 0.3 : 0.1)), cumulativePct: s, on: addDays(w.sanctionedOn, C.days * f + 5), photo: true }))
    .filter((p) => p.on <= TODAY);
  w.completedOn = w.progress >= 100 ? addDays(w.sanctionedOn, C.days) : null;
  if (w.completedOn && w.completedOn > TODAY) w.completedOn = null;
  w.markedCompleteOn = w.completedOn ? addDays(w.completedOn, 10) : null;
  if (w.markedCompleteOn && w.markedCompleteOn > TODAY) w.markedCompleteOn = null;
  w.status = w.completedOn ? "completed" : w.payments.length ? "in_progress" : "sanctioned";
  w.truth = []; w.revisions = undefined; w.duplicateOf = undefined;
  return w;
};
const WARD_TITLES = { road: "Cement concrete road in {a} village, ward {w}", drain: "Storm water drain in {a}, ward {w}", solar: "Solar street lights in {a} ward {w}" };
for (let g = 0; g < 7; g++) {
  const src = takeClean((x) => WARD_TITLES[x.category] && x.lang === "en" && x.sanctionedOn < "2026-03-01");
  if (!src) break;
  const n = 3 + (g % 2), [a] = placePair();
  for (let k = 0; k < n; k++) {
    const ang = (k / n) * Math.PI * 2, rad = 0.004 + r2() * 0.003; // ~450-800 m apart: separate sites, one neighbourhood
    const w = splitClone(src, k, SPLIT_LIMIT * between2(0.86, 0.99), Math.cos(ang) * rad, Math.sin(ang) * rad, between2(0, 28), 9700 + g * 10);
    w.title = WARD_TITLES[src.category].replace("{a}", a).replace("{w}", 3 + k);
    w.splitGroup = `S${g}`;
    plant(w, "split_works");
    works.push(w);
  }
}
for (let g = 0; g < 4; g++) { // legitimate: same vendor wins several small works in far-apart villages
  const src = takeClean((x) => WARD_TITLES[x.category] && x.lang === "en" && x.sanctionedOn < "2026-03-01");
  if (!src) break;
  for (let k = 0; k < 3; k++) {
    const w = splitClone(src, k, SPLIT_LIMIT * between2(0.86, 0.99), 0.06 * (k - 1), 0.05 * (k % 2 ? 1 : -1), between2(0, 28), 9800 + g * 10);
    w.title = WARD_TITLES[src.category].replace("{a}", placePair()[0]).replace("{w}", 1 + k);
    plant(w, "control_far_apart_small_works", "controls");
    works.push(w);
  }
}

// Year-end rush: a burst of small sanctions in the last fortnight of March (a trend anomaly,
// not a per-work finding) in a few constituency-years.
for (const [g, fy] of [[0, "2024-25"], [1, "2025-26"], [2, "2025-26"]]) {
  const pool = clean().filter((x) => x.fy === fy && x.lang === "en" && x.category !== "road");
  const pc = pick2(pool).constituency;
  const endMar = `${Number(fy.slice(0, 4)) + 1}-03-31`;
  const src = pool.filter((x) => x.constituency === pc);
  for (let k = 0; k < 9; k++) {
    const s = pick2(src);
    const on = addDays(endMar, -between2(0, 13));
    const w = splitClone(s, k, between2(6e5, 1.6e6), gaussish(), gaussish(), diffDays(s.sanctionedOn, on), 9900 + g * 10);
    w.title = CATS[s.category].t[0].replace("{a}", placePair()[0]).replace("{b}", placePair()[0]).replace("{w}", 1 + k);
    w.yearEndRush = `${pc}|${fy}`;
    w.truth = [];
    works.push(w);
  }
  (truthLog.scenarios.year_end_rush ||= []).push(`${pc}|${endMar.slice(0, 7)}`);
}
function gaussish() { return (r2() - 0.5) * 0.2; }

const nationalContext = {
  source: "MPLADS eSAKSHI public dashboard (mplads.mospi.gov.in), 18th Lok Sabha, read 20 Sep 2026",
  allocatedCr: 8341.87, recommended: { works: 109404, cr: 5877.16 }, sanctioned: { works: 81453, cr: 4298.98 },
  completed: { works: 35560, cr: 1747.53 }, expenditureCr: 2850.93,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({
  meta: { generatedFor: "SIH26102 demo", asOf: AS_OF, seed: 260102, synthetic: true, splitLimit: SPLIT_LIMIT, goLive: "2026-08-01",
    note: "Synthetic works modelled on eSAKSHI fields. Real place names; MPs, agencies and vendors are generic. Not allegations about any real person or body." },
  nationalContext, constituencies, truth: truthLog, works,
}, null, 0));
const count = (k) => (truthLog.scenarios[k] || truthLog.controls[k] || []).length;
console.log(`Wrote ${works.length} works across ${constituencies.length} constituencies -> ${path.relative(process.cwd(), OUT)}`);
console.log(Object.fromEntries([...Object.keys(truthLog.scenarios), ...Object.keys(truthLog.controls)].map((k) => [k, count(k)])));
