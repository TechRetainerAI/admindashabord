import { useState } from 'react'

import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import type { ReferralStatus } from '../lib/types'
import { Badge, Card, Empty, ErrorBox, Spinner, cedis, humanize, shortDate } from '../components/ui'

const STATUSES: (ReferralStatus | '')[] = ['', 'pending', 'claimed', 'paid']

const tone = (s: ReferralStatus) => (s === 'paid' ? 'good' : s === 'claimed' ? 'warn' : 'neutral')

/**
 * Referral payouts. "Claimed" means the reward was earned and is waiting for
 * staff to pay it out — marking it paid is state only, so make the transfer
 * first.
 */
export function Referrals() {
  const [status, setStatus] = useState<ReferralStatus | ''>('claimed')
  const { data, loading, error, reload, setData } = useAsync(
    () => api.referrals({ status: status || undefined }),
    [status],
  )
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function markPaid(id: string) {
    setBusyId(id)
    setActionError(null)
    try {
      const updated = await api.markReferralPaid(id)
      setData((list) => list.map((r) => (r.id === id ? updated : r)))
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <header className="page__head">
        <h1>Referrals</h1>
        <p className="page__sub">Rewards earned by students who invited a friend.</p>
      </header>

      <Card>
        <div className="filters">
          <select value={status} onChange={(e) => setStatus(e.target.value as ReferralStatus | '')}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === '' ? 'All statuses' : humanize(s)}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {actionError && <ErrorBox message={actionError} />}

      {data && data.length === 0 && <Empty title="Nothing here right now." />}

      {data && data.length > 0 && (
        <Card>
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Referrer</th>
                  <th>Friend</th>
                  <th>Code</th>
                  <th className="num">Reward</th>
                  <th>Status</th>
                  <th>Claimed</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id}>
                    <td>{r.referrerName}</td>
                    <td>{r.refereeName ?? '—'}</td>
                    <td>
                      <code>{r.code}</code>
                    </td>
                    <td className="num">{cedis(r.rewardAmount)}</td>
                    <td>
                      <Badge tone={tone(r.status)}>{humanize(r.status)}</Badge>
                    </td>
                    <td>{shortDate(r.claimedAt)}</td>
                    <td>
                      {r.status === 'claimed' && (
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          disabled={busyId === r.id}
                          onClick={() => void markPaid(r.id)}
                        >
                          {busyId === r.id ? 'Saving…' : 'Mark paid'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}
