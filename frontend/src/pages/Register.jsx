import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/client";

export default function Register({ onRegister }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true); setError("");
    try { const user = await register({ username, email, password }); onRegister(user); navigate("/dashboard", { replace: true }); }
    catch (requestError) { setError(requestError.response?.data?.error || "Couldn't create your account. Try again."); }
    finally { setLoading(false); }
  }

  return <main className="login-page"><section className="login-card"><Link className="login-brand" to="/" aria-label="Back to the Ledger landing page"><span className="brand-mark">L</span><span>Ledger</span></Link><span className="eyebrow">Get started</span><h1>Create your account</h1><p>Set up your local Ledger workspace in a minute.</p><form onSubmit={submit} className="stack-form"><label>Username<input className="text-input" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" minLength="3" required autoFocus /></label><label>Email address<input className="text-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label>Password<input className="text-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength="8" required /></label><label>Confirm password<input className="text-input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength="8" required /></label>{error && <div className="login-error">{error}</div>}<button className="primary-button" disabled={loading}>{loading ? "Creating account…" : "Create account"}</button></form><small>Already have an account? <Link to="/login">Sign in</Link></small></section></main>;
}
