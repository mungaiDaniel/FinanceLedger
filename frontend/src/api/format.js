export function formatKES(amount) {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  return `${sign}${abs.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatMonth(monthStr) {
  // monthStr like "2026-07"
  const [year, month] = monthStr.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function formatDate(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
