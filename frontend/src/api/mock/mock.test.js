import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function call(promise) {
  promise.catch(() => {}); // the caller asserts on rejections; avoid "unhandled" noise while timers run
  return vi.runAllTimersAsync().then(() => promise);
}

let api;
beforeEach(async () => {
  // The mock simulates network latency; make it instant for tests.
  vi.useFakeTimers({ toFake: ["setTimeout"] });
  vi.resetModules();
  const store = new Map();
  vi.stubGlobal("sessionStorage", {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  });
  api = await import("./index.js");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("demo auth", () => {
  it("rejects unauthenticated access, then logs in as the demo user", async () => {
    await expect(call(api.getCurrentUser())).rejects.toMatchObject({ response: { status: 401 } });
    const user = await call(api.loginDemo());
    expect(user.email).toBe("demo@example.com");
    expect(await call(api.getCurrentUser())).toEqual(user);
    await call(api.logout());
    await expect(call(api.getCurrentUser())).rejects.toBeDefined();
  });

  it("only accepts the demo identity on the login form", async () => {
    await expect(call(api.login({ identifier: "someone@else.com", password: "x" }))).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect((await call(api.login({ identifier: "demo@example.com", password: "anything" }))).username).toBe(
      "demo",
    );
  });
});

describe("sample data", () => {
  it("is fictional and spans several months", async () => {
    const trend = await call(api.getTrend());
    expect(trend.length).toBeGreaterThanOrEqual(6);
    const { items } = await call(api.getTransactions({ per_page: 500 }));
    expect(items.some((t) => t.description.includes("Acme Payroll"))).toBe(true);
    expect(JSON.stringify(items)).not.toMatch(/@|\+\d{6,}/);
  });

  it("paginates, filters, searches and sorts transactions", async () => {
    const page = await call(api.getTransactions({ page: 1, per_page: 5 }));
    expect(page.items).toHaveLength(5);
    expect(page.pages).toBe(Math.ceil(page.total / 5));
    const groceries = await call(api.getTransactions({ search: "grocers", per_page: 500 }));
    expect(groceries.items.every((t) => t.description.toLowerCase().includes("grocers"))).toBe(true);
    const asc = await call(api.getTransactions({ sort: "amount", direction: "asc", per_page: 3 }));
    expect(asc.items[0].amount).toBeLessThanOrEqual(asc.items[1].amount);
  });

  it("summary matches the sum of its transactions", async () => {
    const summary = await call(api.getSummary());
    const { items } = await call(api.getTransactions({ per_page: 1000 }));
    const income = items.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    expect(summary.total_income).toBeCloseTo(income, 2);
    expect(summary.net).toBeCloseTo(summary.total_income - summary.total_expense, 2);
  });
});

describe("in-memory mutations", () => {
  it("recategorises, bulk updates and deletes transactions", async () => {
    const { items } = await call(api.getTransactions({ per_page: 3 }));
    const categories = await call(api.getCategories());
    const target = categories.find((c) => c.name === "Procurement");

    const updated = await call(api.updateTransactionCategory(items[0].id, target.id));
    expect(updated.category_name).toBe("Procurement");
    expect(await call(api.bulkUpdateTransactions([items[1].id, items[2].id], null))).toEqual({ updated: 2 });

    const before = (await call(api.getTransactions())).total;
    await call(api.deleteTransaction(items[0].id));
    expect((await call(api.getTransactions())).total).toBe(before - 1);
    await expect(call(api.deleteTransaction(items[0].id))).rejects.toMatchObject({
      response: { status: 404 },
    });
    expect(await call(api.bulkDeleteTransactions([items[1].id]))).toEqual({ deleted: 1 });
  });

  it("splits a transaction into children that replace it", async () => {
    const { items } = await call(api.getTransactions({ search: "Maple Street Rent", per_page: 1 }));
    const rent = items[0];
    const categories = await call(api.getCategories());
    const [a, b] = categories.filter((c) => c.type === "expense");
    await expect(
      call(
        api.splitTransaction(rent.id, [
          { category_id: a.id, amount: -1 },
          { category_id: b.id, amount: -1 },
        ]),
      ),
    ).rejects.toMatchObject({ response: { status: 400 } });

    const result = await call(
      api.splitTransaction(rent.id, [
        { category_id: a.id, amount: rent.amount - 100 },
        { category_id: b.id, amount: 100 },
      ]),
    );
    expect(result.children).toBe(2);
    const after = await call(api.getTransactions({ search: "Maple Street Rent", per_page: 500 }));
    expect(after.items.some((t) => t.id === rent.id)).toBe(false);
    expect(after.items.filter((t) => t.parent_transaction_id === rent.id)).toHaveLength(2);
  });

  it("creates categories and rules, rejecting duplicates", async () => {
    const created = await call(api.createCategory({ name: "Pets", type: "expense" }));
    expect((await call(api.getCategories())).some((c) => c.id === created.id)).toBe(true);
    await expect(call(api.createCategory({ name: "Pets" }))).rejects.toMatchObject({
      response: { status: 409 },
    });
    const rule = await call(api.createCategoryRule({ keyword: "vet", category_id: created.id }));
    expect(rule.category_name).toBe("Pets");
    expect((await call(api.getCategoryRules())).some((r) => r.keyword === "vet")).toBe(true);
  });

  it("applies new rules to uploaded statements and skips duplicates", async () => {
    const csv = new File(["Date,Description,Amount\n2025-05-01,Rideshare Co trip,-12\n"], "march.csv");
    const first = await call(api.uploadFile(csv));
    expect(first).toEqual({ rows_seen: 1, inserted: 1, duplicates_skipped: 0 });
    const second = await call(api.uploadFile(csv));
    expect(second.duplicates_skipped).toBe(1);
    const { items } = await call(api.getTransactions({ start_date: "2025-05-01", end_date: "2025-05-01" }));
    expect(items[0].category_name).toBe("Transport");
  });
});

describe("budgets and insights", () => {
  const month = new Date().toISOString().slice(0, 7);

  it("saves, updates and deletes budgets with actuals", async () => {
    const categories = await call(api.getCategories());
    const procurement = categories.find((c) => c.name === "Procurement");
    const saved = await call(api.saveBudget({ category_id: procurement.id, month, amount: 500 }));
    expect(saved.planned).toBe(500);
    await call(api.saveBudget({ category_id: procurement.id, month, amount: 750 }));
    const budgets = await call(api.getBudgets(month));
    const mine = budgets.find((b) => b.id === saved.id);
    expect(mine).toMatchObject({ planned: 750, actual: 0, variance: 750 });
    await call(api.deleteBudget(saved.id));
    await expect(call(api.deleteBudget(saved.id))).rejects.toMatchObject({ response: { status: 404 } });
  });

  it("validates input and flags over-budget categories", async () => {
    await expect(call(api.getBudgets("2025-13"))).rejects.toMatchObject({ response: { status: 400 } });
    const categories = await call(api.getCategories());
    const salaries = categories.find((c) => c.name === "Salaries");
    await expect(call(api.saveBudget({ category_id: salaries.id, month, amount: 10 }))).rejects.toMatchObject(
      { response: { status: 400 } },
    );
    const groceries = categories.find((c) => c.name === "Groceries");
    await call(api.saveBudget({ category_id: groceries.id, month, amount: 1 }));
    const insights = await call(api.getInsights(month));
    expect(insights.some((i) => i.type === "over_budget" && i.category === "Groceries")).toBe(true);
  });
});

describe("reports and assistant", () => {
  it("builds a CSV export and a PDF summary", async () => {
    const csv = await call(api.downloadTransactionReport({}, "csv"));
    expect((await csv.text()).startsWith("Date,Description,Amount,Category")).toBe(true);
    await expect(call(api.downloadTransactionReport({}, "xlsx"))).rejects.toMatchObject({
      response: { status: 501 },
    });
    const pdf = await call(api.downloadMonthlySummary(new Date().toISOString().slice(0, 7)));
    expect(pdf.type).toBe("application/pdf");
    expect((await pdf.text()).startsWith("%PDF-1.4")).toBe(true);
  });

  it("answers questions locally and flags demo origin", async () => {
    const { answer } = await call(api.askLedger("How much did I spend on groceries?"));
    expect(answer).toMatch(/Groceries/);
    expect(answer).toMatch(/Demo mode/);
    await expect(call(api.askLedger("  "))).rejects.toMatchObject({ response: { status: 400 } });
  });
});
