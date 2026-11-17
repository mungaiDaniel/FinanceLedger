import { useState } from "react";

export default function Settings() {
  const [currency, setCurrency] = useState("USD");
  const [saved, setSaved] = useState(false);
  function save(event) {
    event.preventDefault();
    localStorage.setItem("ledger-currency", currency);
    setSaved(true);
  }
  return (
    <section className="page-section">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Preferences</span>
          <h1>Settings</h1>
          <p>Manage local dashboard preferences.</p>
        </div>
      </header>
      <div className="settings-card">
        <h2>Display currency</h2>
        <form onSubmit={save} className="settings-row">
          <select
            value={currency}
            onChange={(event) => {
              setCurrency(event.target.value);
              setSaved(false);
            }}
          >
            <option value="USD">US dollar (USD)</option>
          </select>
          <button className="primary-button">Save preference</button>
        </form>
        {saved && <p className="success-text">USD display preference saved.</p>}
      </div>
      <div className="settings-card">
        <h2>Data</h2>
        <p className="muted">
          Your statements are stored in your local PostgreSQL database. Transaction deletion remains available
          from the transaction API.
        </p>
      </div>
    </section>
  );
}
