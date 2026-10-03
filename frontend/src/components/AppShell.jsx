import { NavLink, Outlet, useNavigate } from 'react-router-dom';

export default function AppShell({ session, onLogout }) {
  const navigate = useNavigate();
  const isOwner = session?.user?.role === 'owner';

  const links = [
    { to: '/', label: 'Today', icon: '◉', end: true, show: true },
    { to: '/sell', label: 'Sell', icon: '＋', show: true },
    { to: '/stock', label: 'Stock', icon: '▤', show: isOwner },
    { to: '/reports', label: 'Reports', icon: '▦', show: isOwner },
    { to: '/more', label: 'More', icon: '⋯', show: true },
  ].filter((l) => l.show);

  function logout() {
    onLogout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app">
      <nav className="sidebar" aria-label="Primary">
        <strong>Inventory Tracker</strong>
        <span className="stat-label">{session?.user?.email} ({session?.user?.role})</span>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            {l.label}
          </NavLink>
        ))}
        <button className="btn btn-ghost" onClick={logout}>Log out</button>
      </nav>
      <main className="main">
        <Outlet />
      </main>
      <nav className="bottomnav" aria-label="Primary">
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <span className="ico" aria-hidden="true">{l.icon}</span>{l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
