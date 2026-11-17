function rangeText(range) {
  if (range.start && range.end) return `${range.start} to ${range.end}`;
  if (range.start) return `From ${range.start}`;
  if (range.end) return `Until ${range.end}`;
  return "All time";
}

export default function TopNavbar({ range, onMenuToggle, onUpload, onSettings, user, onLogout }) {
  return (
    <header className="top-navbar">
      <button className="menu-button" onClick={onMenuToggle} aria-label="Toggle navigation">☰</button>
      <div className="navbar-brand">Benny Ent Software</div>
      <div className="navbar-range">{rangeText(range)}</div>
      <div className="navbar-actions">
        <button className="upload-button" onClick={onUpload}>↑ Upload statement</button>
        <button className="icon-button" onClick={onSettings} aria-label="Settings">⚙</button>
        <span className="navbar-user">{user?.username}</span>
        <button className="logout-button" onClick={onLogout}>Log out</button>
      </div>
    </header>
  );
}
