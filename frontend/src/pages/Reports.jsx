import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import DateRangeFilter from "../components/DateRangeFilter";
import { downloadMonthlySummary, downloadTransactionReport, getByCategory, getSummary } from "../api/client";
import { formatKES } from "../api/format";

function download(blob, filename) { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
function currentMonth() { return new Date().toISOString().slice(0, 7); }

export default function Reports() {
  const { range, setRange } = useOutletContext();
  const [activePreset, setActivePreset] = useState("All time");
  const [summary, setSummary] = useState(null); const [categories, setCategories] = useState([]); const [month, setMonth] = useState(currentMonth); const [message, setMessage] = useState("");
  const params = { ...(range.start && { start: range.start }), ...(range.end && { end: range.end }) };
  const load = useCallback(async () => { const analyticsParams = { ...(range.start && { start_date: range.start }), ...(range.end && { end_date: range.end }) }; const [summaryData, categoryData] = await Promise.all([getSummary(analyticsParams), getByCategory(analyticsParams)]); setSummary(summaryData); setCategories(categoryData); }, [range.start, range.end]);
  useEffect(() => { load().catch(() => setMessage("Couldn't load report data.")); }, [load]);
  async function exportTransactions(format) { try { const blob = await downloadTransactionReport(params, format); download(blob, `ledger-transactions.${format}`); } catch { setMessage("Couldn't generate the transaction export."); } }
  async function exportSummary() { try { const blob = await downloadMonthlySummary(month); download(blob, `ledger-summary-${month}.pdf`); } catch { setMessage("Couldn't generate the monthly PDF."); } }
  return <section className="page-section"><header className="page-heading"><div><span className="eyebrow">Financial reports</span><h1>Reports</h1><p>Review a selected period and download shareable records.</p></div></header>{message && <div className="error-banner">{message}</div>}<DateRangeFilter range={range} onChange={setRange} activePreset={activePreset} onPresetChange={setActivePreset} />{summary && <div className="report-summary"><div><span>Income</span><strong>{formatKES(summary.total_income)}</strong></div><div><span>Expenses</span><strong>{formatKES(summary.total_expense)}</strong></div><div><span>Net</span><strong>{formatKES(summary.net)}</strong></div><div><span>Transactions</span><strong>{summary.transaction_count}</strong></div></div>}<div className="report-cards"><article className="management-card"><h2>Transaction export</h2><p className="muted">Download the selected date range with categories.</p><div className="report-actions"><button className="primary-button" onClick={() => exportTransactions("csv")}>Download CSV</button><button className="secondary-button" onClick={() => exportTransactions("xlsx")}>Download Excel</button></div></article><article className="management-card"><h2>Monthly PDF summary</h2><p className="muted">A one-page income, expense, and net summary.</p><div className="report-actions"><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /><button className="primary-button" onClick={exportSummary}>Generate PDF</button></div></article></div><div className="management-card report-breakdown"><h2>Expense breakdown</h2>{categories.map((category) => <div className="breakdown-row" key={category.category}><span>{category.category}</span><strong>{formatKES(category.total)}</strong></div>)}{categories.length === 0 && <p className="muted">No expenses in this period.</p>}</div></section>;
}
