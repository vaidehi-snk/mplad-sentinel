# MPLAD Sentinel — Backend

Express + SQLite API. See the top-level README (../README.md) for the full
architecture and feature list.

```bash
npm install
npm run start     # http://localhost:4000
```

Uses Node's built-in `node:sqlite` (Node 22+) — no native compilation.

## Real ML layer (Isolation Forest)

`lib/isolationForest.js` is a from-scratch implementation of Isolation
Forest (Liu, Ting & Zhou, 2008) -- the same algorithm scikit-learn's
`IsolationForest` uses. It's implemented in plain JS rather than calling
out to a Python service, so the whole backend stays one deployable unit
and your team can explain every line of it.

It runs over a 4-feature vector per work (sanction amount, cost ratio vs.
comparable works, same-day batch size, days since sanction) and produces
an anomaly score in [0,1]. Scores \u2265 0.65 add a labeled, weighted reason
("Isolation Forest (ML) flagged this...") alongside the rule-based checks
in `scoreWork()` -- kept as a clearly separate, additive signal rather
than merged invisibly into the rules, so "which part is the ML" always
has a precise answer.

Verified with a planted-outlier sanity test (100 clustered points + 3
obvious outliers: outliers scored 0.73-0.76 vs. 0.46 average for normal
points) and stress-tested at 120,000 rows with no measurable slowdown
(training samples are capped at 256 points per tree regardless of
dataset size, which is standard practice for Isolation Forest).

## Real authentication & authorization (JWT)

Login is now real, not a client-side dropdown pretending to be one.
`POST /api/auth/login` validates the requested jurisdiction against what's
actually in the database, then issues a signed JWT carrying `{name, role,
jurisdiction}`. Every route that touches real data requires a valid token
(`Authorization: Bearer <token>`), and derives scope **from the token**,
never from the client's request -- so a client can't just edit a query
string to see another jurisdiction's data.

Verified with real attack-style tests (not just happy-path):
- No token \u2192 401
- MP token calling `/api/mps` (the all-MPs oversight roster) \u2192 403, enforced server-side, not just hidden in the UI
- MP token adding `?constituency=SomeOtherPlace` to `/api/works` \u2192 ignored completely, still only returns their own real jurisdiction
- MP token calling `/api/ingest` (dataset re-upload) \u2192 403, restricted to district/state/ministry roles

**Before any real deployment**, set a real `JWT_SECRET` environment
variable -- the code falls back to an obviously-labeled dev secret
otherwise, which must never be used outside local development.

## Getting real data in

**Option A — live, through the UI**: use the "Data Ingestion" tab in the
frontend to upload a CSV directly. No CLI needed.

**Option B — offline batch script**:
```bash
npm run ingest -- path/to/downloaded.csv
```
This regenerates `data/realWorks.js` / `data/realLedger.js`, which get
loaded the next time the server starts with an empty database.

Download real data from https://dataful.in/datasets/18534/ (or search
"MPLADS" there for other Lok Sabha terms) — no signup needed.

## Endpoints

- `GET /api/status` — `{ realData, workCount, ledgerCount }`
- `GET /api/works?state=&district=&constituency=`
- `GET /api/works/:id` — includes ledger history for that work
- `POST /api/works/:id/request-verification`
- `GET /api/ledger`
- `POST /api/ledger/verify` — real recomputation, returns `{verified:false, brokenAtSeq, reason}` on tamper
- `GET /api/citizen-reports` / `POST /api/citizen-reports`
- `POST /api/ingest` — multipart CSV upload, replaces the dataset and re-scores live

Delete `sentinel.db` to reset and reseed from `data/realWorks.js` (or the
demo fallback if that's empty) on next start.
