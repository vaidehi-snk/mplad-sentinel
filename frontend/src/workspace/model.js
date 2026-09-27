export const decisionLabels = {
  under_review: "Under review",
  request_evidence: "Evidence requested",
  explained: "Explained",
  escalated: "Escalated",
};

export const money = (value) =>
  value == null
    ? "Not available"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(value);

export const compactMoney = (value) =>
  value >= 10000000
    ? `₹${(value / 10000000).toFixed(2)} cr`
    : value >= 100000
      ? `₹${(value / 100000).toFixed(2)} lakh`
      : money(value);

export function dateLabel(value) {
  if (!value) return "Not recorded";
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  const d = match
    ? new Date(+match[3], +match[2] - 1, +match[1])
    : new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

export const shortId = (id) => id?.split("/").slice(-2).join("/") || "—";
export const workUrl = (id) => `/app/works/${encodeURIComponent(id)}`;
export const hasSignal = (work) =>
  work.reasons?.some((reason) => reason.weight > 0);
export const categoryLabels = {
  road: "Roads & access",
  bridge: "Bridges",
  water: "Water supply",
  school: "Education",
  hall: "Community spaces",
  light: "Public lighting",
  sanitation: "Sanitation",
  other: "Other works",
};

export function latestReviews(reviews) {
  return Object.fromEntries(
    [...reviews]
      .sort((a, b) => a.id - b.id)
      .map((review) => [review.work, review]),
  );
}

export function eventLabel(action = "") {
  if (action.startsWith("REVIEW:"))
    return decisionLabels[action.split(":")[1]] || "Review recorded";
  return (
    {
      RECORD_IMPORTED: "Work record imported",
      RISK_FLAGGED: "Earlier screening flag",
      FIELD_VERIFICATION_REQUESTED: "Field verification requested",
      CITIZEN_REPORT_RECEIVED: "Observation received",
      FUND_RELEASED: "Legacy source event",
    }[action] || action.replaceAll("_", " ").toLowerCase()
  );
}

export function downloadFile(name, content, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportRegister(works) {
  const cell = (value) => {
    let text = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const rows = [
    [
      "Work ID",
      "Work",
      "District",
      "Implementing agency",
      "Sanction INR",
      "Priority score",
      "Snapshot date",
    ],
    ...works.map((w) => [
      w.id,
      w.name,
      w.district,
      w.contractor,
      w.sanctioned,
      w.score,
      w.lastUpdated,
    ]),
  ];
  downloadFile(
    "sentinel-work-register.csv",
    "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n"),
    "text/csv;charset=utf-8",
  );
}
