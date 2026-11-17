import { useCallback, useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import DateRangeFilter from "../components/DateRangeFilter";
import TransactionTable from "../components/TransactionTable";
import { getCategories, getTransactions } from "../api/client";

export default function Transactions() {
  const { range, setRange } = useOutletContext();
  const [searchParams] = useSearchParams();
  const [activePreset, setActivePreset] = useState("All time");
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(() => searchParams.get("category") || "");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("date");
  const [direction, setDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    const category = searchParams.get("category");
    const month = searchParams.get("month");
    if (category) setCategoryId(category);
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [year, monthNumber] = month.split("-").map(Number);
      setRange({ start: `${month}-01`, end: `${month}-${new Date(year, monthNumber, 0).getDate()}` });
    }
  }, [searchParams, setRange]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    try {
      setError("");
      const params = {
        page,
        per_page: 100,
        sort,
        direction,
        ...(range.start && { start_date: range.start }),
        ...(range.end && { end_date: range.end }),
        ...(categoryId && { category_id: categoryId }),
        ...(debouncedSearch && { search: debouncedSearch }),
      };
      const [transactions, categoryList] = await Promise.all([getTransactions(params), getCategories()]);
      setData(transactions);
      setCategories(categoryList);
    } catch {
      setError("Couldn't load transactions. Check that the backend is running.");
    }
  }, [range, categoryId, page, debouncedSearch, sort, direction]);

  useEffect(() => {
    load();
  }, [load]);
  function changeSort(column) {
    if (sort === column) setDirection((value) => (value === "asc" ? "desc" : "asc"));
    else {
      setSort(column);
      setDirection(column === "date" ? "desc" : "asc");
    }
    setPage(1);
  }

  return (
    <section className="page-section">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Ledger activity</span>
          <h1>Transactions</h1>
          <p>Search, filter, and recategorize every imported entry.</p>
        </div>
      </header>
      <DateRangeFilter
        range={range}
        onChange={(next) => {
          setRange(next);
          setPage(1);
        }}
        activePreset={activePreset}
        onPresetChange={setActivePreset}
      />
      <div className="filter-row">
        <input
          className="text-input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search description"
        />
        <select
          value={categoryId}
          onChange={(event) => {
            setCategoryId(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <div className="error-banner">{error}</div>
      ) : (
        <TransactionTable
          data={data}
          categories={categories}
          page={page}
          pages={data?.pages || 1}
          onPageChange={setPage}
          onCategoryUpdated={load}
          sort={sort}
          direction={direction}
          onSort={changeSort}
        />
      )}
    </section>
  );
}
