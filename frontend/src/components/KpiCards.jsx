import { formatKES } from "../api/format";

export default function KpiCards({ summary }) {
  if (!summary) return null;

  const cards = [
    { label: "Income", value: summary.total_income, tone: "positive" },
    { label: "Expenses", value: summary.total_expense, tone: "negative" },
    { label: "Net", value: summary.net, tone: summary.net >= 0 ? "positive" : "negative" },
    { label: "Savings rate", value: `${summary.savings_rate_pct}%`, tone: "neutral", isText: true },
  ];

  return (
    <div className="kpi-row">
      {cards.map((card) => (
        <div key={card.label} className="kpi-card">
          <span className="kpi-label">{card.label}</span>
          <span className={`kpi-value mono tone-${card.tone}`}>
            {card.isText ? card.value : formatKES(card.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
