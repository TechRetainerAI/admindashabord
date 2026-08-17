import { useState } from 'react'

import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import type {
  AdminUser,
  NotificationAudience,
  SendNotificationResponse,
  UserRole,
} from '../lib/types'
import { Card, ErrorBox, Field, Spinner } from '../components/ui'

const MAX_TITLE = 80
const MAX_BODY = 500

const ROLES: UserRole[] = ['student', 'owner', 'worker', 'manager', 'admin']

/** Somewhere sensible to send people; free text invites typos into a push. */
const ROUTES = [
  { value: '', label: 'Open the app (no specific screen)' },
  { value: '/home', label: 'Home' },
  { value: '/bookings', label: 'My bookings' },
  { value: '/refer', label: 'Refer & Earn' },
  { value: '/favorites', label: 'Saved hostels' },
  { value: '/events', label: 'Events' },
]

export function Notifications() {
  const reach = useAsync(() => api.notificationReach())

  const [audience, setAudience] = useState<NotificationAudience>('everyone')
  const [role, setRole] = useState<UserRole>('student')
  const [userQuery, setUserQuery] = useState('')
  const [userId, setUserId] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [route, setRoute] = useState('')
  const [image, setImage] = useState<File | null>(null)

  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<SendNotificationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  // Only searched on demand — the staff list is not worth loading up front.
  const [matches, setMatches] = useState<AdminUser[] | null>(null)
  const [searching, setSearching] = useState(false)

  async function searchUsers() {
    if (!userQuery.trim()) return
    setSearching(true)
    setError(null)
    try {
      setMatches(await api.users({ q: userQuery.trim() }))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSearching(false)
    }
  }

  const ready =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    title.length <= MAX_TITLE &&
    body.length <= MAX_BODY &&
    (audience !== 'user' || userId !== '')

  // A broadcast cannot be recalled, so anything wider than one person asks twice.
  const needsConfirm = audience !== 'user'

  async function send() {
    setSending(true)
    setError(null)
    setResult(null)
    try {
      // Poster first: a bad file fails here, before anyone is notified.
      let imageUrl: string | undefined
      if (image) imageUrl = (await api.uploadNotificationImage(image)).url

      const res = await api.sendNotification({
        audience,
        title: title.trim(),
        body: body.trim(),
        route: route || undefined,
        imageUrl,
        userId: audience === 'user' ? userId : undefined,
        role: audience === 'role' ? role : undefined,
      })
      setResult(res)
      setTitle('')
      setBody('')
      setImage(null)
      setConfirming(false)
      reach.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  const selected = matches?.find((u) => u.id === userId)

  return (
    <>
      <header className="page__head">
        <h1>Send a notification</h1>
        <p className="page__sub">
          Lands in every recipient&rsquo;s in-app feed instantly — MeDan&rsquo;s own
          channel, no third party. Lock-screen push rides along when Firebase is
          configured. There is no way to un-send one.
        </p>
      </header>

      {reach.loading && <Spinner />}
      {reach.error && <ErrorBox message={reach.error} onRetry={reach.reload} />}

      {reach.data && (
        <>
          {!reach.data.pushConfigured && (
            <div className="alert alert--info alert--flat">
              <span className="alert__label">Delivering via the in-app feed only</span>
              <span className="alert__hint">
                Notifications reach everyone the next time they open MeDan — the feed
                is served by your own API. Lock-screen banners while the app is closed
                need Firebase: set <code>Push:ServiceAccountPath</code> to add those.
              </span>
            </div>
          )}

          <div className="stats">
            <div className="stat">
              <span className="stat__value">{reach.data.totalUsers}</span>
              <span className="stat__label">Users — all get the feed</span>
            </div>
            <div className="stat">
              <span className="stat__value">{reach.data.reachableUsers}</span>
              <span className="stat__label">Also reachable by push</span>
            </div>
            <div className="stat">
              <span className="stat__value">{reach.data.androidDevices}</span>
              <span className="stat__label">Android devices</span>
            </div>
            <div className="stat">
              <span className="stat__value">{reach.data.iosDevices}</span>
              <span className="stat__label">iPhone devices</span>
            </div>
          </div>
        </>
      )}

      <div className="grid grid--wide">
        <Card title="Message">
          {error && <ErrorBox message={error} />}
          {result && (
            <div className={`sendresult${result.recipients > 0 ? '' : ' sendresult--warn'}`}>
              {result.message}
              {result.recipients > 0 && ` (${result.recipients} recipient${result.recipients === 1 ? '' : 's'})`}
            </div>
          )}

          <Field label="Audience">
            <select
              value={audience}
              onChange={(e) => {
                setAudience(e.target.value as NotificationAudience)
                setConfirming(false)
              }}
            >
              <option value="everyone">Everyone</option>
              <option value="role">A role</option>
              <option value="user">One person</option>
            </select>
          </Field>

          {audience === 'role' && (
            <Field label="Role">
              <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {audience === 'user' && (
            <Field label="Who" hint={selected ? `Sending to ${selected.email}` : undefined}>
              <div className="filters">
                <input
                  type="search"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void searchUsers()
                    }
                  }}
                  placeholder="Search name or email"
                />
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={searching}
                  onClick={() => void searchUsers()}
                >
                  {searching ? 'Searching…' : 'Search'}
                </button>
              </div>
              {matches && matches.length === 0 && (
                <span className="field__hint">No users match that search.</span>
              )}
              {matches && matches.length > 0 && (
                <select value={userId} onChange={(e) => setUserId(e.target.value)}>
                  <option value="">Select a user…</option>
                  {matches.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {u.email}
                    </option>
                  ))}
                </select>
              )}
            </Field>
          )}

          <Field label="Title" hint={`${title.length}/${MAX_TITLE}`}>
            <input
              value={title}
              maxLength={MAX_TITLE}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Hostel verified"
            />
          </Field>

          <Field label="Message" hint={`${body.length}/${MAX_BODY}`}>
            <textarea
              rows={4}
              value={body}
              maxLength={MAX_BODY}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Your listing passed verification and is now visible to students."
            />
          </Field>

          <Field
            label="Poster (optional)"
            hint="Shown in the in-app feed; Android push displays it too."
          >
            <input type="file" accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
          </Field>

          <Field label="Open on tap">
            <select value={route} onChange={(e) => setRoute(e.target.value)}>
              {ROUTES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>

          {!confirming ? (
            <button
              type="button"
              className="btn btn--primary"
              disabled={!ready || sending}
              onClick={() => (needsConfirm ? setConfirming(true) : void send())}
            >
              {sending ? 'Sending…' : 'Send notification'}
            </button>
          ) : (
            <div className="resolve">
              <p className="resolve__warn">
                This lands in{' '}
                <strong>
                  {audience === 'everyone'
                    ? `all ${reach.data?.totalUsers ?? 0} users'`
                    : `every ${role}'s`}
                </strong>{' '}
                feed. It cannot be un-sent. Send it?
              </p>
              <div className="resolve__actions">
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  disabled={sending}
                  onClick={() => void send()}
                >
                  {sending ? 'Sending…' : 'Yes, send it'}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setConfirming(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Card>

        <Card title="Preview">
          <p className="bignum__sub">Roughly how it lands on a phone.</p>
          <div className="phonepreview">
            <div className="phonepreview__app">
              <span className="phonepreview__mark">MD</span>
              <span>MeDan</span>
              <span className="phonepreview__now">now</span>
            </div>
            <p className="phonepreview__title">{title.trim() || 'Notification title'}</p>
            <p className="phonepreview__body">
              {body.trim() || 'Your message appears here.'}
            </p>
          </div>
          <p className="note">
            Long titles are truncated by the OS — iOS shows roughly 40 characters on one
            line, Android about 45.
          </p>
        </Card>
      </div>
    </>
  )
}
