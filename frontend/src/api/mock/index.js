// Mock API used in Demo Mode. It exposes exactly the same functions as ../real.js,
// keeps all data in memory (so create/edit/delete feel real during a session) and
// never touches the network. Reloading the page resets everything.
import { createInitialState, currentMonth, isoDate } from "./seed";

const DEMO_USER = { username: "demo", email: "demo@example.com" };
const SESSION_KEY = "ledger.demo.user";
const LATENCY_MS = 150;

let state = createInitialState();

const wait = () => new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
const clone = (value) => structuredClone(value);
const round2 = (n) => Math.round(n * 100) / 100;

// Mirrors the shape axios errors have, so UI code reading err.response.data.error works unchanged.
function apiError(status, message) {
  const error = new Error(message);
  error.response = { status, data: { error: message } };
  return error;
}

async function respond(compute) {
  await wait();
  return clone(compute());
}

// ---------- helpers over the in-memory state ----------

const categoryName = (id) => state.categories.find((c) => c.id === id)?.name ?? null;
const findCategory = (id) => state.categories.find((c) => c.id === Number(id));
const leaves = () => state.transactions.filter((t) => !t.is_split_parent);

function view(t) {
  return {
    id: t.id,
    date: t.date,
    description: t.description,
    amount: t.amount,
    category_id: t.category_id,
    category_name: categoryName(t.category_id) ?? "Uncategorized",
    source_file: t.source_file,
    parent_transaction_id: t.parent_transaction_id,
  };
}

function inRange(t, params) {
  const start = params.start_date ?? params.start;
  const end = params.end_date ?? params.end;
  return (!start || t.date >= start) && (!end || t.date <= end);
}

function categorize(description) {
  const text = description.toLowerCase();
  return state.rules.find((rule) => text.includes(rule.keyword.toLowerCase()))?.category_id ?? null;
}

function monthSpend(month) {
  const totals = new Map();
  for (const t of leaves()) {
    if (t.amount < 0 && t.category_id && t.date.startsWith(month)) {
      totals.set(t.category_id, (totals.get(t.category_id) ?? 0) + -t.amount);
    }
  }
  return totals;
}

function requireMonth(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month ?? ""))
    throw apiError(400, "month is required in YYYY-MM format.");
  return month;
}

// ---------- auth ----------

function startSession(user) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // sessionStorage unavailable: the demo session just won't survive a reload.
  }
  return user;
}

export async function login({ identifier }) {
  await wait();
  const id = String(identifier ?? "")
    .trim()
    .toLowerCase();
  if (id !== DEMO_USER.username && id !== DEMO_USER.email) {
    throw apiError(401, "Demo mode: sign in as demo@example.com (any password) or press Try Demo.");
  }
  return startSession({ ...DEMO_USER });
}

export async function register({ username, email }) {
  await wait();
  return startSession({ username: username || DEMO_USER.username, email: email || DEMO_USER.email });
}

export async function loginDemo() {
  await wait();
  return startSession({ ...DEMO_USER });
}

export async function logout() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

export async function getCurrentUser() {
  let stored = null;
  try {
    stored = JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    // ignore
  }
  if (!stored) throw apiError(401, "Not authenticated.");
  return stored;
}

// ---------- transactions ----------

const SORTERS = {
  date: (a, b) => a.date.localeCompare(b.date),
  amount: (a, b) => a.amount - b.amount,
  category: (a, b) => (a.category_id ?? 0) - (b.category_id ?? 0),
};

export function getTransactions(params = {}) {
  return respond(() => {
    let rows = leaves().filter((t) => inRange(t, params));
    if (params.category_id) rows = rows.filter((t) => t.category_id === Number(params.category_id));
    if (params.search)
      rows = rows.filter((t) => t.description.toLowerCase().includes(params.search.toLowerCase()));

    const sorter = SORTERS[params.sort] ?? SORTERS.date;
    const direction = params.direction === "asc" ? 1 : -1;
    rows.sort((a, b) => direction * sorter(a, b) || b.id - a.id);

    const page = Number(params.page ?? 1);
    const perPage = Number(params.per_page ?? 50);
    return {
      items: rows.slice((page - 1) * perPage, page * perPage).map(view),
      total: rows.length,
      page,
      per_page: perPage,
      pages: Math.ceil(rows.length / perPage),
    };
  });
}

function findTransaction(id) {
  const txn = state.transactions.find((t) => t.id === Number(id));
  if (!txn) throw apiError(404, "Transaction not found.");
  return txn;
}

function checkCategory(categoryId) {
  if (categoryId !== null && !findCategory(categoryId)) throw apiError(404, "Category not found.");
  return categoryId === null ? null : Number(categoryId);
}

