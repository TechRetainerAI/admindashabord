import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '../auth/AuthProvider'
import { Badge } from './ui'

function Icon({ d }: { d: string }) {
  return (
    <svg
      className="nav__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  )
}

// Minimal single-path outline icons (Feather-style).
const ICONS: Record<string, string> = {
  overview: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  support: 'M21 11a8 8 0 1 0-3 6.2L21 19l-.7-3.2A8 8 0 0 0 21 11z',
  bookings: 'M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  hostels: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 11h.01M15 11h.01',
  payments: 'M2 6h20v12H2zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM5.5 12h.01M18.5 12h.01',
  add: 'M12 5v14M5 12h14',
  employees: 'M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 21v-2a4 4 0 0 0-3-3.9M15.5 3.3a4 4 0 0 1 0 7.5',
  referrals: 'M18 8a3 3 0 1 0-2.8-4M6 15a3 3 0 1 0 2.8 4M15.6 6.6l-7.2 3.8M8.4 17.4l7.2-3.8M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 9a3 3 0 1 0 0-6',
  notifications: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M10.3 21a2 2 0 0 0 3.4 0',
  events: 'M12 2l3 6 7 1-5 4.9L18.2 21 12 17.7 5.8 21 7 13.9 2 9l7-1z',
}

const NAV = [
  { to: '/', label: 'Overview', icon: 'overview', end: true },
  { to: '/disputes', label: 'Customer service', icon: 'support' },
  { to: '/bookings', label: 'Bookings', icon: 'bookings' },
  { to: '/payments', label: 'Manual payments', icon: 'payments' },
  { to: '/hostels', label: 'Hostels', icon: 'hostels' },
  { to: '/hostels/new', label: 'Add hostel', icon: 'add' },
  { to: '/employees', label: 'Employees', icon: 'employees' },
  { to: '/referrals', label: 'Referrals', icon: 'referrals' },
  { to: '/notifications', label: 'Notifications', icon: 'notifications' },
  { to: '/events', label: 'Events', icon: 'events' },
]

export function Layout() {
  const { profile, logout } = useAuth()

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img className="brand__logo" src="/medan-logo.png" alt="" />
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
              <Icon d={ICONS[item.icon]} />
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
