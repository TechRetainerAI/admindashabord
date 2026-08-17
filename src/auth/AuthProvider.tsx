import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { ApiError, api } from '../lib/api'
import { session } from '../lib/session'
import type { Me, UserRole } from '../lib/types'

interface AuthState {
  /** The signed-in staff user, or null when signed out. */
  profile: Me | null
  /** True until a stored token has been validated on load. */
  loading: boolean
  /** Set when the session check failed for a reason other than a bad token (API down). */
  error: string | null
  isStaff: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  /** Bootstrap the first Admin, or (as an Admin) add another staff account. */
  registerStaff: (body: {
    email: string
    password: string
    name: string
    role?: UserRole
  }) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Me | null>(null)
  // Nothing to restore without a stored token, so skip the loading state entirely.
  const [loading, setLoading] = useState(Boolean(session.get()))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!session.get()) return

    let cancelled = false
    api
      .me()
      .then((me) => {
        if (!cancelled) setProfile(me)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        // 401 just means the stored token expired — drop it and show the login
        // form rather than an error the user can't act on.
        if (e instanceof ApiError && e.status === 401) session.clear()
        else setError(e instanceof Error ? e.message : String(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password)
    session.set(res.token)
    setProfile(res.user)
    setError(null)
  }, [])

  const registerStaff = useCallback(
    async (body: { email: string; password: string; name: string; role?: UserRole }) => {
      const res = await api.register(body)
      // Registering as an existing Admin creates someone else's account — don't
      // swap the current session for theirs.
      if (!session.get()) {
        session.set(res.token)
        setProfile(res.user)
      }
      setError(null)
    },
    [],
  )

  const logout = useCallback(() => {
    session.clear()
    setProfile(null)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      profile,
      loading,
      error,
      isStaff: profile?.role === 'admin' || profile?.role === 'manager',
      isAdmin: profile?.role === 'admin',
      signIn,
      registerStaff,
      logout,
    }),
    [profile, loading, error, signIn, registerStaff, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
