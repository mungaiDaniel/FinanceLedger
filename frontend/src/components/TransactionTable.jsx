import { useState } from "react";
import {
  bulkDeleteTransactions,
  bulkUpdateTransactions,
  deleteTransaction,
  splitTransaction,
  updateTransactionCategory,
} from "../api/client";
import { formatKES, formatDate } from "../api/format";
import { useToast } from "./toastContext";

export default function TransactionTable({
  data,
  categories,
  page,
  pages,
  onPageChange,
  onCategoryUpdated,
  sort,
  direction,
  onSort,
}) {
  const [savingId, setSavingId] = useState(null);
  const [selected, setSelected] = useState([]);
  const [bulkCategory, setBulkCategory] = useState("");
  const [splitTarget, setSplitTarget] = useState(null);
  const [splitValues, setSplitValues] = useState([]);
  const toast = useToast();
  const items = data?.items || [];
  const allSelected = items.length > 0 && selected.length === items.length;

  async function handleCategoryChange(txnId, categoryId) {
    setSavingId(txnId);
    try {
      await updateTransactionCategory(txnId, categoryId === "" ? null : Number(categoryId));
      toast("Category updated.");
      onCategoryUpdated?.();
    } catch {
      toast("Couldn't update category.", "error");
    } finally {
      setSavingId(null);
    }
  }
  function toggle(id) {
    setSelected((ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
  }
  function toggleAll() {
    setSelected(allSelected ? [] : items.map((item) => item.id));
  }
  async function applyBulkCategory() {
    if (!selected.length) return;
    try {
      await bulkUpdateTransactions(selected, bulkCategory === "" ? null : Number(bulkCategory));
      toast("Categories updated.");
      setSelected([]);
      onCategoryUpdated?.();
    } catch {
      toast("Couldn't update selected transactions.", "error");
    }
  }
  async function removeSelected() {
    if (!selected.length || !window.confirm(`Delete ${selected.length} transaction(s)?`)) return;
    try {
      await bulkDeleteTransactions(selected);
      toast("Transactions deleted.");
      setSelected([]);
      onCategoryUpdated?.();
    } catch {
      toast("Couldn't delete transactions.", "error");
    }
  }
  async function removeOne(id) {
    if (!window.confirm("Delete this transaction?")) return;
    try {
      await deleteTransaction(id);
      toast("Transaction deleted.");
      onCategoryUpdated?.();
    } catch {
      toast("Couldn't delete transaction.", "error");
    }
  }
  function openSplit(txn) {
    setSplitTarget(txn);
    setSplitValues([
      { category_id: txn.category_id || categories[0]?.id || "", amount: (txn.amount / 2).toFixed(2) },
      { category_id: txn.category_id || categories[0]?.id || "", amount: (txn.amount / 2).toFixed(2) },
    ]);
  }
  async function saveSplit(event) {
    event.preventDefault();
    try {
      await splitTransaction(
        splitTarget.id,
        splitValues.map((split) => ({
          category_id: Number(split.category_id),
          amount: Number(split.amount),
        })),
      );
      toast("Transaction split saved.");
      setSplitTarget(null);
      onCategoryUpdated?.();
    } catch {
      toast("Split amounts must match the original transaction.", "error");
    }
  }
  function sortableHeader(key, label) {
    return (
      <th className={key === "amount" ? "align-right sortable" : "sortable"} onClick={() => onSort?.(key)}>
        {label}
        {sort === key ? (direction === "asc" ? " ↑" : " ↓") : ""}
      </th>
    );
  }

  if (!data || !items.length)
    return (
      <div className="table-card empty-state">
        <h3>No transactions yet</h3>
        <p>Upload a statement above to get started.</p>
      </div>
    );
  return (
    <div className="table-card">
      <div className="table-title-row">
        <h3>Transactions</h3>
        {selected.length ? (
          <div className="bulk-actions">
            <span>{selected.length} selected</span>
            <select value={bulkCategory} onChange={(event) => setBulkCategory(event.target.value)}>
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button onClick={applyBulkCategory}>Apply category</button>
            <button className="danger-button" onClick={removeSelected}>
              Delete
            </button>
          </div>
        ) : null}
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all transactions"
                />
              </th>
              {sortableHeader("date", "Date")}
              <th>Description</th>
              {sortableHeader("amount", "Amount")}
              {sortableHeader("category", "Category")}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((txn) => (
              <tr key={txn.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(txn.id)}
                    onChange={() => toggle(txn.id)}
                    aria-label={`Select ${txn.description}`}
                  />
                </td>
                <td className="mono muted" data-label="Date">
                  {formatDate(txn.date)}
                </td>
                <td data-label="Description">{txn.description}</td>
                <td
                  data-label="Amount"
                  className={`mono align-right ${txn.amount < 0 ? "tone-negative" : "tone-positive"}`}
                >
                  {formatKES(txn.amount)}
                </td>
                <td data-label="Category">
                  <select
                    value={txn.category_id ?? ""}
                    disabled={savingId === txn.id}
                    onChange={(event) => handleCategoryChange(txn.id, event.target.value)}
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="row-actions">
                  <button onClick={() => openSplit(txn)}>Split</button>
                  <button className="danger-button" onClick={() => removeOne(txn.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </button>
          <span className="muted">
            Page {page} of {pages}
          </span>
          <button disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
            Next
          </button>
        </div>
      )}
      {splitTarget && (
        <div className="dialog-backdrop">
          <form className="split-dialog" onSubmit={saveSplit}>
            <h2>Split transaction</h2>
            <p>
              {splitTarget.description} · {formatKES(splitTarget.amount)}
            </p>
            {splitValues.map((split, index) => (
              <div className="split-row" key={index}>
                <select
                  value={split.category_id}
                  onChange={(event) =>
                    setSplitValues((values) =>
                      values.map((value, item) =>
                        item === index ? { ...value, category_id: event.target.value } : value,
                      ),
                    )
                  }
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <input
                  className="text-input"
                  type="number"
                  step="0.01"
                  value={split.amount}
                  onChange={(event) =>
                    setSplitValues((values) =>
                      values.map((value, item) =>
                        item === index ? { ...value, amount: event.target.value } : value,
                      ),
                    )
                  }
                  required
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setSplitValues((values) => [...values, { category_id: categories[0]?.id || "", amount: "" }])
              }
            >
              Add split
            </button>
            <div className="dialog-actions">
              <button type="button" onClick={() => setSplitTarget(null)}>
                Cancel
              </button>
              <button className="primary-button">Save split</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
