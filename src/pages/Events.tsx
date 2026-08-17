import { useState } from 'react'

import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { photoSrc } from '../lib/catalog'
import type { CampusEvent } from '../lib/types'
import { Badge, Card, Empty, ErrorBox, Field, Spinner, dateTime } from '../components/ui'

/**
 * Campus events, as shown on the app's Events tab. Anyone on staff can post;
 * events with no campus show to every student.
 */
export function Events() {
  const { data, loading, error, reload } = useAsync(() => api.events())

  const [title, setTitle] = useState('')
  const [venue, setVenue] = useState('')
  const [campus, setCampus] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)

  /// Non-null puts the form into edit mode for that event.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [currentPoster, setCurrentPoster] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const ready = title.trim() && venue.trim() && startsAt

  /** ISO → the local `yyyy-MM-ddTHH:mm` a datetime-local input expects. */
  function toLocalInput(iso: string): string {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function startEditing(ev: CampusEvent) {
    setEditingId(ev.id)
    setTitle(ev.title)
    setVenue(ev.venue)
    setCampus(ev.campus ?? '')
    setStartsAt(toLocalInput(ev.startsAt))
    setEndsAt(ev.endsAt ? toLocalInput(ev.endsAt) : '')
    setDescription(ev.description ?? '')
    setCurrentPoster(ev.imageUrl)
    setImage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setEditingId(null)
    setCurrentPoster(null)
    setTitle('')
    setVenue('')
    setStartsAt('')
    setEndsAt('')
    setDescription('')
    setImage(null)
  }

  async function save() {
    setSaving(true)
    setFormError(null)
    try {
      const body = {
        title: title.trim(),
        venue: venue.trim(),
        campus: campus || null,
        // datetime-local has no zone; treat it as this machine's local time.
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        description: description.trim() || undefined,
      }
      const saved = editingId
        ? await api.updateEvent(editingId, body)
        : await api.createEvent(body)
      // The poster rides along after the event exists — a failed upload
      // leaves a perfectly good event rather than nothing.
      if (image) await api.uploadEventImage(saved.id, image)
      resetForm()
      reload()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  async function remove(ev: CampusEvent) {
    if (!window.confirm(`Delete "${ev.title}"? Students will stop seeing it immediately.`)) return
    setBusyId(ev.id)
    try {
      await api.deleteEvent(ev.id)
      reload()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusyId(null)
    }
  }

  const upcoming = (data ?? []).filter((e) => new Date(e.startsAt) >= new Date())
  const past = (data ?? []).filter((e) => new Date(e.startsAt) < new Date())

  return (
    <>
      <header className="page__head">
        <h1>Events</h1>
        <p className="page__sub">What students see on the app's Events tab.</p>
      </header>

      <div className="grid grid--wide">
        <Card
          title={editingId ? 'Edit event' : 'Post an event'}
          action={
            editingId ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={resetForm}>
                Cancel edit
              </button>
            ) : undefined
          }
        >
          {formError && <ErrorBox message={formError} />}
          <Field label="Title">
            <input value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)}
              placeholder="Fresher's Akwaaba Night" />
          </Field>
          <Field label="Venue">
            <input value={venue} maxLength={200} onChange={(e) => setVenue(e.target.value)}
              placeholder="UENR Auditorium" />
          </Field>
          <Field label="Campus" hint="Leave on Everyone for both campuses.">
            <select value={campus} onChange={(e) => setCampus(e.target.value)}>
              <option value="">Everyone</option>
              <option value="UENR">UENR — Sunyani</option>
              <option value="USTED">AAMUSTED — Kumasi</option>
            </select>
          </Field>
          <Field label="Starts">
            <input type="datetime-local" value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)} />
          </Field>
          <Field label="Ends (optional)">
            <input type="datetime-local" value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)} />
          </Field>
          <Field
            label="Poster image (optional)"
            hint={
              currentPoster && !image
                ? 'This event already has a poster — choosing a file replaces it.'
                : 'Shown when a student opens the event.'
            }
          >
            {currentPoster && !image && (
              <img className="posterpreview" src={photoSrc(currentPoster)} alt="Current poster" />
            )}
            <input type="file" accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
          </Field>
          <Field label="Details (optional)">
            <textarea rows={3} value={description} maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Free entry with a student ID…" />
          </Field>
          <button type="button" className="btn btn--primary" disabled={!ready || saving}
            onClick={() => void save()}>
            {saving
              ? 'Saving…'
              : editingId
                ? 'Save changes'
                : 'Post event'}
          </button>
        </Card>

        <Card title="Scheduled">
          {loading && <Spinner />}
          {error && <ErrorBox message={error} onRetry={reload} />}
          {data && upcoming.length === 0 && (
            <Empty title="Nothing scheduled" hint="Students see an empty Events tab right now." />
          )}
          {upcoming.map((ev) => (
            <EventRow key={ev.id} ev={ev} busy={busyId === ev.id}
              onEdit={() => startEditing(ev)} onDelete={() => void remove(ev)} />
          ))}
          {past.length > 0 && (
            <>
              <p className="note">Past events — no longer shown in the app.</p>
              {past.map((ev) => (
                <EventRow key={ev.id} ev={ev} busy={busyId === ev.id}
                  onEdit={() => startEditing(ev)} onDelete={() => void remove(ev)} />
              ))}
            </>
          )}
        </Card>
      </div>
    </>
  )
}

function EventRow({
  ev,
  busy,
  onEdit,
  onDelete,
}: {
  ev: CampusEvent
  busy: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="eventrow">
      {ev.imageUrl && <img className="eventrow__thumb" src={photoSrc(ev.imageUrl)} alt="" />}
      <div className="eventrow__body">
        <div className="eventrow__head">
          <span className="cell__main">{ev.title}</span>
          <Badge tone={ev.campus ? 'info' : 'good'}>{ev.campus ?? 'Everyone'}</Badge>
        </div>
        <span className="cell__sub">
          {ev.venue} · {dateTime(ev.startsAt)}
          {ev.endsAt ? ` → ${dateTime(ev.endsAt)}` : ''}
        </span>
      </div>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onEdit}>
        Edit
      </button>
      <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={onDelete}>
        {busy ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  )
}
