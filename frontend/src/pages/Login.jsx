import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { DEMO_MODE } from "../api/config";
import { login, loginDemo } from "../api/client";

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState(DEMO_MODE ? "demo@example.com" : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await login({ identifier, password });
      onLogin(user);
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Couldn't sign in. Check the backend and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function tryDemo() {
    setLoading(true);
    setError("");
    try {
      onLogin(await loginDemo());
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || "The demo could not be started.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <Link className="login-brand" to="/" aria-label="Back to the Ledger landing page">
          <span className="brand-mark">L</span>
          <span>Ledger</span>
        </Link>
        <span className="eyebrow">Personal finance</span>
        <h1>Welcome back</h1>
        <p>
          {DEMO_MODE
            ? "Explore Ledger with sample data. No account needed."
            : "Sign in to view your finance dashboard."}
        </p>
        <form onSubmit={submit} className="stack-form">
          <label>
            Email or username
            <input
              className="text-input"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label>
            Password
            <input
              className="text-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              autoFocus={!DEMO_MODE}
            />
          </label>
          {error && <div className="login-error">{error}</div>}
          <button className="primary-button" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          {DEMO_MODE && (
            <button type="button" className="secondary-button" onClick={tryDemo} disabled={loading}>
              Try Demo
            </button>
          )}
        </form>
        <small>
          New to Ledger? <Link to="/register">Create an account</Link>
        </small>
      </section>
    </main>
  );
}
