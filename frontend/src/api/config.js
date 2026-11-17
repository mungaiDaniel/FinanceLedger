// When true, the app runs entirely in the browser against an in-memory mock API (see ./mock).
// Set VITE_DEMO_MODE=true at build time to enable it. No backend is contacted.
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

// In development, Vite proxies /api to the Flask server. Set VITE_API_URL only
// when the frontend is deployed separately from the backend.
export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
