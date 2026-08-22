import { useState, type FormEvent } from 'react'

import { useAuth } from '../auth/AuthProvider'
import { ErrorBox, Field } from '../components/ui'

type Mode = 'login' | 'bootstrap'

/**
 * Staff sign-in against the MeDan API (no Firebase — that's the mobile app's
 * identity source). "Bootstrap" creates the very first Admin on a fresh
 * deployment; the API rejects it once any staff account exists.
 */
export function Login() {
  const { signIn, registerStaff } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') await signIn(email.trim(), password)
      else await registerStaff({ email: email.trim(), password, name: name.trim() })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <form className="login__card" onSubmit={submit}>
        <div className="brand brand--lg">
          <img className="brand__logo brand__logo--lg" src="/medan-logo.png" alt="" />
          <span className="brand__text">
            MeDan <em>Admin</em>
          </span>
        </div>
        <p className="login__hint">
          {mode === 'login'
            ? 'Staff sign-in.'
            : 'Create the first administrator for this deployment.'}
        </p>

        {error && <ErrorBox message={error} />}

        {mode === 'bootstrap' && (
          <Field label="Full name">
            <input
              value={name}
              required
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ama Mensah"
            />
          </Field>
        )}

        <Field label="Email">
          <input
            type="email"
            value={email}
            autoComplete="username"
            required
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@medan.app"
          />
        </Field>

        <Field
          label="Password"
          hint={mode === 'bootstrap' ? 'At least 10 characters.' : undefined}
        >
          <input
            type="password"
            value={password}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'bootstrap' ? 10 : undefined}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        <button type="submit" className="btn btn--primary" disabled={busy}>
          {busy
            ? mode === 'login'
              ? 'Signing in…'
              : 'Creating…'
            : mode === 'login'
              ? 'Sign in'
              : 'Create admin account'}
        </button>

        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => {
            setMode(mode === 'login' ? 'bootstrap' : 'login')
            setError(null)
          }}
        >
          {mode === 'login' ? 'First time? Create the admin account' : 'Back to sign in'}
        </button>
      </form>
    </div>
  )
}
