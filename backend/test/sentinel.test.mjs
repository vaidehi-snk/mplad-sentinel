// Tests for the Sentinel engine and API: detection quality on the labelled demo
// dataset, the three-outcome contract, jurisdiction scoping and the ledger.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.NODE_ENV = "test";
process.env.SENTINEL_DB_PATH = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "sentinel-")), "test.db");
const { buildEngine } = await import("../engine/engine.mjs");
const { app } = await import("../src/server.mjs");
const dataset = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "demo", "works.json"), "utf8"));
const E = buildEngine(dataset);

test("every planted problem type is found at 90% recall or better", () => {
  for (const c of E.evaluation.checks) assert.ok(c.recall >= 0.9, `${c.code} recall ${c.recall}`);
});

test("statistical checks stay precise (>= 70%)", () => {
  for (const c of E.evaluation.checks.filter((x) => x.precision != null)) assert.ok(c.precision >= 0.7, `${c.code} precision ${c.precision}`);
});

test("legitimate look-alikes raise no false alarms", () => {
  for (const c of E.evaluation.controls) assert.equal(c.falseAlerts, 0, c.control);
});

test("missing quantity means 'cannot assess', never 'clear'", () => {
  const ids = dataset.truth.controls.control_missing_quantity;
  for (const id of ids) {
    const w = E.byId.get(id);
    if (w.sanctionedOn && w.status !== "rejected") assert.equal(w.checks.COST, "na", id);
  }
});

test("delay model beats chance on a temporal hold-out", () => {
  assert.ok(E.evaluation.model.testAuc > 0.7, `AUC ${E.evaluation.model.testAuc}`);
});

test("every signal carries evidence, an innocent explanation and a next step", () => {
  for (const w of E.works) for (const s of w.signals) {
    assert.ok(s.message && s.innocent && s.action && s.basis, `${w.id} ${s.code}`);
  }
});

// ---- API ----
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api`;
const post = (p, body, token) => fetch(base + p, { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, body: await r.json() }));
const get = (p, token) => fetch(base + p, { headers: { Authorization: `Bearer ${token}` } }).then(async (r) => ({ status: r.status, body: await r.json() }));
test.after(() => server.close());

test("a district desk cannot widen its own scope", async () => {
  const { body } = await post("/session", { role: "district", jurisdiction: "Nashik" });
  const r = await get("/brief?state=Bihar", body.token);
  assert.equal(r.body.scope.label, "Nashik");
  const other = E.works.find((w) => w.district !== "Nashik");
  const c = await get(`/cases/${encodeURIComponent(other.id)}`, body.token);
  assert.equal(c.status, 404);
});

test("unknown roles and jurisdictions are refused", async () => {
  assert.equal((await post("/session", { role: "admin" })).status, 400);
  assert.equal((await post("/session", { role: "state", jurisdiction: "Atlantis" })).status, 400);
});

test("MPs can read but not record decisions; notes are required", async () => {
  const w = E.works.find((x) => x.constituency === "Nashik" && x.level === "high");
  const mp = (await post("/session", { role: "mp", jurisdiction: "Nashik" })).body.token;
  assert.equal((await post(`/cases/${encodeURIComponent(w.id)}/decision`, { decision: "cleared", note: "Looks fine to me overall" }, mp)).status, 403);
  const da = (await post("/session", { role: "district", jurisdiction: "Nashik" })).body.token;
  assert.equal((await post(`/cases/${encodeURIComponent(w.id)}/decision`, { decision: "escalate", note: "short" }, da)).status, 400);
  const ok = await post(`/cases/${encodeURIComponent(w.id)}/decision`, { decision: "escalate", note: "Unit cost far above peers; BOQ requested" }, da);
  assert.equal(ok.status, 200);
  const v = await post("/ledger/verify", {}, da);
  assert.equal(v.body.ok, true);
  assert.ok(v.body.checked >= 3);
});

test("the eligibility screen reads English and Hindi and spares look-alikes", async () => {
  const { screenText } = await import("../engine/engine.mjs");
  assert.equal(screenText("Painting and whitewashing of community hall at Rampur")[0].key, "maintenance");
  assert.equal(screenText("राम मंदिर परिसर में चबूतरा निर्माण")[0].key, "religious");
  assert.equal(screenText("Construction of CC road from Rampur to Hanuman temple").length, 0);
  assert.equal(screenText("Special repair of school roof at Rampur (restoration of durable asset)").length, 0);
  for (const w of E.works) if (!w.truth.includes("not_permissible")) assert.notEqual(w.checks.NOT_PERMISSIBLE, "flag", w.title);
});

test("trend alerts find the planted year-end rushes and nothing else", () => {
  const t = E.evaluation.checks.find((c) => c.code === "TREND");
  assert.equal(t.recall, 1);
  assert.equal(t.precision, 1);
});

test("new unreviewed cases escalate to the State after the SLA; the backlog does not", async () => {
  const st = (await post("/session", { role: "state", jurisdiction: "Maharashtra" })).body.token;
  const { body } = await get("/cases?escalated=1&size=100", st);
  for (const w of body.items) {
    assert.equal(w.escalation.stage, "state");
    assert.ok(w.openSince > dataset.meta.goLive, w.id);
    assert.ok(w.escalation.age > w.escalation.sla, w.id);
  }
});
