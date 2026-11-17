# Ledger frontend

React 19 + Vite single-page app. See the [root README](../README.md) for the full project overview.

```bash
npm install
npm run dev          # real backend via Vite proxy (/api -> http://127.0.0.1:5001)
npm run dev:demo     # sample data only, no backend
npm test             # Vitest (mock API)
npm run lint         # oxlint
npm run build        # production build against the real API (VITE_API_URL)
npm run build:demo   # production build with Demo Mode on (what Vercel runs)
```

API access lives in `src/api/`: `client.js` re-exports either `real.js` (axios + JWT) or `mock/` depending on
`VITE_DEMO_MODE`. Add new endpoints to **both** implementations.
