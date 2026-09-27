// Local demo sessions carry a role and jurisdiction; this is not identity verification.

import jwt from "jsonwebtoken";
import crypto from "node:crypto";

if (process.env.NODE_ENV === "production") throw new Error("Demo role selection is disabled in production. Configure verified identity before deployment.");
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString("hex");
const TOKEN_TTL = "12h";

const VALID_ROLES = ["mp", "district", "state", "ministry"];

export function issueToken({ name, roleId, jurisdiction }) {
  if (!VALID_ROLES.includes(roleId)) throw new Error("Invalid role");
  if (roleId !== "ministry" && !jurisdiction) throw new Error("Jurisdiction is required");
  // Ministry has no jurisdiction restriction by design (national oversight).
  const payload = { name, role: roleId, jurisdiction: roleId === "ministry" ? null : jurisdiction || null };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

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

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: "Not authenticated" });
    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ error: `This action requires one of: ${allowedRoles.join(", ")}` });
    }
    next();
  };
}

export function isInScope(req, row) {
  const { role, jurisdiction } = req.auth;
  if (role === "ministry") return true;
  const roleField = { mp: "constituency", district: "district", state: "state" }[role];
  const rowValue = roleField === "district" ? row.district || row.constituency : row[roleField];
  return rowValue === jurisdiction;
}

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
