// Single entry point for the UI's API calls.
//
// With VITE_DEMO_MODE=true the in-memory mock (./mock) is used and no network
// requests are made. Otherwise the real Flask backend is called (./real).
// Both modules export the same function names, so pages don't care which is active.
import { DEMO_MODE } from "./config";
import * as mock from "./mock";
import * as real from "./real";

const api = DEMO_MODE ? mock : real;

export const {
  login,
  register,
  loginDemo,
  logout,
  getCurrentUser,
  uploadFile,
  getTransactions,
  updateTransactionCategory,
  deleteTransaction,
  bulkUpdateTransactions,
  bulkDeleteTransactions,
  splitTransaction,
  getCategories,
  createCategory,
  getCategoryRules,
  createCategoryRule,
  getSummary,
  getByCategory,
  getTrend,
  getBudgets,
  saveBudget,
  deleteBudget,
  getInsights,
  downloadTransactionReport,
  downloadMonthlySummary,
  askLedger,
} = api;