export function updateTransactionCategory(id, categoryId) {
  return respond(() => {
    const txn = findTransaction(id);
    txn.category_id = checkCategory(categoryId);
    return view(txn);
  });
}

export function deleteTransaction(id) {
  return respond(() => {
    const txn = findTransaction(id);
    state.transactions = state.transactions.filter((t) => t !== txn && t.parent_transaction_id !== txn.id);
    return { deleted: txn.id };
  });
}

export function bulkUpdateTransactions(transactionIds, categoryId) {
  return respond(() => {
    const category = checkCategory(categoryId);
    const targets = leaves().filter((t) => transactionIds.includes(t.id));
    targets.forEach((t) => (t.category_id = category));
    return { updated: targets.length };
  });
}

export function bulkDeleteTransactions(transactionIds) {
  return respond(() => {
    const targets = new Set(leaves().filter((t) => transactionIds.includes(t.id)));
    state.transactions = state.transactions.filter((t) => !targets.has(t));
    return { deleted: targets.size };
  });
}

export function splitTransaction(id, splits) {
  return respond(() => {
    const txn = findTransaction(id);
    if (txn.is_split_parent) throw apiError(404, "Transaction not found.");
    if (!Array.isArray(splits) || splits.length < 2) throw apiError(400, "Provide between 2 and 50 splits.");
    const total = splits.reduce((sum, s) => sum + Number(s.amount), 0);
    if (splits.some((s) => !Number(s.amount)) || round2(total) !== round2(txn.amount)) {
      throw apiError(400, "Split amounts must add up to the original transaction amount.");
    }
    splits.forEach((s) => checkCategory(Number(s.category_id)));
    txn.is_split_parent = true;
    splits.forEach((s, index) =>
      state.transactions.push({
        ...txn,
        id: state.nextId++,
        description: `${txn.description} (split ${index + 1})`,
        amount: Number(s.amount),
        category_id: Number(s.category_id),
        parent_transaction_id: txn.id,
        is_split_parent: false,
      }),
    );
    return { split: txn.id, children: splits.length };
  });
}

// Reads simple CSV statements (date, description, amount columns) in the browser.
// Anything else (e.g. .xlsx) imports a few sample rows so the flow can still be demonstrated.
function parseStatement(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  if (!header) return [];
  const columns = header.split(",").map((c) => c.trim().toLowerCase());
  const [dateAt, descAt, amountAt] = ["date", "description", "amount"].map((name) =>
    columns.findIndex((c) => c.includes(name)),
  );
  if ([dateAt, descAt, amountAt].includes(-1)) return [];
  return lines
    .map((line) => line.split(","))
    .map((cells) => ({
      date: new Date(cells[dateAt]),
      description: (cells[descAt] ?? "").trim(),
      amount: Number(cells[amountAt]),
    }))
    .filter((row) => !Number.isNaN(row.date.getTime()) && row.description && Number.isFinite(row.amount))
    .map((row) => ({ ...row, date: isoDate(row.date) }));
}

function sampleImportRows() {
  const today = new Date();
  const daysAgo = (n) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() - n));
  return [
    { date: daysAgo(1), description: "Fresh Basket Grocers", amount: -64.2 },
    { date: daysAgo(2), description: "Rideshare Co trip", amount: -18.75 },
    { date: daysAgo(3), description: "Brightline Ad Campaign", amount: -210 },
  ];
}

export async function uploadFile(file) {
  await wait();
  let rows = [];
  if (file.name.toLowerCase().endsWith(".csv")) rows = parseStatement(await file.text());
  if (rows.length === 0) rows = sampleImportRows();

  const known = new Set(
    state.transactions.map((t) => `${t.date}|${t.description.toLowerCase()}|${t.amount}`),
  );
  let inserted = 0;
  let duplicates = 0;
  for (const row of rows) {
    const key = `${row.date}|${row.description.toLowerCase()}|${row.amount}`;
    if (known.has(key)) {
      duplicates++;
      continue;
    }
    known.add(key);
    state.transactions.push({
      id: state.nextId++,
      ...row,
      category_id: categorize(row.description),
      source_file: file.name,
      parent_transaction_id: null,
      is_split_parent: false,
    });
    inserted++;
  }
  return { rows_seen: rows.length, inserted, duplicates_skipped: duplicates };
}

// ---------- categories ----------

export const getCategories = () =>
  respond(() => [...state.categories].sort((a, b) => a.name.localeCompare(b.name)));

