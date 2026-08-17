import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { Badge } from './ui'

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/disputes', label: 'Customer service' },
  { to: '/bookings', label: 'Bookings' },
  { to: '/hostels', label: 'Hostels' },
  { to: '/hostels/new', label: 'Add hostel' },
  { to: '/employees', label: 'Employees' },
  { to: '/referrals', label: 'Referrals' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/events', label: 'Events' },
]

export function Layout() {
  const { profile, logout } = useAuth()

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand__mark">MD</span>
          <span className="brand__text">
            MeDan <em>Admin</em>
          </span>
        </div>

        <nav className="nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav__link${isActive ? ' nav__link--active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__foot">
          <div className="who">
            <span className="who__name">{profile?.name ?? '—'}</span>
            <span className="who__email">{profile?.email}</span>
            {profile && <Badge tone="info">{profile.role}</Badge>}
          </div>
          <button type="button" className="btn btn--ghost btn--sm" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
