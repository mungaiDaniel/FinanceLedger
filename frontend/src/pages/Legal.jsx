import { Link } from "react-router-dom";
import { SiteFooter } from "./Landing";

const plans = [
  {
    name: "Free",
    price: "$0",
    note: "Forever",
    features: ["Up to 100 transactions per month", "Core dashboard and categories", "CSV statement import"],
  },
  {
    name: "Starter",
    price: "$1,900",
    note: "per month",
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
    features: [
      "Up to 10,000 transactions per month",
      "Everything in Starter",
      "Ask Benny AI insights",
      "Excel and PDF exports",
      "Priority email support",
    ],
  },
  {
    name: "Business",
    price: "$5,000",
    note: "per month",
    features: [
      "Unlimited transactions",
      "Everything in Growth",
      "Advanced reporting",
      "Priority support and onboarding",
    ],
  },
];

const content = {
  pricing: {
    title: "Straightforward pricing",
    intro:
      "Choose the Benny Ent Software plan that fits your financial workflow. Prices are in US dollars and billed monthly.",
    sections: [
      [
        "Billing",
        "Paid subscriptions are billed monthly in advance. You can cancel before your next billing date; your paid access remains active through the end of the current paid period.",
      ],
      [
        "Taxes",
        "Displayed prices exclude any taxes that may be required by applicable law. Any required taxes will be shown before payment.",
      ],
      [
        "Refunds",
        "First-time paid subscriptions are eligible for a refund request within 14 calendar days of the first payment. See the Refund Policy for full conditions.",
      ],
    ],
  },
  refunds: {
    title: "Refund policy",
    intro:
      "We want Benny Ent Software to be a confident choice. This policy explains when a refund may be requested.",
    sections: [
      [
        "14-day first-payment guarantee",
        "If you are a first-time paid subscriber, you may request a full refund within 14 calendar days of your first successful payment. Send your request from the email address associated with your account.",
      ],
      [
        "Renewals",
        "Subscription renewals are generally non-refundable because access is provided for the billed period. You can cancel at any time to stop future charges.",
      ],
      [
        "Exceptions",
        "We may issue refunds for duplicate charges, an extended service outage caused by us, or where required by applicable law. We do not issue refunds for changes of mind after the 14-day first-payment period or for accounts that violate our Terms.",
      ],
      [
        "How refunds are processed",
        "Approved refunds are returned to the original payment method. Processing times depend on the payment provider and bank, and may take 5–10 business days after approval.",
      ],
    ],
  },
  privacy: {
    title: "Privacy notice",
    intro: "This notice explains how Benny Ent Software handles personal information and financial data.",
    sections: [
      [
        "Information we process",
        "We process account details you provide, uploaded statement data, categories, budgets, and requests sent to Ask Benny. We use this information only to operate and improve the features you choose to use.",
      ],
      [
        "AI requests",
        "Ask Benny sends aggregated financial context and your question to Google Gemini to generate an answer. Do not include unnecessary sensitive information in questions.",
      ],
      [
        "Storage and security",
        "Your data is stored in the database configured for your deployment. You are responsible for securing your hosting account, database credentials, and user access. We use reasonable measures to protect information, but no online service can guarantee absolute security.",
      ],
      [
        "Your choices",
        "You may request access, correction, or deletion of your personal information by contacting support. We will respond according to applicable law.",
      ],
    ],
  },
  terms: {
    title: "Terms of use",
    intro: "By using Benny Ent Software, you agree to these terms.",
    sections: [
      [
        "Service scope",
        "Benny Ent Software provides tools for organising and analysing financial records. It is not a bank, accounting firm, investment adviser, tax adviser, or legal adviser.",
      ],
      [
        "Your responsibilities",
        "You are responsible for the accuracy of uploaded information, keeping your account credentials secure, and reviewing reports before making financial, tax, or business decisions.",
      ],
      [
        "Acceptable use",
        "Do not misuse the service, attempt unauthorised access, upload unlawful content, or interfere with other users or infrastructure.",
      ],
      [
        "No financial advice",
        "Insights and AI responses are informational only. They may be incomplete or inaccurate and must not be relied on as professional financial, tax, legal, or investment advice.",
      ],
    ],
  },
  cookies: {
    title: "Cookie notice",
    intro: "Benny Ent Software uses essential browser storage and session cookies to operate the service.",
    sections: [
      [
        "Essential cookies",
        "Authentication and security cookies keep you signed in and protect your session. They are necessary for the service to function.",
      ],
      [
        "Local storage",
        "The app may store local display preferences, such as your selected currency, in your browser.",
      ],
      [
        "No advertising cookies",
        "The current product does not use advertising or cross-site tracking cookies. If that changes, this notice will be updated before those tools are enabled.",
      ],
    ],
  },
};

export default function Legal({ type }) {
  const page = content[type];
  return (
    <main className="legal-page">
      <nav className="landing-nav">
        <Link className="landing-brand" to="/">
          <span className="brand-mark">B</span>Benny Ent Software
        </Link>
        <Link className="secondary-button" to="/">
          Back to home
        </Link>
      </nav>
      <article className="legal-content">
        <span className="eyebrow">Benny Ent Software</span>
        <h1>{page.title}</h1>
        <p className="legal-intro">{page.intro}</p>
        {type === "pricing" && (
          <div className="pricing-grid">
            {plans.map((plan) => (
              <section className="price-card" key={plan.name}>
                <h2>{plan.name}</h2>
                <strong>{plan.price}</strong>
                <span>{plan.note}</span>
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Link className="secondary-button" to="/register">
                  Choose {plan.name}
                </Link>
              </section>
            ))}
          </div>
        )}
        {page.sections.map(([heading, body]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <p>{body}</p>
          </section>
        ))}
        <section>
          <h2>Contact</h2>
          <p>
            For questions about these policies, contact{" "}
            <a href="mailto:support@bennyentsoftware.com">support@bennyentsoftware.com</a> or{" "}
            <a href="https://wa.me/254752598087" target="_blank" rel="noreferrer">
              WhatsApp +254 752 598 087
            </a>
            .
          </p>
        </section>
        <p className="legal-updated">Last updated: August 4, 2026.</p>
      </article>
      <SiteFooter />
    </main>
  );
}
