import { useState } from 'react'

import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { useAuth } from '../auth/AuthProvider'
import type { UserRole } from '../lib/types'
import { Badge, Card, Empty, ErrorBox, Field, Spinner, humanize, shortDate } from '../components/ui'

const ROLES: UserRole[] = ['student', 'owner', 'worker', 'manager', 'admin']

const roleTone = (role: UserRole) =>
  role === 'admin' ? 'bad' : role === 'manager' ? 'info' : role === 'student' ? 'neutral' : 'good'

/**
 * Staff directory. Promoting someone to `worker` lets them post and manage
 * listings; `manager`/`admin` unlock the customer-service actions.
 * Only an Admin may change roles — the API enforces this too.
 */
export function Employees() {
  const { isAdmin, profile } = useAuth()
  const [role, setRole] = useState<UserRole | ''>('')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  const { data, loading, error, reload, setData } = useAsync(
    () => api.users({ role: role || undefined, q: query || undefined }),
    [role, query],
  )
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function changeRole(id: string, next: UserRole) {
    setBusyId(id)
    setActionError(null)
    try {
      const updated = await api.setRole(id, next)
      setData((list) => list.map((u) => (u.id === id ? updated : u)))
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <header className="page__head">
        <h1>Employees</h1>
        <p className="page__sub">
          {isAdmin
            ? 'Promote staff to Worker, Manager, or Admin.'
            : 'Read-only — only an Admin can change roles.'}
        </p>
      </header>

      {isAdmin && <AddManager onCreated={reload} />}

      <Card>
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault()
            setQuery(search.trim())
          }}
        >
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole | '')}>
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {humanize(r)}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email"
          />
          <button type="submit" className="btn btn--ghost btn--sm">
            Search
          </button>
        </form>
      </Card>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {actionError && <ErrorBox message={actionError} />}

      {data && data.length === 0 && <Empty title="No users match those filters." />}

      {data && data.length > 0 && (
        <Card>
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th className="num">Bookings</th>
                  <th>Joined</th>
                  {isAdmin && <th>Change role</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((u) => {
                  const isSelf = u.id === profile?.id
                  return (
                    <tr key={u.id}>
                      <td>
                        <span className="cell__main">{u.name}</span>
                        {u.phone && <span className="cell__sub">{u.phone}</span>}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <Badge tone={roleTone(u.role)}>{humanize(u.role)}</Badge>
                      </td>
                      <td className="num">{u.bookingCount}</td>
                      <td>{shortDate(u.createdAt)}</td>
                      {isAdmin && (
                        <td>
                          <select
                            value={u.role}
                            disabled={busyId === u.id || isSelf}
                            title={isSelf ? 'You cannot change your own role.' : undefined}
                            onChange={(e) => void changeRole(u.id, e.target.value as UserRole)}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {humanize(r)}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}


/**
 * Onboards a hostel manager who signs up at MeDan's desk rather than in the
 * app. The temporary password is shown once — hand it over in person and have
 * them change it in the app's Settings after first login.
 */
function AddManager({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('owner')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ email: string; password: string } | null>(null)

  const ready = name.trim() && email.trim() && password.trim().length >= 8

  async function create() {
    setSaving(true)
    setError(null)
    try {
      await api.createUser({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password: password.trim(),
        role,
      })
      setDone({ email: email.trim(), password: password.trim() })
      setName(''); setEmail(''); setPhone(''); setPassword('')
      onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card
      title="Add a hostel manager"
      action={
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(!open)}>
          {open ? 'Close' : 'New account'}
        </button>
      }
    >
      {done && (
        <div className="sendresult">
          Account created. Hand these over in person — this is the only time the
          password is shown: <strong>{done.email}</strong> / <strong>{done.password}</strong>.
          They should change it in the app after first sign-in.
        </div>
      )}
      {!open ? (
        <p className="cell__sub">
          For owners who sign up at your desk instead of in the app. Creates the
          account with a temporary password and the right role in one step.
        </p>
      ) : (
        <>
          {error && <ErrorBox message={error} />}
          <div className="grid grid--2">
            <Field label="Full name">
              <input value={name} maxLength={150} onChange={(e) => setName(e.target.value)}
                placeholder="Akosua Mensah" />
            </Field>
            <Field label="Email">
              <input type="email" value={email} maxLength={256}
                onChange={(e) => setEmail(e.target.value)} placeholder="owner@hostel.com" />
            </Field>
            <Field label="Phone (optional)">
              <input value={phone} maxLength={30} onChange={(e) => setPhone(e.target.value)}
                placeholder="024 123 4567" />
            </Field>
            <Field label="Temporary password" hint="Min 8 characters. Shown once after creation.">
              <input value={password} maxLength={100}
                onChange={(e) => setPassword(e.target.value)} placeholder="e.g. Sunyani2026!" />
            </Field>
            <Field label="Role" hint="Owner runs a company; Worker is their staff.">
              <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                <option value="owner">Owner</option>
                <option value="worker">Worker</option>
                <option value="manager">Platform manager</option>
              </select>
            </Field>
          </div>
          <button type="button" className="btn btn--primary" disabled={!ready || saving}
            onClick={() => void create()}>
            {saving ? 'Creating…' : 'Create account'}
          </button>
        </>
      )}
    </Card>
  )
}
