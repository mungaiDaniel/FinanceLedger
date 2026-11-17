import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import UploadPanel from "../components/UploadPanel";
import KpiCards from "../components/KpiCards";
import CategoryPieChart from "../components/CategoryPieChart";
import CategoryBarChart from "../components/CategoryBarChart";
import TrendLineChart from "../components/TrendLineChart";
import TransactionTable from "../components/TransactionTable";
import DateRangeFilter from "../components/DateRangeFilter";
import { getSummary, getByCategory, getTrend, getTransactions, getCategories } from "../api/client";

export default function Dashboard() {
  const { range, setRange, uploadRequest } = useOutletContext();
  const [activePreset, setActivePreset] = useState("All time");
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState(null);
  const [byCategory, setByCategory] = useState(null);
  const [trend, setTrend] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const dateParams = {
    ...(range.start ? { start_date: range.start } : {}),
    ...(range.end ? { end_date: range.end } : {}),
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const [summaryData, categoryData, trendData, txnData, catList] = await Promise.all([
        getSummary(dateParams),
        getByCategory(dateParams),
        getTrend(dateParams),
        getTransactions({ ...dateParams, page, per_page: 15 }),
        getCategories(),
      ]);
      setSummary(summaryData);
      setByCategory(categoryData);
      setTrend(trendData);
      setTransactions(txnData);
      setCategories(catList);
    } catch (err) {
      setErrorMsg("Couldn't reach the backend. Make sure the Flask server is running on port 5001.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end, page]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function handleRangeChange(newRange) {
    setRange(newRange);
    setPage(1);
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <span className="eyebrow">Personal Finance</span>
          <h1>Dashboard</h1>
        </div>
        <DateRangeFilter
          range={range}
          onChange={handleRangeChange}
          activePreset={activePreset}
          onPresetChange={setActivePreset}
        />
      </header>

      <UploadPanel onUploadComplete={loadAll} openRequest={uploadRequest} />

      {errorMsg && <div className="error-banner">{errorMsg}</div>}

      {!errorMsg && (
        <>
          <KpiCards summary={summary} />

          <div className="chart-grid">
            <CategoryPieChart data={byCategory} />
            <TrendLineChart data={trend} />
            <CategoryBarChart data={byCategory} />
          </div>

          <TransactionTable
            data={transactions}
            categories={categories}
            page={page}
            pages={transactions?.pages || 1}
            onPageChange={setPage}
            onCategoryUpdated={loadAll}
          />
        </>
      )}

      {loading && <div className="loading-indicator">Refreshing…</div>}
    </div>
  );
}
