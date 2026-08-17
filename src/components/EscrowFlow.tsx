import type { AdminBooking, BookingStatus } from '../lib/types'
import { Badge, cedis, dateTime } from './ui'

/** Mirrors EscrowReleaseService.DisputeWindow on the API. */
export const DISPUTE_WINDOW_HOURS = 48

type StepState = 'done' | 'current' | 'todo' | 'failed'

interface Step {
  key: string
  label: string
  detail: string
  at: string | null
  state: StepState
}

/**
 * Where a booking's money is, and what has to happen before the owner sees it.
 *
 * The API never pays an owner directly at checkout: the charge settles to
 * MeDan, the booking sits in `paymentHeld`, and only after the student checks
 * in and the dispute window closes does EscrowReleaseService transfer
 * `amount - commission` onward.
 */
export function buildSteps(b: AdminBooking): Step[] {
  const dead = b.status === 'cancelled' || b.status === 'refunded'
  const disputed = b.status === 'disputed'

  const reached = (...statuses: BookingStatus[]) => statuses.includes(b.status)

  const paid = b.paidAt !== null
  const checkedIn = b.checkedInAt !== null
  const completed = b.completedAt !== null

  const steps: Step[] = [
    {
      key: 'booked',
      label: 'Booked',
      detail: 'Student reserved the bed. Commission fixed at this point.',
      at: b.createdAt,
      state: 'done',
    },
    {
      key: 'held',
      label: 'Paid — held in escrow',
      detail: paid
        ? `${cedis(b.amount)} held by MeDan. The owner cannot touch it yet.`
        : 'Waiting for Paystack to confirm the charge settled.',
      at: b.paidAt,
      state: paid ? 'done' : reached('pending') ? 'current' : 'todo',
    },
    {
      key: 'checkedIn',
      label: 'Checked in',
      detail: checkedIn
        ? `Owner accepted the check-in code. ${DISPUTE_WINDOW_HOURS}h dispute window started.`
        : 'Student must arrive and present the check-in code.',
      at: b.checkedInAt,
      state: checkedIn ? 'done' : paid && !dead ? 'current' : 'todo',
    },
    {
      key: 'released',
      label: 'Released to owner',
      detail: completed
        ? `${cedis(Math.max(0, b.amount - b.commission))} transferred; MeDan kept ${cedis(b.commission)}.`
        : `Automatic once the ${DISPUTE_WINDOW_HOURS}h window closes with no dispute.`,
      at: b.completedAt,
      state: completed ? 'done' : checkedIn && !disputed && !dead ? 'current' : 'todo',
    },
  ]

  if (disputed) {
    steps.splice(3, 0, {
      key: 'disputed',
      label: 'Disputed — release frozen',
      detail: b.disputeReason ?? 'Student raised a dispute. Staff must resolve it.',
      at: b.disputedAt,
      state: 'failed',
    })
  }

  if (b.status === 'refunded') {
    steps.push({
      key: 'refunded',
      label: 'Refunded to student',
      detail: b.disputeResolution ?? 'Escrow returned to the student.',
      at: b.resolvedAt,
      state: 'done',
    })
  }

  if (b.status === 'cancelled') {
    steps.push({
      key: 'cancelled',
      label: 'Cancelled',
      detail: 'Booking cancelled — nothing releases to the owner.',
      at: b.resolvedAt,
      state: 'failed',
    })
  }

  return steps
}

/** Hours left before the sweeper auto-releases, or null when not applicable. */
export function hoursUntilRelease(b: AdminBooking): number | null {
  if (b.status !== 'checkedIn' || !b.checkedInAt) return null
  const releaseAt = new Date(b.checkedInAt).getTime() + DISPUTE_WINDOW_HOURS * 3600_000
  return (releaseAt - Date.now()) / 3600_000
}

export function EscrowFlow({ booking }: { booking: AdminBooking }) {
  const steps = buildSteps(booking)
  const left = hoursUntilRelease(booking)
  const net = Math.max(0, booking.amount - booking.commission)

  return (
    <div className="escrow">
      <div className="escrow__money">
        <div className="escrow__figure">
          <span className="escrow__figure-label">Student paid</span>
          <strong>{cedis(booking.amount)}</strong>
        </div>
        <div className="escrow__figure">
          <span className="escrow__figure-label">Owner receives</span>
          <strong>{cedis(net)}</strong>
        </div>
        <div className="escrow__figure">
          <span className="escrow__figure-label">MeDan commission</span>
          <strong>{cedis(booking.commission)}</strong>
        </div>
        <div className="escrow__figure">
          <span className="escrow__figure-label">Paystack reference</span>
          <strong className="escrow__ref">{booking.paystackReference ?? '—'}</strong>
        </div>
      </div>

      {left !== null && (
        <p className={`escrow__countdown${left <= 0 ? ' escrow__countdown--due' : ''}`}>
          {left <= 0
            ? 'Dispute window closed — the next sweep (every 15 min) will release this.'
            : `Auto-releases in ${left < 1 ? `${Math.round(left * 60)} minutes` : `${Math.round(left)} hours`}.`}
        </p>
      )}

      <ol className="escrow__steps">
        {steps.map((s) => (
          <li key={s.key} className={`escrow__step escrow__step--${s.state}`}>
            <span className="escrow__dot" aria-hidden="true" />
            <div className="escrow__body">
              <div className="escrow__head">
                <span className="escrow__label">{s.label}</span>
                <span className="escrow__at">{dateTime(s.at)}</span>
              </div>
              <p className="escrow__detail">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** Compact one-liner for table rows: where the money sits right now. */
export function EscrowBadge({ status }: { status: BookingStatus }) {
  switch (status) {
    case 'pending':
      return <Badge tone="warn">Not funded</Badge>
    case 'paymentHeld':
    case 'checkedIn':
      return <Badge tone="info">Held by MeDan</Badge>
    case 'completed':
      return <Badge tone="good">Released to owner</Badge>
    case 'disputed':
      return <Badge tone="bad">Frozen — disputed</Badge>
    case 'refunded':
      return <Badge tone="neutral">Returned to student</Badge>
    default:
      return <Badge tone="neutral">No funds</Badge>
  }
}
