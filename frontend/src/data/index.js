// Frontend-local fallback data only. This is NOT where real data lives
// anymore -- the backend (see /backend) owns ingestion, scoring, and the
// database. This file exists purely so the UI still demos something
// sensible if the backend API is unreachable (see src/api/client.js and
// the "Live API" / "Static fallback" badge in the top bar).
export {
  works,
  ledger,
  utilizationTrend,
  citizenReports,
  networkNodes,
  networkEdges,
  fmt,
  levelColor,
} from "./mockData";

export const usingRealData = false; // the frontend never claims this on its own; the API response does
