export const utilizationTrend = [
  { month: "Apr", utilized: 22 },
  { month: "May", utilized: 31 },
  { month: "Jun", utilized: 38 },
  { month: "Jul", utilized: 44 },
  { month: "Aug", utilized: 53 },
  { month: "Sep", utilized: 61 },
];

export const works = [
  {
    id: "W-2291",
    name: "Concrete road, Ward 14",
    constituency: "Nagpur",
    state: "Maharashtra",
    contractor: "Shreeji Infra Works",
    sanctioned: 4200000,
    utilized: 3950000,
    score: 91,
    level: "high",
    reasons: [
      { label: "Cost 2.8x median for similar road length in district", weight: 40 },
      { label: "Contractor awarded 3 MPLAD works this quarter alone", weight: 30 },
      { label: "No geotagged completion photo on file", weight: 21 },
    ],
    lastUpdated: "2 days ago",
  },
  {
    id: "W-2288",
    name: "Community hall renovation",
    constituency: "Nagpur",
    state: "Maharashtra",
    contractor: "Vasant Builders",
    sanctioned: 1800000,
    utilized: 1800000,
    score: 76,
    level: "high",
    reasons: [
      { label: "Full amount released before work marked started", weight: 48 },
      { label: "Same bank account used by two unrelated contractors", weight: 28 },
    ],
    lastUpdated: "5 days ago",
  },
  {
    id: "W-2265",
    name: "Solar streetlights, Sector 9",
    constituency: "Nagpur",
    state: "Maharashtra",
    contractor: "Lumen Energy Pvt Ltd",
    sanctioned: 950000,
    utilized: 620000,
    score: 38,
    level: "medium",
    reasons: [
      { label: "Utilization pace slower than 80% of comparable works", weight: 38 },
    ],
    lastUpdated: "1 week ago",
  },
  {
    id: "W-2240",
    name: "Drinking water pipeline extension",
    constituency: "Nagpur",
    state: "Maharashtra",
    contractor: "Jeevan Jal Constructions",
    sanctioned: 2600000,
    utilized: 2450000,
    score: 12,
    level: "low",
    reasons: [
      { label: "All checkpoints matched expected cost and timeline", weight: 12 },
    ],
    lastUpdated: "3 weeks ago",
  },
  {
    id: "W-2198",
    name: "Primary school classroom block",
    constituency: "Nashik",
    state: "Maharashtra",
    contractor: "Shreeji Infra Works",
    sanctioned: 3100000,
    utilized: 3100000,
    score: 84,
    level: "high",
    reasons: [
      { label: "Same contractor as W-2291, overlapping timeline", weight: 44 },
      { label: "Cost 1.9x median for similar classroom blocks", weight: 40 },
    ],
    lastUpdated: "4 days ago",
  },
];

export const ledger = [
  { id: 1, action: "FUND_RELEASED", work: "W-2291", actor: "District Nodal Officer", hash: "9f3a1c...4e8b", prev: "0000000...0000" },
  { id: 2, action: "RISK_FLAGGED", work: "W-2291", actor: "Sentinel Engine", hash: "2b77d0...91fa", prev: "9f3a1c...4e8b" },
  { id: 3, action: "FUND_RELEASED", work: "W-2288", actor: "District Nodal Officer", hash: "c410e2...0d3c", prev: "2b77d0...91fa" },
  { id: 4, action: "STATUS_UPDATE", work: "W-2265", actor: "Field Engineer", hash: "77aa9b...552e", prev: "c410e2...0d3c" },
  { id: 5, action: "RISK_FLAGGED", work: "W-2288", actor: "Sentinel Engine", hash: "e01f88...3a6d", prev: "77aa9b...552e" },
  { id: 6, action: "CITIZEN_VERIFIED", work: "W-2240", actor: "Public Report #4471", hash: "44d2b1...c907", prev: "e01f88...3a6d" },
];

export const citizenReports = [
  { work: "W-2240", note: "Pipeline visibly complete near market road", status: "confirmed" },
  { work: "W-2265", note: "Half the streetlights installed, rest missing", status: "disputed" },
  { work: "W-2291", note: "No visible road work at listed location", status: "disputed" },
];

export const networkNodes = [
  { id: "Shreeji Infra Works", x: 190, y: 90, type: "contractor", flagged: true },
  { id: "Vasant Builders", x: 340, y: 60, type: "contractor", flagged: true },
  { id: "W-2291", x: 110, y: 190, type: "work", flagged: true },
  { id: "W-2198", x: 250, y: 200, type: "work", flagged: true },
  { id: "W-2288", x: 390, y: 170, type: "work", flagged: true },
  { id: "Acc. 8827XXXX", x: 300, y: 260, type: "account", flagged: true },
  { id: "Lumen Energy Pvt Ltd", x: 540, y: 100, type: "contractor", flagged: false },
  { id: "W-2265", x: 560, y: 210, type: "work", flagged: false },
];

export const networkEdges = [
  ["Shreeji Infra Works", "W-2291"],
  ["Shreeji Infra Works", "W-2198"],
  ["Vasant Builders", "W-2288"],
  ["Vasant Builders", "Acc. 8827XXXX"],
  ["W-2288", "Acc. 8827XXXX"],
  ["Lumen Energy Pvt Ltd", "W-2265"],
];

export const fmt = (n) => "\u20b9" + (n / 100000).toFixed(1) + "L";

export const levelColor = (level) =>
  level === "high" ? "#C0392B" : level === "medium" ? "#C9A227" : "#2F9E6E";
