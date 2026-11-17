import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login } from "../api/client";

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState("admin");
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

  return (
    <main className="login-page">
      <section className="login-card">
        <Link className="login-brand" to="/" aria-label="Back to the Ledger landing page">
          <span className="brand-mark">L</span>
          <span>Ledger</span>
        </Link>
        <span className="eyebrow">Personal finance</span>
        <h1>Welcome back</h1>
        <p>Sign in to view your local finance dashboard.</p>
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
              autoFocus
            />
          </label>
          {error && <div className="login-error">{error}</div>}
          <button className="primary-button" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <small>
          New to Ledger? <Link to="/register">Create an account</Link>
        </small>
      </section>
    </main>
  );
}