export function createCategory({ name, type = "expense" }) {
  return respond(() => {
    const trimmed = String(name ?? "").trim();
    if (!trimmed || trimmed.length > 100) throw apiError(400, "name must be between 1 and 100 characters.");
    if (!["expense", "income"].includes(type)) throw apiError(400, "type must be 'expense' or 'income'.");
    if (state.categories.some((c) => c.name === trimmed)) throw apiError(409, "Category already exists.");
    const category = { id: Math.max(0, ...state.categories.map((c) => c.id)) + 1, name: trimmed, type };
    state.categories.push(category);
    return category;
  });
}

const ruleView = (rule) => ({ ...rule, category_name: categoryName(rule.category_id) });

export const getCategoryRules = () => respond(() => state.rules.map(ruleView));

export function createCategoryRule({ keyword, category_id: categoryId }) {
  return respond(() => {
    const trimmed = String(keyword ?? "").trim();
    if (!trimmed) throw apiError(400, "keyword must be between 1 and 200 characters.");
    if (!findCategory(categoryId)) throw apiError(404, "Category not found.");
    const rule = {
      id: Math.max(0, ...state.rules.map((r) => r.id)) + 1,
      keyword: trimmed,
      category_id: Number(categoryId),
    };
    state.rules.push(rule);
    return ruleView(rule);
  });
}

// ---------- analytics ----------

export function getSummary(params = {}) {
  return respond(() => {
    const rows = leaves().filter((t) => inRange(t, params));
    const income = rows.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expense = rows.filter((t) => t.amount < 0).reduce((sum, t) => sum - t.amount, 0);
    const net = income - expense;
    return {
      total_income: round2(income),
      total_expense: round2(expense),
      net: round2(net),
      savings_rate_pct: income > 0 ? Math.round((net / income) * 1000) / 10 : 0,
      transaction_count: rows.length,
    };
  });
}

export function getByCategory(params = {}) {
  return respond(() => {
    const totals = new Map();
    for (const t of leaves().filter((row) => row.amount < 0 && inRange(row, params))) {
      const name = categoryName(t.category_id) ?? "Uncategorized";
      totals.set(name, (totals.get(name) ?? 0) + -t.amount);
    }
    return [...totals]
      .map(([category, total]) => ({ category, total: round2(total) }))
      .sort((a, b) => b.total - a.total);
  });
}

export function getTrend(params = {}) {
  return respond(() => {
    const months = new Map();
    for (const t of leaves().filter((row) => inRange(row, params))) {
      const bucket = months.get(t.date.slice(0, 7)) ?? { income: 0, expense: 0 };
      if (t.amount > 0) bucket.income += t.amount;
      else bucket.expense += -t.amount;
      months.set(t.date.slice(0, 7), bucket);
    }
    return [...months]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { income, expense }]) => ({
        month,
        income: round2(income),
        expense: round2(expense),
        net: round2(income - expense),
      }));
  });
}

// ---------- budgets & insights ----------

export function getBudgets(month) {
  return respond(() => {
    requireMonth(month);
    const spend = monthSpend(month);
    return state.budgets
      .filter((b) => b.month === month)
      .map((b) => {
        const actual = spend.get(b.category_id) ?? 0;
        return {
          id: b.id,
          category_id: b.category_id,
          category_name: categoryName(b.category_id),
          month: b.month,
          planned: round2(b.amount),
          actual: round2(actual),
          variance: round2(b.amount - actual),
          pct_used: Math.round((actual / b.amount) * 1000) / 10,
        };
      })
      .sort((a, b) => a.category_name.localeCompare(b.category_name));
  });
}

export function saveBudget({ category_id: categoryId, month, amount }) {
  return respond(() => {
    requireMonth(month);
    if (!(Number(amount) > 0)) throw apiError(400, "Budget amount must be greater than zero.");
    const category = findCategory(categoryId);
    if (!category) throw apiError(404, "Category not found.");
    if (category.type !== "expense") throw apiError(400, "Budgets can only be set for expense categories.");

    let budget = state.budgets.find((b) => b.category_id === category.id && b.month === month);
    if (budget) budget.amount = Number(amount);
    else {
      budget = {
        id: Math.max(0, ...state.budgets.map((b) => b.id)) + 1,
        category_id: category.id,
        month,
        amount: Number(amount),
      };
      state.budgets.push(budget);
    }
    return { id: budget.id, category_id: category.id, month, planned: budget.amount };
  });
}

export function deleteBudget(id) {
  return respond(() => {
    if (!state.budgets.some((b) => b.id === Number(id))) throw apiError(404, "Budget not found.");
    state.budgets = state.budgets.filter((b) => b.id !== Number(id));
    return { deleted: Number(id) };
  });
}

