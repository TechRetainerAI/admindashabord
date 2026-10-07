import { useEffect, useState } from 'react'

import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import type { ManualPaymentReview, ManualPaymentStatus } from '../lib/types'
import { Badge, Card, Empty, ErrorBox, Spinner, cedis, dateTime, humanize } from '../components/ui'

const STATUSES: ManualPaymentStatus[] = ['pendingReview', 'success', 'rejected']

const tone = (s: ManualPaymentStatus) =>
  s === 'success' ? 'good' : s === 'rejected' ? 'bad' : 'warn'

/**
 * Review queue for manual MoMo transfers. Students who paid the platform wallet
 * by hand upload a receipt screenshot; nothing confirms the money arrived but
 * the person looking at this page, so check the wallet statement before
 * approving. Approval moves the booking into escrow exactly like a Paystack
 * success; rejection shows the student the reason and lets them resubmit.
 */
export function Payments() {
  const [status, setStatus] = useState<ManualPaymentStatus>('pendingReview')
  const { data, loading, error, reload, setData } = useAsync(
    () => api.manualPayments({ status }),
    [status],
  )

  // An approve/reject changes the row's status, which moves it to another tab.
  const settled = (updated: ManualPaymentReview) =>
    setData((list) => list.filter((p) => p.reference !== updated.reference))

  return (
    <>
      <header className="page__head">
        <h1>Manual payments</h1>
        <p className="page__sub">
          MoMo transfers students made to the platform wallet themselves, with their receipt.
        </p>
      </header>

      <Card>
        <div className="filters">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ManualPaymentStatus)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === 'pendingReview' ? 'Awaiting review' : humanize(s)}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && data.length === 0 && (
        <Empty
          title={status === 'pendingReview' ? 'Nothing waiting on you.' : 'Nothing here.'}
          hint={
            status === 'pendingReview'
              ? 'New submissions from the app appear here, oldest first.'
              : undefined
          }
        />
      )}

      {data?.map((p) => (
        <PaymentCard key={p.reference} payment={p} onSettled={settled} />
      ))}
    </>
  )
}

function PaymentCard({
  payment: p,
  onSettled,
}: {
  payment: ManualPaymentReview
  onSettled: (updated: ManualPaymentReview) => void
}) {
  const pending = p.status === 'pendingReview'
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function approve() {
    setBusy('approve')
    setError(null)
    try {
      onSettled(await api.approveManualPayment(p.reference))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  async function reject() {
    setBusy('reject')
    setError(null)
    try {
      onSettled(await api.rejectManualPayment(p.reference, reason.trim()))
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
          <h3 className="dispute__title">{p.hostelName || 'Unknown hostel'}</h3>
          <p className="dispute__meta">
            <code>{p.reference}</code> · submitted {dateTime(p.submittedAt)}
          </p>
        </div>
        <div className="dispute__amount">
          <Badge tone={tone(p.status)}>
            {p.status === 'pendingReview' ? 'Awaiting review' : humanize(p.status)}
          </Badge>
          <span>{cedis(p.amount)}</span>
        </div>
      </div>

      {p.duplicateOf.length > 0 && (
        <ErrorBox
          message={`Transaction ID ${p.providerTransactionId} also appears on ${p.duplicateOf.join(
            ', ',
          )} — a receipt can only buy one bed.`}
        />
      )}

      <div className="proofrow">
        <dl className="deflist deflist--tight proofrow__facts">
          <div>
            <dt>Student</dt>
            <dd>
              {p.studentName} · {p.studentEmail}
            </dd>
          </div>
          <div>
            <dt>Sent from</dt>
            <dd>
              {p.senderName ?? '—'}
              {p.senderPhone ? ` · ${p.senderPhone}` : ''}
            </dd>
          </div>
          <div>
            <dt>Transaction ID</dt>
            <dd>{p.providerTransactionId ? <code>{p.providerTransactionId}</code> : '—'}</dd>
          </div>
          {p.reviewedAt && (
            <div>
              <dt>Reviewed</dt>
              <dd>{dateTime(p.reviewedAt)}</dd>
            </div>
          )}
        </dl>

        <Proof proofUrl={p.proofUrl} />
      </div>

      {p.reviewNote && <blockquote className="quote">{p.reviewNote}</blockquote>}

      {error && <ErrorBox message={error} />}

      {pending && !rejecting && (
        <div className="resolve__actions">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={busy !== null}
            onClick={() => void approve()}
          >
            {busy === 'approve' ? 'Approving…' : 'Approve — money arrived'}
          </button>
          <button
            type="button"
            className="btn btn--danger btn--sm"
            disabled={busy !== null}
            onClick={() => setRejecting(true)}
          >
            Reject…
          </button>
        </div>
      )}

      {pending && rejecting && (
        <div className="resolve">
          <p className="resolve__warn">
            The student sees this reason in the app and can submit a corrected proof — their bed
            stays held. Approve only after the transfer shows on the wallet statement.
          </p>
          <textarea
            className="resolve__note"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why it was rejected — e.g. no matching transfer on the wallet statement."
          />
          <div className="resolve__actions">
            <button
              type="button"
              className="btn btn--danger btn--sm"
              disabled={busy !== null || !reason.trim()}
              onClick={() => void reject()}
            >
              {busy === 'reject' ? 'Rejecting…' : 'Reject payment'}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setRejecting(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}

/**
 * The receipt screenshot. The API serves it from an authorized endpoint (a MoMo
 * receipt shows the student's number and balance), so it is fetched with the
 * bearer token into an object URL rather than pointed at by src.
 */
function Proof({ proofUrl }: { proofUrl: string | null }) {
  const [src, setSrc] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!proofUrl) return
    let url: string | null = null
    let cancelled = false

    api
      .proofObjectUrl(proofUrl)
      .then((u) => {
        if (cancelled) URL.revokeObjectURL(u)
        else setSrc((url = u))
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      })

    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [proofUrl])

  if (!proofUrl) return <div className="proof proof--none">No screenshot</div>

  if (error) return <div className="proof proof--none">{error}</div>

  if (!src) return <div className="proof proof--none">Loading proof…</div>

  return (
    <>
      <button type="button" className="proof" onClick={() => setOpen(true)} title="View full size">
        <img src={src} alt="Payment receipt screenshot" />
      </button>
      {open && (
        <div className="lightbox" role="dialog" aria-label="Payment receipt" onClick={() => setOpen(false)}>
          <img src={src} alt="Payment receipt screenshot" />
        </div>
      )}
    </>
  )
}
