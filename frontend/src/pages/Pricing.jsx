import { Link } from "react-router-dom";
import { SiteFooter } from "./Landing";

const plans = [
  {
    name: "Free",
    price: "$0",
    note: "Forever",
    description: "A simple place to begin.",
    features: ["Up to 100 transactions per month", "Core dashboard and categories", "CSV statement import"],
  },
  {
    name: "Starter",
    price: "$1,900",
    note: "per month",
    description: "For a focused personal workflow.",
    features: [
      "Up to 1,000 transactions per month",
      "Budgets and smart alerts",
      "CSV and Excel imports",
      "CSV report exports",
    ],
  },
  {
    name: "Growth",
    price: "$3,000",
    note: "per month",
    description: "For deeper visibility and planning.",
    features: [
      "Up to 10,000 transactions per month",
      "Ask Benny AI insights",
      "Excel and PDF exports",
      "Priority email support",
    ],
  },
  {
    name: "Business",
    price: "$5,000",
    note: "per month",
    description: "For growing financial operations.",
    features: ["Unlimited transactions", "Advanced reporting", "Priority onboarding", "Dedicated support"],
  },
];

const financePhoto =
  "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=85";

export default function Pricing() {
  return (
    <main className="pricing-page">
      <nav className="landing-nav">
        <Link className="landing-brand" to="/">
          <span className="brand-mark">B</span>Benny Ent Software
        </Link>
        <div>
          <Link className="landing-link" to="/login">
            Sign in
          </Link>
          <Link className="primary-button" to="/register">
            Get started
          </Link>
        </div>
      </nav>
      <section className="pricing-hero">
        <div className="pricing-hero-copy">
          <span className="eyebrow">Simple, transparent plans</span>
          <h1>
            Choose room to <em>grow.</em>
          </h1>
          <p>
            Every plan gives you a clearer financial workspace. Start small, then move up when your workflow
            needs more capacity.
          </p>
          <div className="pricing-proof">
            <span>Monthly billing</span>
            <span>Cancel anytime</span>
            <span>USD pricing</span>
          </div>
        </div>
        <div className="pricing-visual">
          <img src={financePhoto} alt="Financial planning documents and calculator" />
          <div className="pricing-orb orb-one" />
          <div className="pricing-orb orb-two" />
          <div className="pricing-float-card">
            <span>Finance, in focus</span>
            <strong>One clear workspace</strong>
          </div>
        </div>
      </section>
      <section className="pricing-plans" aria-label="Pricing plans">
        {plans.map((plan, index) => (
          <article
            className="price-card pricing-plan-card"
            key={plan.name}
            style={{ "--card-delay": `${index * 90}ms` }}
          >
            <div>
              <span className="plan-label">{plan.name}</span>
              <h2>{plan.price}</h2>
              <small>{plan.note}</small>
              <p>{plan.description}</p>
            </div>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <Link className="secondary-button" to="/register">
              Choose {plan.name}
            </Link>
          </article>
        ))}
      </section>
      <section className="pricing-content">
        <div className="pricing-content-card">
          <span className="eyebrow">What every plan includes</span>
          <h2>Start with the essentials. Keep the clarity.</h2>
          <p>
            All plans include secure account access, local data control, transaction categorisation, and a
            finance workspace that stays organised as you grow.
          </p>
          <Link className="secondary-button" to="/register">
            Create your workspace
          </Link>
        </div>
        <div className="pricing-faq">
          <h2>Questions, answered</h2>
          <details open>
            <summary>Can I change plans later?</summary>
            <p>
              Yes. You can choose the plan that fits your current workflow and adjust as your needs change.
            </p>
          </details>
          <details>
            <summary>What currency are plans billed in?</summary>
            <p>All plan prices are displayed in and billed in US dollars (USD).</p>
          </details>
          <details>
            <summary>How can I get help?</summary>
            <p>
              This is a portfolio project. Reach the author on{" "}
              <a href="https://github.com/mungaiDaniel" target="_blank" rel="noreferrer">
                GitHub
              </a>{" "}
              with any questions.
            </p>
          </details>
        </div>
      </section>
      <section className="pricing-cta">
        <span className="eyebrow">Ready when you are</span>
        <h2>Bring your finances into focus.</h2>
        <p>Create your account, import your first statement, and start with a clearer financial picture.</p>
        <Link className="primary-button large-button" to="/register">
          Create free account
        </Link>
      </section>
      <SiteFooter />
    </main>
  );
}
