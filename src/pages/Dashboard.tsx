import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import type { AdminBooking, BookingStatus } from '../lib/types'
import { Card, ErrorBox, Spinner, cedis, humanize, shortDate } from '../components/ui'
import { EscrowBadge, hoursUntilRelease } from '../components/EscrowFlow'

/** Matches the API's default `take` on /api/admin/bookings. */
const BOOKINGS_CAP = 200

/** Statuses in lifecycle order, with the colour each gets in the pipeline bar. */
const PIPELINE: { status: BookingStatus; tone: string }[] = [
  { status: 'pending', tone: 'warn' },
  { status: 'paymentHeld', tone: 'info' },
  { status: 'checkedIn', tone: 'accent' },
  { status: 'completed', tone: 'good' },
  { status: 'disputed', tone: 'bad' },
  { status: 'refunded', tone: 'muted' },
  { status: 'cancelled', tone: 'muted' },
]

export function Dashboard() {
  const stats = useAsync(() => api.stats())
  const bookings = useAsync(() => api.bookings())

  const loading = stats.loading || bookings.loading
  const error = stats.error ?? bookings.error

  const reload = () => {
    stats.reload()
    bookings.reload()
  }

  return (
    <>
      <header className="page__head">
        <h1>Overview</h1>
        <button type="button" className="btn btn--ghost btn--sm" onClick={reload}>
          Refresh
        </button>
        <p className="page__sub">Where money is sitting and what needs a decision.</p>
      </header>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {stats.data && (
        <>
          <Attention
            disputes={stats.data.openDisputes}
            unverified={stats.data.unverifiedHostels}
            referralPayouts={stats.data.referralsAwaitingPayout}
            releasingSoon={countReleasingSoon(bookings.data)}
            awaitingCheckIn={stats.data.awaitingCheckIn}
            stuckPayouts={stats.data.stuckPayouts}
          />

          <div className="grid grid--wide">
            <Escrow held={stats.data.escrowHeld} bookings={bookings.data} />
            <Pipeline bookings={bookings.data} total={stats.data.bookings} />
          </div>

          <EventsCard upcoming={stats.data.upcomingEvents} />

          <RecentBookings bookings={bookings.data} />

          <div className="grid grid--2">
            <Card title="Listings">
              <dl className="deflist">
                <Row label="Hostels" value={stats.data.hostels} />
                <Row label="Awaiting verification" value={stats.data.unverifiedHostels} />
                <Row label="Companies" value={stats.data.companies} />
              </dl>
              <Link className="btn btn--ghost btn--sm" to="/hostels">
                Manage hostels
              </Link>
            </Card>

            <Card title="People">
              <dl className="deflist">
                <Row label="Total users" value={stats.data.users} />
                <Row label="Students" value={stats.data.students} />
                <Row label="Staff &amp; owners" value={stats.data.staff} />
              </dl>
              <Link className="btn btn--ghost btn--sm" to="/employees">
                Manage employees
              </Link>
            </Card>
          </div>
        </>
      )}
    </>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/**
 * Only surfaces things a human has to act on, and only when the count is
 * non-zero — a wall of green zeroes trains people to stop reading.
 */
function Attention({
  disputes,
  unverified,
  referralPayouts,
  releasingSoon,
  awaitingCheckIn,
  stuckPayouts,
}: {
  disputes: number
  unverified: number
  referralPayouts: number
  releasingSoon: number | null
  awaitingCheckIn: number
  stuckPayouts: number
}) {
  const items = [
    {
      key: 'stuck',
      count: stuckPayouts,
      label: stuckPayouts === 1 ? 'Payout stuck' : 'Payouts stuck',
      hint: 'Released escrow that never reached the owner — usually a missing settlement account.',
      to: '/bookings?status=completed',
      tone: 'bad',
    },
    {
      key: 'arrivals',
      count: awaitingCheckIn,
      label: 'Students not yet checked in',
      hint: 'Paid and waiting — owners record the move-in.',
      to: '/bookings?status=paymentHeld',
      tone: 'info',
    },
    {
      key: 'disputes',
      count: disputes,
      label: disputes === 1 ? 'Open dispute' : 'Open disputes',
      hint: 'Escrow is frozen until staff decide.',
      to: '/disputes',
      tone: 'bad',
    },
    {
      key: 'unverified',
      count: unverified,
      label: 'Hostels awaiting verification',
      hint: 'Unverified listings rank last in the app.',
      to: '/hostels',
      tone: 'warn',
    },
    {
      key: 'referrals',
      count: referralPayouts,
      label: 'Referral payouts due',
      hint: 'Students who earned a reward.',
      to: '/referrals',
      tone: 'info',
    },
    {
      key: 'releasing',
      count: releasingSoon ?? 0,
      label: 'Releasing within 24h',
      hint: 'Auto-transfers to owners unless disputed.',
      to: '/bookings?status=checkedIn',
      tone: 'accent',
    },
  ].filter((i) => i.count > 0)

  if (items.length === 0) {
    return (
      <div className="allclear">
        <span className="allclear__tick" aria-hidden="true">
          ✓
        </span>
        <div>
          <strong>All clear</strong>
          <p>No disputes, no listings waiting on verification, no payouts due.</p>
        </div>
      </div>
    )
  }

  return (
    <section className="attention">
      <h2 className="section__title">Needs attention</h2>
      <div className="attention__row">
        {items.map((i) => (
          <Link key={i.key} to={i.to} className={`alert alert--${i.tone}`}>
            <span className="alert__count">{i.count}</span>
            <span className="alert__label">{i.label}</span>
            <span className="alert__hint">{i.hint}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

/** Bookings that the sweeper will auto-release inside a day. */
function countReleasingSoon(bookings: AdminBooking[] | null): number | null {
  if (!bookings) return null
  return bookings.filter((b) => {
    const left = hoursUntilRelease(b)
    return left !== null && left <= 24
  }).length
}

/**
 * The escrow balance, split into what is owed onward versus what MeDan keeps.
 * The headline comes from the API; the split is derived from the loaded
 * bookings, so it says so when that list was capped.
 */
function Escrow({ held, bookings }: { held: number; bookings: AdminBooking[] | null }) {
  const inEscrow = (bookings ?? []).filter(
    (b) => b.status === 'paymentHeld' || b.status === 'checkedIn',
  )
  const owed = inEscrow.reduce((sum, b) => sum + Math.max(0, b.amount - b.commission), 0)
  const commission = inEscrow.reduce((sum, b) => sum + b.commission, 0)
  const total = owed + commission
  const capped = (bookings?.length ?? 0) >= BOOKINGS_CAP

  return (
    <Card title="Held in escrow">
      <p className="bignum">{cedis(held)}</p>
      <p className="bignum__sub">
        {inEscrow.length === 0
          ? 'No bookings currently holding funds.'
          : `Across ${inEscrow.length} booking${inEscrow.length === 1 ? '' : 's'} — paid, not yet released.`}
      </p>

      {total > 0 && (
        <>
          <div className="split" role="img" aria-label="Owner share versus commission">
            <span className="split__seg split__seg--owed" style={{ flexGrow: owed }} />
            <span className="split__seg split__seg--fee" style={{ flexGrow: commission }} />
          </div>
          <dl className="deflist deflist--tight">
            <Row label="◆ Owed to owners" value={cedis(owed)} />
            <Row label="◆ MeDan commission" value={cedis(commission)} />
          </dl>
          {capped && (
            <p className="note">
              Split derived from the {BOOKINGS_CAP} most recent bookings; the headline is the
              full balance.
            </p>
          )}
        </>
      )}
    </Card>
  )
}

/** Where every booking currently sits, as one bar plus a clickable legend. */
function Pipeline({ bookings, total }: { bookings: AdminBooking[] | null; total: number }) {
  const list = bookings ?? []
  const counts = PIPELINE.map((p) => ({
    ...p,
    count: list.filter((b) => b.status === p.status).length,
  })).filter((p) => p.count > 0)

  const shown = counts.reduce((sum, c) => sum + c.count, 0)

  return (
    <Card
      title="Booking pipeline"
      action={
        <Link className="btn btn--ghost btn--sm" to="/bookings">
          All bookings
        </Link>
      }
    >
      {shown === 0 ? (
        <p className="bignum__sub">No bookings yet.</p>
      ) : (
        <>
          <div className="split split--tall" role="img" aria-label="Bookings by status">
            {counts.map((c) => (
              <span
                key={c.status}
                className={`split__seg split__seg--${c.tone}`}
                style={{ flexGrow: c.count }}
                title={`${humanize(c.status)}: ${c.count}`}
              />
            ))}
          </div>
          <ul className="legend">
            {counts.map((c) => (
              <li key={c.status}>
                <Link to={`/bookings?status=${c.status}`}>
                  <span className={`legend__dot legend__dot--${c.tone}`} aria-hidden="true" />
                  <span className="legend__label">{humanize(c.status)}</span>
                  <span className="legend__count">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="note">
            {shown} of {total} total shown{shown < total ? ' (most recent)' : ''}.
          </p>
        </>
      )}
    </Card>
  )
}

function RecentBookings({ bookings }: { bookings: AdminBooking[] | null }) {
  const recent = (bookings ?? []).slice(0, 6)
  if (recent.length === 0) return null

  return (
    <Card
      title="Latest bookings"
      action={
        <Link className="btn btn--ghost btn--sm" to="/bookings">
          View all
        </Link>
      }
    >
      <div className="tablewrap">
        <table className="table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Hostel</th>
              <th className="num">Amount</th>
              <th>Escrow</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((b) => (
              <tr key={b.id}>
                <td>
                  <span className="cell__main">{b.studentName}</span>
                  <span className="cell__sub">{b.studentEmail}</span>
                </td>
                <td>
                  <span className="cell__main">{b.hostelName}</span>
                  <span className="cell__sub">{b.companyName}</span>
                </td>
                <td className="num">{cedis(b.amount)}</td>
                <td>
                  <EscrowBadge status={b.status} />
                </td>
                <td>{shortDate(b.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}


/** What students see on their Events tab right now. */
function EventsCard({ upcoming }: { upcoming: number }) {
  return (
    <Card
      title="Events"
      action={
        <Link className="btn btn--ghost btn--sm" to="/events">
          Manage events
        </Link>
      }
    >
      {upcoming === 0 ? (
        <p className="bignum__sub">
          Nothing scheduled — students see an empty Events tab. Post something
          to keep the tab alive.
        </p>
      ) : (
        <p className="bignum__sub">
          {upcoming} upcoming event{upcoming === 1 ? '' : 's'} showing in the
          app.
        </p>
      )}
    </Card>
  )
}
