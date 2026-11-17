export default function Placeholder({ title, description }) {
  return (
    <section className="page-section">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Ledger</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>
      <div className="management-card empty-state">
        <h3>Coming soon</h3>
        <p>This workspace is ready for the next Ledger improvement.</p>
      </div>
    </section>
  );
}
