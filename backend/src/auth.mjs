// Real authentication: JWT-signed tokens carrying role + jurisdiction.
// This closes a genuine gap the earlier version had -- "role" was only
// ever a client-side dropdown, so anyone could call the API directly and
// request any jurisdiction's data regardless of who they claimed to be
// at login. Every data-fetching route below now derives scope from the
// verified token, not from whatever the client's query string says.

import jwt from "jsonwebtoken";

// In a real deployment this MUST come from an environment variable, never
// a hardcoded string. Documented in the README as a required change
// before any real deployment.
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-change-before-deploying";
const TOKEN_TTL = "12h";

const VALID_ROLES = ["mp", "district", "state", "ministry"];

export function issueToken({ name, roleId, jurisdiction }) {
  if (!VALID_ROLES.includes(roleId)) throw new Error("Invalid role");
  // Ministry has no jurisdiction restriction by design (national oversight).
  const payload = { name, role: roleId, jurisdiction: roleId === "ministry" ? null : jurisdiction || null };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

// Attaches req.auth = { name, role, jurisdiction } from a valid Bearer
// token, or rejects the request. Every route that touches real data
// requires this.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token" });
  try {
    req.auth = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Restricts a route to specific roles (e.g. only oversight roles may
// trigger a full dataset re-ingestion). Must run after requireAuth.
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: "Not authenticated" });
    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ error: `This action requires one of: ${allowedRoles.join(", ")}` });
    }
    next();
  };
}

// Checks whether a specific already-fetched row falls within the
// caller's authorized scope -- needed because filtering a LIST isn't
// enough; someone could still request a single work by ID directly and
// bypass a list-level filter if this check didn't also exist.
export function isInScope(req, row) {
  const { role, jurisdiction } = req.auth;
  if (role === "ministry") return true;
  const roleField = { mp: "constituency", district: "district", state: "state" }[role];
  const rowValue = roleField === "district" ? row.district || row.constituency : row[roleField];
  return rowValue === jurisdiction;
}

// The core scoping fix: given the field name a route would filter on
// (constituency / district / state), returns the value to actually use --
// taken from the verified token for non-ministry roles (ignoring
// anything the client tried to pass in), or the client's optional query
// param for ministry (who's allowed to drill into any jurisdiction on
// demand, since they have no restriction to begin with).
export function resolveScope(req, field) {
  const { role, jurisdiction } = req.auth;
  if (role === "ministry") {
    return req.query[field] || null; // ministry may optionally filter, never restricted
  }
  const roleField = { mp: "constituency", district: "district", state: "state" }[role];
  // Only enforce the field that matches this role's own level. A district
  // token asking about "state" gets no filter on that field at all --
  // it should never be silently substituted with the wrong value.
  return roleField === field ? jurisdiction : null;
}
