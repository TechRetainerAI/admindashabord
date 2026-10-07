import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth } from './auth/AuthProvider'
import { Layout } from './components/Layout'
import { ErrorBox, Spinner } from './components/ui'
import { Bookings } from './pages/Bookings'
import { Dashboard } from './pages/Dashboard'
import { Disputes } from './pages/Disputes'
import { Employees } from './pages/Employees'
import { Events } from './pages/Events'
import { HostelDetail } from './pages/HostelDetail'
import { Hostels } from './pages/Hostels'
import { Login } from './pages/Login'
import { NewHostel } from './pages/NewHostel'
import { Notifications } from './pages/Notifications'
import { Payments } from './pages/Payments'
import { Referrals } from './pages/Referrals'

/**
 * Gate for the whole dashboard. Distinguishes the four states that otherwise
 * all look like "it didn't work": signed out, API unreachable, signed in but
 * unregistered, and signed in without staff rights.
 */
function Gate() {
  const { profile, loading, error, isStaff, logout } = useAuth()

  if (loading) return <Spinner label="Checking your access…" />

  if (error) {
    return <Denied title="Can’t reach the MeDan API" body={error} onSignOut={logout} />
  }

  if (!profile) return <Login />

  if (!isStaff) {
    return (
      <Denied
        title="Staff access only"
        body={`Signed in as ${profile.email} with the “${profile.role}” role. The dashboard needs Manager or Admin.`}
        onSignOut={logout}
      />
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="disputes" element={<Disputes />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="payments" element={<Payments />} />
        <Route path="hostels" element={<Hostels />} />
        <Route path="hostels/new" element={<NewHostel />} />
        <Route path="hostels/:id" element={<HostelDetail />} />
        <Route path="employees" element={<Employees />} />
        <Route path="referrals" element={<Referrals />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="events" element={<Events />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Denied({
  title,
  body,
  onSignOut,
}: {
  title: string
  body: string
  onSignOut: () => void
}) {
  return (
    <div className="login">
      <div className="login__card">
        <h1 className="denied__title">{title}</h1>
        <ErrorBox message={body} />
        <button type="button" className="btn btn--ghost" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </div>
  )
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  )
}
