// Real API client: talks to the Flask backend using JWT bearer tokens.
import axios from "axios";
import { API_BASE_URL } from "./config";

const ACCESS_KEY = "ledger.access_token";
const REFRESH_KEY = "ledger.refresh_token";

function readToken(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeTokens({ access, refresh }) {
  try {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    // Storage unavailable (private mode): the session simply won't survive a reload.
  }
}

function clearTokens() {
  try {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // ignore
  }
}

const client = axios.create({ baseURL: API_BASE_URL });
// A bare instance for the refresh call so it can't trigger our own 401 handling.
const refreshClient = axios.create({ baseURL: API_BASE_URL });

client.interceptors.request.use((config) => {
  const token = readToken(ACCESS_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Credential endpoints return 401 for bad input; those must not trigger a token refresh.
const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/demo", "/auth/refresh"];

let refreshing = null;

async function refreshAccessToken() {
  const refresh = readToken(REFRESH_KEY);
  if (!refresh) throw new Error("No refresh token");
  const { data } = await refreshClient.post("/auth/refresh", null, {
    headers: { Authorization: `Bearer ${refresh}` },
  });
  writeTokens({ access: data.access_token });
  return data.access_token;
}

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isAuthCall = AUTH_ENDPOINTS.includes(config?.url);
    if (response?.status !== 401 || config?._retried || isAuthCall) throw error;
    try {
      // Share one refresh between concurrent requests.
      refreshing ??= refreshAccessToken().finally(() => (refreshing = null));
      const token = await refreshing;
      config._retried = true;
      config.headers.Authorization = `Bearer ${token}`;
      return client(config);
    } catch {
      clearTokens();
      throw error;
    }
  },
);

function storeSession(data) {
  writeTokens({ access: data.access_token, refresh: data.refresh_token });
  return data.user;
}

export async function login(credentials) {
  const { data } = await client.post("/auth/login", credentials);
  return storeSession(data);
}

export async function register(credentials) {
  const { data } = await client.post("/auth/register", credentials);
  return storeSession(data);
}

export async function loginDemo() {
  const { data } = await client.post("/auth/demo");
  return storeSession(data);
}

export async function logout() {
  // JWTs are stateless: signing out means discarding the tokens client-side.
  clearTokens();
}

export async function getCurrentUser() {
  const { data } = await client.get("/auth/me");
  return data;
}

export async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await client.post("/upload", formData);
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
