import type { ReactNode } from 'react'

/** Inline status/tone chip — booking states, roles, verification. */
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info'
}) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="spinner" role="status">
      <div className="spinner__dot" />
      <span>{label}</span>
    </div>
  )
}

/** Error banner. `onRetry` renders a retry button when the failure is transient. */
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="errorbox" role="alert">
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  )
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {hint && <p className="empty__hint">{hint}</p>}
    </div>
  )
}

export function Card({
  title,
  action,
  children,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="card">
      {(title || action) && (
        <header className="card__head">
          {title && <h2 className="card__title">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  )
}

/** Maps a camelCase booking status to a chip tone. */
export function statusTone(status: string): 'neutral' | 'good' | 'warn' | 'bad' | 'info' {
  switch (status) {
    case 'completed':
      return 'good'
    case 'disputed':
      return 'bad'
    case 'refunded':
    case 'cancelled':
      return 'neutral'
    case 'paymentHeld':
    case 'checkedIn':
      return 'info'
    default:
      return 'warn'
  }
}

/** "paymentHeld" → "Payment held" */
export function humanize(value: string): string {
  const spaced = value.replace(/([A-Z])/g, ' $1').trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}

export const cedis = (amount: number) => `GH₵${amount.toLocaleString()}`

/**
 * The student-facing price for an owner's asking price — the API adds MeDan's
 * 5% on top at listing time (Pricing.WithMarkup). Prices the API returns
 * already include it; this is only for previewing while typing a new price.
 */
export const withMarkup = (asking: number) => Math.round(asking * 1.05)

export const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export const dateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
