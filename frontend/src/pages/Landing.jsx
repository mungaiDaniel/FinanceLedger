import { Link } from "react-router-dom";
import heroGraphic from "../assets/hero.png";

const photos = {
  hero: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=85",
  planning: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=85",
  team: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=85",
  desk: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=85",
};

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <strong>Ledger</strong>
        <p>Clearer financial operations for people and growing businesses.</p>
      </div>
      <div className="footer-links">
        <Link to="/pricing">Pricing</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/refunds">Refunds</Link>
        <Link to="/cookies">Cookies</Link>
        <a href="https://github.com/mungaiDaniel" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </div>
      <small>Copyright {new Date().getFullYear()} Ledger. All rights reserved.</small>
    </footer>
  );
}

export default function Landing() {
  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <Link className="landing-brand" to="/">
          <img className="brand-logo" src="/ledger-logo.svg" alt="" />
          Ledger
        </Link>
        <div>
          <Link className="landing-link" to="/pricing">
            Pricing
          </Link>
          <Link className="landing-link" to="/login">
            Sign in
          </Link>
          <Link className="primary-button" to="/register">
            Get started
          </Link>
        </div>
      </nav>
      <section className="landing-hero">
        <div className="hero-copy">
          <span className="eyebrow">Finance operations, made clear</span>
          <h1>
            Know your numbers.
            <br />
            <em>Move with confidence.</em>
          </h1>
          <p>
            Ledger turns bank and M-Pesa statements into an organised, secure financial workspace. Import
            transactions, automate categories, set budgets, uncover insights, and export clear reports.
          </p>
          <div className="hero-actions">
            <Link className="primary-button large-button" to="/register">
              Start free
            </Link>
            <Link className="secondary-button" to="/demo">
              Explore live demo
            </Link>
            <Link className="landing-link" to="/pricing">
              View plans
            </Link>
          </div>
          <div className="hero-proof">
            <span>CSV and Excel imports</span>
            <span>Budget alerts</span>
            <span>AI-assisted insights</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-photo-wrap">
            <img src={photos.hero} alt="Financial documents and calculator on a desk" />
            <div className="hero-photo-overlay" />
          </div>
          <img className="hero-graphic" src={heroGraphic} alt="Ledger visual mark" />
          <div className="hero-stat">
            <span>One workspace</span>
            <strong>100%</strong>
            <small>financial visibility</small>
          </div>
        </div>
      </section>
      <section className="landing-features">
        <article>
          <span className="feature-number">01</span>
          <h2>Import and organise</h2>
          <p>
            Bring CSV or Excel statements together, prevent duplicate imports, and categorise every
            transaction with rules.
          </p>
        </article>
        <article>
          <span className="feature-number">02</span>
          <h2>Plan with confidence</h2>
          <p>
            Set category budgets, compare planned versus actual spending, and receive early warnings when
            costs rise.
          </p>
        </article>
        <article>
          <span className="feature-number">03</span>
          <h2>Turn data into action</h2>
          <p>
            Use dashboards, exports, and Ask Ledger to understand spending patterns and make better next
            decisions.
          </p>
        </article>
      </section>
      <section className="landing-showcase">
        <img src={photos.planning} alt="Team planning around a table" />
        <div>
          <span className="eyebrow">One view, every month</span>
          <h2>Move from scattered statements to confident decisions.</h2>
          <p>
            See income, spending, savings, categories, and transaction history in a focused dashboard built
            for practical daily use. Create budgets by category and spot problems early with smart alerts.
          </p>
          <ul>
            <li>Automatic import deduplication keeps records clean</li>
            <li>Custom categories and keyword rules reduce manual work</li>
            <li>Monthly reports are ready to export in CSV, Excel, or PDF</li>
          </ul>
          <Link className="secondary-button" to="/register">
            Explore your workspace
          </Link>
        </div>
      </section>
      <section className="landing-split">
        <div>
          <span className="eyebrow">Ask better questions</span>
          <h2>Your financial data can answer back.</h2>
          <p>
            Ask Ledger turns your real, aggregated transaction data into focused answers. Understand what
            changed, identify category trends, and get a concise starting point for your next decision.
          </p>
          <div className="quote-card">
            <p>“How much did I spend on transport this month?”</p>
            <strong>Ask Ledger uses only the data in your workspace.</strong>
          </div>
        </div>
        <img src={photos.desk} alt="Person reviewing a financial plan at a desk" />
      </section>
      <section className="landing-benefits">
        <header>
          <span className="eyebrow">Built for growing operations</span>
          <h2>Everything needed to run a cleaner financial workflow.</h2>
        </header>
        <div>
          <article>
            <strong>Private by design</strong>
            <p>
              Your data remains in the database you configure for your deployment, with session-based account
              access.
            </p>
          </article>
          <article>
            <strong>Flexible imports</strong>
            <p>Start with the files you already have—bank exports, M-Pesa statements, and budget sheets.</p>
          </article>
          <article>
            <strong>Useful alerts</strong>
            <p>
              See over-budget spending, rising costs, unusual transactions, and possible duplicate payments.
            </p>
          </article>
          <article>
            <strong>Ready to share</strong>
            <p>
              Generate practical transaction exports and monthly summaries when stakeholders need an update.
            </p>
          </article>
        </div>
      </section>
      <section className="landing-story">
        <img src={photos.team} alt="Business team collaborating in an office" />
        <div>
          <span className="eyebrow">Built for the practical work</span>
          <h2>A clearer financial picture, without spreadsheet chaos.</h2>
          <p>
            Track day-to-day money, review monthly performance, and keep decision-ready records in one place.
            Ledger is designed for local-first control and straightforward workflows.
          </p>
          <Link className="secondary-button" to="/register">
            Create your workspace
          </Link>
        </div>
      </section>
      <section className="landing-cta">
        <span className="eyebrow">Start today</span>
        <h2>Bring your financial operations into focus.</h2>
        <p>Create a free workspace, import your first statement, and see where the numbers take you.</p>
        <div>
          <Link className="primary-button large-button" to="/register">
            Create free account
          </Link>
          <Link className="secondary-button" to="/demo">
            Try the live demo
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
