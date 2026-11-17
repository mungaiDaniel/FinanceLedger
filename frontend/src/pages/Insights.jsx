import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import BudgetChart from "../components/BudgetChart";
import { deleteBudget, getBudgets, getCategories, getInsights, saveBudget } from "../api/client";
import { formatKES, formatMonth } from "../api/format";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function Insights() {
  const [month, setMonth] = useState(currentMonth);
  const [budgets, setBudgets] = useState([]);
  const [insights, setInsights] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === "expense"),
    [categories],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [budgetData, insightData, categoryData] = await Promise.all([
        getBudgets(month),
        getInsights(month),
        getCategories(),
      ]);
      setBudgets(budgetData);
      setInsights(insightData);
      setCategories(categoryData);
      if (!categoryId) {
        const firstExpense = categoryData.find((category) => category.type === "expense");
        if (firstExpense) setCategoryId(String(firstExpense.id));
      }
    } catch (error) {
      setMessage(error.response?.data?.error || "Couldn't load budgets and insights.");
    } finally {
      setLoading(false);
    }
  }, [month, categoryId]);
  useEffect(() => {
    load();
  }, [load]);

  async function submit(event) {
    event.preventDefault();
    try {
      await saveBudget({ category_id: Number(categoryId), month, amount: Number(amount) });
      setAmount("");
      setMessage("Budget saved.");
      await load();
    } catch (error) {
      setMessage(error.response?.data?.error || "Couldn't save the budget.");
    }
  }
  async function remove(id) {
    try {
      await deleteBudget(id);
      setMessage("Budget removed.");
      await load();
    } catch {
      setMessage("Couldn't remove the budget.");
    }
  }

  return (
    <section className="page-section insights-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Plan and monitor</span>
          <h1>Budgets &amp; Insights</h1>
          <p>Set monthly category limits and see spending signals before they become surprises.</p>
        </div>
      </header>
      <div className="budget-toolbar">
        <label>
          Month
          <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>
        <span>{formatMonth(month)}</span>
      </div>
      {message && <div className="notice-banner">{message}</div>}
      <div className="budget-layout">
        <div className="management-card">
          <h2>Set a budget</h2>
          <form onSubmit={submit} className="stack-form">
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} required>
              {expenseCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <input
              className="text-input"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Planned amount (USD)"
              required
            />
            <button className="primary-button">Save budget</button>
          </form>
        </div>
        <div className="management-card">
          <h2>Monthly budgets</h2>
          {budgets.length ? (
            <ul className="budget-list">
              {budgets.map((budget) => (
                <li key={budget.id}>
                  <div>
                    <strong>{budget.category_name}</strong>
                    <span>
                      {formatKES(budget.actual)} of {formatKES(budget.planned)} · {budget.pct_used}% used
                    </span>
                  </div>
                  <button className="text-button" onClick={() => remove(budget.id)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No budgets set for this month yet.</p>
          )}
        </div>
      </div>
      <BudgetChart budgets={budgets} />
      <section className="insights-feed">
        <div className="section-title">
          <div>
            <span className="eyebrow">Smart alerts</span>
            <h2>What needs attention</h2>
          </div>
          <span className="insight-count">
            {insights.length} alert{insights.length === 1 ? "" : "s"}
          </span>
        </div>
        {loading ? (
          <div className="loading-indicator">Loading insights…</div>
        ) : insights.length ? (
          <div className="insight-list">
            {insights.map((insight, index) => (
              <article className={`insight-card ${insight.severity}`} key={`${insight.type}-${index}`}>
                <div>
                  <span className="insight-type">{insight.type.replaceAll("_", " ")}</span>
                  <h3>{insight.category}</h3>
                  <p>{insight.message}</p>
                  {insight.amount ? <strong>{formatKES(insight.amount)}</strong> : null}
                </div>
                <Link to={`/transactions?category=${insight.category_id}&month=${month}`}>
                  View transactions
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No alerts for {formatMonth(month)}</h3>
            <p>Add a budget or upload transactions to begin monitoring your spending.</p>
          </div>
        )}
      </section>
    </section>
  );
}
