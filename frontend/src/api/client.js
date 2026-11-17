import axios from "axios";

// In development, use Vite's /api proxy so the browser and API share one
// origin (which lets the Flask session cookie work reliably). Set VITE_API_URL
// only when the frontend is deployed separately from the backend.
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

const client = axios.create({ baseURL: BASE_URL, withCredentials: true });

export async function login(credentials) {
  const { data } = await client.post("/auth/login", credentials);
  return data;
}

export async function register(credentials) {
  const { data } = await client.post("/auth/register", credentials);
  return data;
}

export async function loginDemo() {
  const { data } = await client.post("/auth/demo");
  return data;
}

export async function logout() {
  const { data } = await client.post("/auth/logout");
  return data;
}

export async function getCurrentUser() {
  const { data } = await client.get("/auth/me");
  return data;
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await client.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function getTransactions(params = {}) {
  const { data } = await client.get("/transactions", { params });
  return data;
}

export async function updateTransactionCategory(id, categoryId) {
  const { data } = await client.patch(`/transactions/${id}`, { category_id: categoryId });
  return data;
}

export async function deleteTransaction(id) {
  const { data } = await client.delete(`/transactions/${id}`);
  return data;
}

export async function bulkUpdateTransactions(transactionIds, categoryId) {
  const { data } = await client.patch("/transactions/bulk", {
    transaction_ids: transactionIds,
    category_id: categoryId,
  });
  return data;
}

export async function bulkDeleteTransactions(transactionIds) {
  const { data } = await client.delete("/transactions/bulk", { data: { transaction_ids: transactionIds } });
  return data;
}

export async function splitTransaction(id, splits) {
  const { data } = await client.post(`/transactions/${id}/split`, { splits });
  return data;
}

export async function getCategories() {
  const { data } = await client.get("/categories");
  return data;
}

export async function createCategory(category) {
  const { data } = await client.post("/categories", category);
  return data;
}

export async function getCategoryRules() {
  const { data } = await client.get("/categories/rules");
  return data;
}

export async function createCategoryRule(rule) {
  const { data } = await client.post("/categories/rules", rule);
  return data;
}

export async function getSummary(params = {}) {
  const { data } = await client.get("/analytics/summary", { params });
  return data;
}

export async function getByCategory(params = {}) {
  const { data } = await client.get("/analytics/by-category", { params });
  return data;
}

export async function getTrend(params = {}) {
  const { data } = await client.get("/analytics/trend", { params });
  return data;
}

export async function getBudgets(month) {
  const { data } = await client.get("/budgets", { params: { month } });
  return data;
}

export async function saveBudget(budget) {
  const { data } = await client.post("/budgets", budget);
  return data;
}

export async function deleteBudget(id) {
  const { data } = await client.delete(`/budgets/${id}`);
  return data;
}

export async function getInsights(month) {
  const { data } = await client.get("/insights", { params: { month } });
  return data;
}

export async function downloadTransactionReport(params, format) {
  const response = await client.get("/reports/transactions", {
    params: { ...params, format },
    responseType: "blob",
  });
  return response.data;
}

export async function downloadMonthlySummary(month) {
  const response = await client.get("/reports/monthly-summary", { params: { month }, responseType: "blob" });
  return response.data;
}

export async function askLedger(question) {
  const { data } = await client.post("/ai/ask", { question });
  return data;
}

export default client;
