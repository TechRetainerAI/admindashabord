import { useState } from 'react'
import { Link } from 'react-router-dom'

import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { useAuth } from '../auth/AuthProvider'
import { photoSrc } from '../lib/catalog'
import { Badge, Card, Empty, ErrorBox, Spinner, cedis, humanize } from '../components/ui'


export function Hostels() {
  const { isStaff } = useAuth()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const { data, loading, error, reload, setData } = useAsync(
    () => api.hostels({ q: query || undefined }),
    [query],
  )
  const [busyId, setBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function toggleVerified(id: string, next: boolean) {
    setBusyId(id)
    setActionError(null)
    try {
      await api.setVerified(id, next)
      setData((list) => list.map((h) => (h.id === id ? { ...h, isVerified: next } : h)))
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <header className="page__head">
        <h1>Hostels</h1>
        <Link className="btn btn--primary btn--sm" to="/hostels/new">
          Add hostel
        </Link>
      </header>

      <Card>
        <form
          className="filters"
          onSubmit={(e) => {
            e.preventDefault()
            setQuery(search.trim())
          }}
        >
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name"
          />
          <button type="submit" className="btn btn--ghost btn--sm">
            Search
          </button>
        </form>
      </Card>

      {loading && <Spinner />}
      {error && <ErrorBox message={error} onRetry={reload} />}
      {actionError && <ErrorBox message={actionError} />}

      {data && data.length === 0 && (
        <Empty title="No hostels yet" hint="Use “Add hostel” to create the first listing." />
      )}

      <div className="grid grid--3">
        {data?.map((h) => (
          <article key={h.id} className="hostel">
            <div className="hostel__photo">
              {h.photos[0] ? (
                <img src={photoSrc(h.photos[0])} alt="" loading="lazy" />
              ) : (
                <span className="hostel__nophoto">No photo</span>
              )}
            </div>
            <div className="hostel__body">
              <h3 className="hostel__name">
                <Link to={`/hostels/${h.id}`}>{h.name}</Link>
              </h3>
              <p className="hostel__meta">
                {h.campus} · {humanize(h.propertyType)}
              </p>
              <p className="hostel__meta">{h.address}</p>
              <p className="hostel__price">
                {cedis(h.minPrice)} – {cedis(h.maxPrice)}
              </p>
              <div className="hostel__foot">
                <Badge tone={h.isVerified ? 'good' : 'warn'}>
                  {h.isVerified ? 'Verified' : 'Unverified'}
                </Badge>
                <div className="hostel__actions">
                  {isStaff && (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      disabled={busyId === h.id}
                      onClick={() => void toggleVerified(h.id, !h.isVerified)}
                    >
                      {busyId === h.id ? '…' : h.isVerified ? 'Unverify' : 'Verify'}
                    </button>
                  )}
                  <Link className="btn btn--ghost btn--sm" to={`/hostels/${h.id}`}>
                    Manage
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  )
}
