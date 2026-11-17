import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";

export default function AppLayout({ user, onLogout }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadRequest, setUploadRequest] = useState(0);
  const [range, setRange] = useState({ start: "", end: "" });
  const [commandOpen, setCommandOpen] = useState(false);
  const [command, setCommand] = useState("");

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") setCommandOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  const commands = [
    { label: "Go to Dashboard", to: "/dashboard" },
    { label: "Go to Transactions", to: "/transactions" },
    { label: "Go to Budgets & Insights", to: "/insights" },
    { label: "Go to Reports", to: "/reports" },
    { label: "Upload a statement", action: openUpload },
  ];

  function openUpload() {
    navigate("/dashboard");
    setUploadRequest((value) => value + 1);
  }

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />
      <div className="app-content">
        <TopNavbar
          range={range}
          onMenuToggle={() => setSidebarOpen((open) => !open)}
          onUpload={openUpload}
          onSettings={() => navigate("/settings")}
          user={user}
          onLogout={onLogout}
        />
        <main className="page-content">
          <Outlet context={{ range, setRange, uploadRequest }} />
        </main>
      </div>
      {commandOpen && (
        <div className="dialog-backdrop" onMouseDown={() => setCommandOpen(false)}>
          <div className="command-palette" onMouseDown={(event) => event.stopPropagation()}>
            <input
              className="text-input"
              autoFocus
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="Search commands…"
            />
            {commands
              .filter((item) => item.label.toLowerCase().includes(command.toLowerCase()))
              .map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    setCommandOpen(false);
                    setCommand("");
                    if (item.action) item.action();
                    else navigate(item.to);
                  }}
                >
                  {item.label}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