export function getInsights(month) {
  return respond(() => {
    requireMonth(month);
    const insights = [];
    const spend = monthSpend(month);
    const idsFor = (categoryId) =>
      leaves()
        .filter((t) => t.category_id === categoryId && t.amount < 0 && t.date.startsWith(month))
        .map((t) => t.id);

    for (const budget of state.budgets.filter((b) => b.month === month)) {
      const actual = spend.get(budget.category_id) ?? 0;
      if (actual > budget.amount) {
        const name = categoryName(budget.category_id);
        insights.push({
          type: "over_budget",
          category: name,
          message: `${name} spend is ${Math.round(((actual - budget.amount) / budget.amount) * 100)}% over budget this month.`,
          severity: "warning",
          related_transaction_ids: idsFor(budget.category_id),
          category_id: budget.category_id,
          amount: round2(actual - budget.amount),
        });
      }
    }

    const [year, monthNumber] = month.split("-").map(Number);
    const priorMonths = [1, 2, 3].map((back) => currentMonth(new Date(year, monthNumber - 1 - back, 1)));
    for (const [categoryId, actual] of spend) {
      const average = priorMonths.reduce((sum, m) => sum + (monthSpend(m).get(categoryId) ?? 0), 0) / 3;
      if (average > 0 && actual > average * 1.2) {
        const name = categoryName(categoryId);
        insights.push({
          type: "trending_up",
          category: name,
          message: `${name} spend is ${Math.round(((actual - average) / average) * 100)}% above its trailing three-month average.`,
          severity: "info",
          related_transaction_ids: idsFor(categoryId),
          category_id: categoryId,
          amount: round2(actual - average),
        });
      }
    }
    return insights.sort((a, b) => (a.severity !== "warning") - (b.severity !== "warning"));
  });
}

// ---------- reports ----------

function csvEscape(value) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function downloadTransactionReport(params, format) {
  return respond(() => {
    if (format !== "csv")
      throw apiError(501, "Excel export is only available with the real backend. Try CSV.");
    const rows = leaves()
      .filter((t) => inRange(t, params))
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((t) => [t.date, t.description, t.amount, categoryName(t.category_id) ?? "Uncategorized"]);
    const body = [["Date", "Description", "Amount", "Category"], ...rows]
      .map((row) => row.map(csvEscape).join(","))
      .join("\n");
    return new Blob([body], { type: "text/csv" });
  });
}

// One-page PDF built by hand, same approach as the backend's services/pdf.py.
function buildSummaryPdf(month, income, expenses, count) {
  const money = (n) =>
    `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const lines = [
    `Ledger monthly summary (demo data) - ${month}`,
    `Income: ${money(income)}`,
    `Expenses: ${money(expenses)}`,
    `Net: ${money(income - expenses)}`,
    `Transactions: ${count}`,
  ];
  const content = `BT /F1 15 Tf 50 760 Td ${lines.map((line) => `(${line}) Tj 0 -24 Td`).join(" ")} ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objects.map((body, index) => {
    const offset = pdf.length;
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    return offset;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export function downloadMonthlySummary(month) {
  return respond(() => {
    requireMonth(month);
    const rows = leaves().filter((t) => t.date.startsWith(month));
    const income = rows.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const expenses = rows.filter((t) => t.amount < 0).reduce((sum, t) => sum - t.amount, 0);
    return buildSummaryPdf(month, income, expenses, rows.length);
  });
}

// ---------- "Ask Benny" ----------

export function askLedger(question) {
  return respond(() => {
    const text = String(question ?? "").trim();
    if (!text) throw apiError(400, "Ask a question first.");
    const month = currentMonth();
    const rows = leaves().filter((t) => t.date.startsWith(month));
    const spend = rows.filter((t) => t.amount < 0);
    const total = spend.reduce((sum, t) => sum - t.amount, 0);
    const income = rows.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    const money = (n) =>
      `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const lower = text.toLowerCase();

    const mentioned = state.categories.find((c) => lower.includes(c.name.toLowerCase()));
    let answer;
    if (mentioned) {
      const amount = spend
        .filter((t) => t.category_id === mentioned.id)
        .reduce((sum, t) => sum - t.amount, 0);
      answer = `This month you've spent ${money(amount)} on ${mentioned.name}.`;
    } else if (/income|earn|salary/.test(lower)) {
      answer = `Your income so far this month is ${money(income)}.`;
    } else {
      const byCategory = new Map();
      spend.forEach((t) => {
        const name = categoryName(t.category_id) ?? "Uncategorized";
        byCategory.set(name, (byCategory.get(name) ?? 0) - t.amount);
      });
      const [top, topAmount] = [...byCategory].sort((a, b) => b[1] - a[1])[0] ?? ["n/a", 0];
      answer = `So far this month you've spent ${money(total)} against ${money(income)} of income. Your biggest category is ${top} at ${money(topAmount)}.`;
    }
    return { answer: `${answer} (Demo mode: this answer is generated locally from sample data.)` };
  });
}
