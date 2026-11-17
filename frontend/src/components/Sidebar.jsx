import { NavLink } from "react-router-dom";

const groups = [
  {
    label: "Overview",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: "grid" },
      { to: "/insights", label: "AI Insights", icon: "bulb", badge: "new" },
    ],
  },
  {
    label: "Money",
    items: [
      { to: "/transactions", label: "Transactions", icon: "list" },
      { to: "/budgets", label: "Budgets", icon: "chart" },
      { to: "/categories", label: "Categories & rules", icon: "heart" },
    ],
  },
  {
    label: "Output",
    items: [
      { to: "/reports", label: "Reports", icon: "file" },
      { to: "/vendors", label: "Vendors", icon: "users" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/import-history", label: "Import history", icon: "clock" },
      { to: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

function Icon({ name }) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="9" rx="1" />
        <rect x="14" y="3" width="7" height="5" rx="1" />
        <rect x="14" y="12" width="7" height="9" rx="1" />
        <rect x="3" y="16" width="7" height="5" rx="1" />
      </>
    ),
    bulb: (
      <>
        <path d="M12 2a7 7 0 0 0-4 12.7V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.3A7 7 0 0 0 12 2z" />
        <path d="M9 21h6" />
      </>
    ),
    list: (
      <>
        <path d="M8 6h13M8 12h13M8 18h13" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.9-8.6a5.5 5.5 0 0 0-.1-7.8z" />
    ),
    file: (
      <>
        <path d="M6 2h8l4 4v16H6z" />
        <path d="M14 2v5h5" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M2 21v-2a5 5 0 0 1 10 0v2M16 11a3 3 0 1 0 0-6M17 21v-2a5 5 0 0 0-3-4.6" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1-2.8 2.8-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2h-4v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1-2.8-2.8.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3v-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1 2.8-2.8.1.1a1.6 1.6 0 0 0 1.8.3 1.6 1.6 0 0 0 1-1.5V3h4v.2a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1 2.8 2.8-.1.1a1.6 1.6 0 0 0-.3 1.8 1.6 1.6 0 0 0 1.5 1h.2v4h-.2a1.6 1.6 0 0 0-1.5 1z" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export default function Sidebar({ open, onNavigate }) {
  return (
    <aside className={`sidebar grouped-sidebar ${open ? "sidebar-open" : ""}`}>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {groups.map((group) => (
          <div className="nav-group" key={group.label}>
            <span className="nav-group-label">{group.label}</span>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                onClick={onNavigate}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.badge && <span className="badge">{item.badge}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <button className="sidebar-collapse" type="button" onClick={onNavigate}>
        Collapse sidebar
      </button>
    </aside>
  );
}
