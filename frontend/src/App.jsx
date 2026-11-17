import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import Categories from "./pages/Categories";
import Dashboard from "./pages/Dashboard";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Transactions from "./pages/Transactions";
import Login from "./pages/Login";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import Insights from "./pages/Insights";
import AiInsights from "./pages/AiInsights";
import Placeholder from "./pages/Placeholder";
import Legal from "./pages/Legal";
import Pricing from "./pages/Pricing";
import DemoLogin from "./pages/DemoLogin";
import { ToastProvider } from "./components/Toast";
import { getCurrentUser, logout } from "./api/client";

function ProtectedRoutes({ user }) {
  const location = useLocation();
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}

function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false));
  }, []);

  async function handleLogout() {
    await logout();
    setUser(null);
  }

  if (checkingSession) return <div className="app-loading">Loading Ledger…</div>;
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
          <Route
            path="/login"
            element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={setUser} />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/dashboard" replace /> : <Register onRegister={setUser} />}
          />
          <Route path="/pricing" element={<Pricing />} />
          <Route
            path="/demo"
            element={user ? <Navigate to="/dashboard" replace /> : <DemoLogin onLogin={setUser} />}
          />
          <Route path="/privacy" element={<Legal type="privacy" />} />
          <Route path="/terms" element={<Legal type="terms" />} />
          <Route path="/refunds" element={<Legal type="refunds" />} />
          <Route path="/cookies" element={<Legal type="cookies" />} />
          <Route element={<ProtectedRoutes user={user} />}>
            <Route element={<AppLayout user={user} onLogout={handleLogout} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/insights" element={<AiInsights />} />
              <Route path="/budgets" element={<Insights />} />
              <Route
                path="/vendors"
                element={<Placeholder title="Vendors" description="See where your money goes most often." />}
              />
              <Route
                path="/import-history"
                element={<Placeholder title="Import history" description="Review your statement imports." />}
              />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
