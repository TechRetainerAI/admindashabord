import { Fragment, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import type { BookingStatus } from '../lib/types'
import {
  Badge,
  Card,
  Empty,
  ErrorBox,
  Spinner,
  cedis,
  humanize,
  shortDate,
  statusTone,
} from '../components/ui'
import { EscrowBadge, EscrowFlow } from '../components/EscrowFlow'

const STATUSES: (BookingStatus | '')[] = [
  '',
  'pending',
  'paymentHeld',
  'checkedIn',
  'completed',
  'disputed',
  'refunded',
  'cancelled',
]

export function Bookings() {
  // `?status=` lets the dashboard pipeline deep-link into a filtered view.
  const [params, setParams] = useSearchParams()
  const status = (params.get('status') ?? '') as BookingStatus | ''
  const setStatus = (next: BookingStatus | '') => {
    setParams(next ? { status: next } : {}, { replace: true })
  }

  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')

  /** Which row has its escrow flow expanded. One at a time keeps it readable. */
  const [openId, setOpenId] = useState<string | null>(null)

  const { data, loading, error, reload } = useAsync(
    () => api.bookings({ status: status || undefined, q: query || undefined }),
    [status, query],
  )

  return (
    <>
      <header className="page__head">
        <h1>Bookings</h1>
        <p className="page__sub">Every booking on the platform, newest first.</p>
      </header>

      <Card>
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault()
            setQuery(search.trim())
          }}
        >
          <select value={status} onChange={(e) => setStatus(e.target.value as BookingStatus | '')}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === '' ? 'All statuses' : humanize(s)}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Student name, email, or hostel"
          />
          <button type="submit" className="btn btn--ghost btn--sm">
            Search
          </button>
        </form>
      </Card>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}

      {data && data.length === 0 && <Empty title="No bookings match those filters." />}

      {data && data.length > 0 && (
        <Card>
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Hostel</th>
                  <th>Room</th>
                  <th>Year</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                  <th>Escrow</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((b) => (
                  <Fragment key={b.id}>
                    <tr>
                      <td>
                        <span className="cell__main">{b.studentName}</span>
                        <span className="cell__sub">{b.studentEmail}</span>
                      </td>
                      <td>
                        <span className="cell__main">{b.hostelName}</span>
                        <span className="cell__sub">{b.companyName}</span>
                      </td>
                      <td>
                        {b.roomLabel}
                        <span className="cell__sub">{b.bedLabel}</span>
                      </td>
                      <td>{b.academicYear}</td>
                      <td className="num">{cedis(b.amount)}</td>
                      <td>
                        <Badge tone={statusTone(b.status)}>{humanize(b.status)}</Badge>
                      </td>
                      <td>
                        <EscrowBadge status={b.status} />
                      </td>
                      <td>{shortDate(b.createdAt)}</td>
                      <td className="num">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          aria-expanded={openId === b.id}
                          onClick={() => setOpenId(openId === b.id ? null : b.id)}
                        >
                          {openId === b.id ? 'Hide flow' : 'Escrow flow'}
                        </button>
                      </td>
                    </tr>
                    {openId === b.id && (
                      <tr className="row--detail">
                        <td colSpan={9}>
                          <EscrowFlow booking={b} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}
