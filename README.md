# MPLAD Sentinel

An AI-assisted monitoring and analytics platform for MPLADS fund utilization
and work execution, built for SIH 2026.

## How to run it

Two terminals, in order:

```bash
# Terminal 1 — backend
cd backend
npm install
npm run start
# -> "MPLAD Sentinel API listening on http://localhost:4000"

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
# -> "Local: http://localhost:5173"
```

Open **http://localhost:5173** in your browser. That's it — the backend
seeds its own database automatically on first run.

To load the full real dataset instead of the 10-row sample: either use the
**Data Ingestion** tab in the app itself (upload a CSV directly), or run
`cd backend && npm run ingest -- path/to/downloaded.csv` before starting the
server. Download the CSV from https://dataful.in/datasets/18534/ (no signup).

## Is this a real platform?

Yes, in the sense that matters: it's a real website with a real backend, not
a static mockup or a slideshow. Concretely:

- It's a **full-stack web app** — a React frontend talking over HTTP to an
  Express + SQLite backend, exactly like a production system's architecture,
  just smaller in scale.
- Real actions produce real, persisted database changes: submitting a
  citizen report, requesting field verification, and uploading a CSV all
  write to the database and you can see the results immediately.
- The hash-chained ledger is genuinely computed and genuinely verified —
  clicking "Verify chain integrity" recomputes real SHA-256 hashes
  server-side, it doesn't just show a canned success message.

What it is **not**, to be precise about the word "complete":

- No login/authentication — "role" is a UI toggle, not tied to a real
  logged-in official's identity yet.
- Not deployed anywhere public yet — it runs on `localhost` until you deploy
  the `frontend/dist` folder and the `backend` to actual hosting (Vercel/
  Render/Railway are all reasonable free options for a hackathon demo).
  Ask if you want help doing that before the pitch.
- Two features are explicitly mocked (see below) because the data required
  doesn't exist anywhere publicly accessible right now.
- Scale is currently whatever you've ingested — hasn't been tested against
  the full ~947k-row dataset yet.

None of those are unusual for a hackathon-stage prototype — they're just
worth knowing precisely, not glossing over, if a judge probes.

## Feature status — the honest version

| Feature | Status |
|---|---|
| Role-based dashboards (MP / District / State Nodal / Ministry) | **Real** — each shows genuinely different scoped data with breakdown tables |
| Cost-anomaly detection | **Real** — compares each work to the real median for similar work types in its state |
| Same-day batch-approval detection | **Real** |
| Duplicate-work detection | **Real** |
| Long-pending heuristic | **Real**, explicitly labeled as a heuristic (no completion-date field exists in the public dataset) |
| Explainable reasons per risk flag | **Real** |
| Tamper-evident, hash-chained ledger | **Real** — server-side SHA-256, genuinely re-verifiable |
| Citizen verification reports | **Real** — persisted to the database |
| Live CSV ingestion via the UI | **Real** |
| Predictive trend + forecast | **Real** — genuine month-by-month aggregation of real sanction dates, plus a linear-regression forecast (explicitly labeled as a basic projection, not a trained model) |
| Contractor/work collusion network | **Real** — built from actual `implementing_agency_name` data already ingested |
| Ghost-work photo/GPS verification | **Mocked, clearly labeled.** The real MPLADS export has no coordinates or photos. The government's own eSAKSHI portal (mplads.mospi.gov.in) does now require photo uploads for completed works, which validates the concept, but that data sits behind stakeholder logins, not a public export — so there's nothing to run this against yet |
| Cross-scheme duplicate-funding check | **Mocked, clearly labeled.** Needs a second scheme's dataset (e.g. PMGSY) that isn't loaded |

**11 of 13 discussed features are genuinely real. 2 are honestly mocked with clear on-screen labeling explaining exactly why**, which is a defensible position in front of judges — much better than either quietly faking them or leaving them out.

## If you get access to real photo/GPS or a second scheme's data later

- `backend/src/index.mjs` — add a `/api/ghost-check` endpoint once real
  images exist; the frontend's mock UI in `GhostWorkCheck.jsx` is already
  structured to swap in real photo comparison results.
- For cross-scheme checking, ingest the second dataset the same way
  `transformMplads.mjs` does, then join on constituency + normalized work
  description, similar to the existing `buildDuplicateGroups()` logic.

## Architecture

```
mplad-sentinel/
  frontend/   React + Vite. Pure UI, talks to the backend over HTTP only.
  backend/    Express + SQLite. Owns all data, scoring, and the API.
```

See `frontend/README.md` and `backend/README.md` for details specific to
each half, including the full API endpoint list.
