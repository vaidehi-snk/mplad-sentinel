# MPLAD Sentinel — Frontend

React + Vite UI. See the top-level README (../README.md) for the full
architecture and feature list.

```bash
npm install
npm run dev      # http://localhost:5173, expects backend on http://localhost:4000
```

Set `VITE_API_URL` in a `.env` file to point at a different backend URL
(e.g. a deployed one) instead of localhost.

If the backend isn't reachable, the app falls back to static demo data
automatically — check the "Static fallback" badge in the top bar.
