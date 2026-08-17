import { useState } from 'react'

import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import type { AdminBooking } from '../lib/types'
import { Badge, Card, Empty, ErrorBox, Spinner, cedis, dateTime } from '../components/ui'
import { EscrowFlow } from '../components/EscrowFlow'

/**
 * Customer service queue. Lists every booking sitting in `disputed` and lets
 * staff close it out — refund the student (bed returns to the market) or
 * release escrow to the owner.
 */
export function Disputes() {
  const { data, loading, error, reload } = useAsync(() => api.bookings({ status: 'disputed' }))
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <>
      <header className="page__head">
        <h1>Customer service</h1>
        <p className="page__sub">Bookings awaiting a decision from staff.</p>
      </header>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && data.length === 0 && (
        <Empty title="No open disputes" hint="Disputes raised by students appear here." />
      )}

      {data?.map((b) => (
        <DisputeCard
          key={b.id}
          booking={b}
          expanded={openId === b.id}
          onToggle={() => setOpenId(openId === b.id ? null : b.id)}
          onResolved={reload}
        />
      ))}
    </>
  )
}

function DisputeCard({
  booking,
  expanded,
  onToggle,
  onResolved,
}: {
  booking: AdminBooking
  expanded: boolean
  onToggle: () => void
  onResolved: () => void
}) {
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<'refund' | 'release' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function resolve(outcome: 'refund' | 'release') {
    setBusy(outcome)
    setError(null)
    try {
      await api.resolveDispute(booking.id, outcome, note.trim())
      onResolved()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card>
      <div className="dispute__head">
        <div>
          <h3 className="dispute__title">{booking.hostelName}</h3>
          <p className="dispute__meta">
            {booking.roomLabel} · {booking.bedLabel} · {booking.academicYear}
          </p>
        </div>
        <div className="dispute__amount">
          <Badge tone="bad">Disputed</Badge>
          <span>{cedis(booking.amount)}</span>
        </div>
      </div>

      <dl className="deflist deflist--tight">
        <div>
          <dt>Student</dt>
          <dd>
            {booking.studentName} · {booking.studentEmail}
            {booking.studentPhone ? ` · ${booking.studentPhone}` : ''}
          </dd>
        </div>
        <div>
          <dt>Company</dt>
          <dd>{booking.companyName || '—'}</dd>
        </div>
        <div>
          <dt>Raised</dt>
          <dd>{dateTime(booking.disputedAt)}</dd>
        </div>
        <div>
          <dt>Payment ref</dt>
          <dd>{booking.paystackReference ?? '—'}</dd>
        </div>
      </dl>

      <blockquote className="quote">{booking.disputeReason || 'No reason given.'}</blockquote>

      <EscrowFlow booking={booking} />

      {!expanded ? (
        <button type="button" className="btn btn--primary btn--sm" onClick={onToggle}>
          Resolve…
        </button>
      ) : (
        <div className="resolve">
          {error && <ErrorBox message={error} />}
          <p className="resolve__warn">
            Both buttons move the money for real: the API calls Paystack via PayoutService —
            a refund back to the student, or a transfer of{' '}
            {cedis(Math.max(0, booking.amount - booking.commission))} to the owner. Do not also
            pay out by hand. If the transfer fails it retries hourly for up to 8 attempts.
          </p>
          <textarea
            className="resolve__note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Resolution note — what you decided and any payout reference."
          />
          <div className="resolve__actions">
            <button
              type="button"
              className="btn btn--danger btn--sm"
              disabled={busy !== null}
              onClick={() => void resolve('refund')}
            >
              {busy === 'refund' ? 'Refunding…' : 'Refund student'}
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={busy !== null}
              onClick={() => void resolve('release')}
            >
              {busy === 'release' ? 'Releasing…' : 'Release to owner'}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onToggle}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
