// Deterministic, obviously-fictional sample data for Demo Mode.
// Every merchant, person and address here is invented.

const CATEGORIES = [
  ["Salaries", "income"],
  ["Transport", "expense"],
  ["Marketing", "expense"],
  ["Rent", "expense"],
  ["Utilities", "expense"],
  ["Procurement", "expense"],
  ["Software Subscriptions", "expense"],
  ["Groceries", "expense"],
  ["Entertainment", "expense"],
  ["Income", "income"],
  ["Other", "expense"],
];

const RULES = [
  ["payroll", "Salaries"],
  ["rent", "Rent"],
  ["power & light", "Utilities"],
  ["mobile plan", "Utilities"],
  ["rideshare", "Transport"],
  ["grocers", "Groceries"],
  ["streambox", "Entertainment"],
  ["cloudnotes", "Software Subscriptions"],
  ["ad campaign", "Marketing"],
];

// [day of month, description, [min, max] amount, category]. Negative = expense.
const MONTHLY_TEMPLATE = [
  [1, "Acme Payroll - monthly salary", [5200, 5200], "Salaries"],
  [2, "Maple Street Rent", [-1450, -1450], "Rent"],
  [4, "City Power & Light bill", [-160, -110], "Utilities"],
  [6, "Netfone Mobile Plan", [-45, -45], "Utilities"],
  [8, "Rideshare Co trip", [-30, -14], "Transport"],
  [10, "Fresh Basket Grocers", [-140, -70], "Groceries"],
  [13, "Corner Cafe lunch", [-25, -9], "Other"],
  [14, "StreamBox subscription", [-15.99, -15.99], "Entertainment"],
  [17, "Fresh Basket Grocers", [-140, -70], "Groceries"],
  [18, "Rideshare Co trip", [-30, -14], "Transport"],
  [20, "CloudNotes Pro subscription", [-12, -12], "Software Subscriptions"],
  [22, "Brightline Ad Campaign", [-300, -150], "Marketing"],
  [24, "Fresh Basket Grocers", [-140, -70], "Groceries"],
  [26, "Misc card payment", [-60, -20], null],
];

const MONTHS_OF_HISTORY = 6;

// Small seeded PRNG so the demo looks identical on every load.
function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function isoDate(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function currentMonth(now = new Date()) {
  return isoDate(now).slice(0, 7);
}

export function createInitialState(now = new Date()) {
  const random = mulberry32(2024);
  const state = {
    nextId: 1,
    categories: [],
    rules: [],
    transactions: [],
    budgets: [],
  };

  CATEGORIES.forEach(([name, type], index) => state.categories.push({ id: index + 1, name, type }));
  const categoryId = (name) => state.categories.find((c) => c.name === name)?.id ?? null;
  RULES.forEach(([keyword, name], index) =>
    state.rules.push({ id: index + 1, keyword, category_id: categoryId(name) }),
  );

  for (let offset = MONTHS_OF_HISTORY - 1; offset >= 0; offset--) {
    const first = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    for (const [day, description, [min, max], category] of MONTHLY_TEMPLATE) {
      const date = new Date(first.getFullYear(), first.getMonth(), day);
      if (date > now) continue;
      const amount = Math.round((min + random() * (max - min)) * 100) / 100;
      state.transactions.push({
        id: state.nextId++,
        date: isoDate(date),
        description,
        amount,
        category_id: categoryId(category),
        source_file: "sample_statement.csv",
        parent_transaction_id: null,
        is_split_parent: false,
      });
    }
  }

  // Budgets for the current month; Groceries is deliberately tight so the insights page has an alert.
  const month = currentMonth(now);
  [
    ["Groceries", 200],
    ["Transport", 120],
    ["Entertainment", 60],
    ["Utilities", 250],
  ].forEach(([name, amount], index) =>
    state.budgets.push({ id: index + 1, category_id: categoryId(name), month, amount }),
  );

  return state;
}
