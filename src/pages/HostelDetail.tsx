import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import {
  AMENITIES,
  CAMPUSES,
  GENDERS,
  PROPERTY_TYPES,
  ROOM_TYPES,
  photoSrc,
} from '../lib/catalog'
import type { Gender, HostelDetail as Detail, PropertyType, RoomType } from '../lib/types'
import {
  Badge,
  Card,
  Empty,
  ErrorBox,
  Field,
  Spinner,
  cedis,
  humanize,
} from '../components/ui'

/**
 * Everything for one listing: edit its details, manage its photos, and add the
 * rooms students can actually book. Room prices drive the hostel's displayed
 * price range, so the API recomputes min/max whenever a room changes.
 */
export function HostelDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useAsync(() => api.hostel(id), [id])
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function remove(name: string) {
    if (!window.confirm(`Delete “${name}”? Its rooms and photos go with it. This cannot be undone.`))
      return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.deleteHostel(id)
      navigate('/hostels')
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e))
      setDeleting(false)
    }
  }

  if (loading) return <Spinner />
  if (error) return <ErrorBox message={error} onRetry={reload} />
  if (!data) return <Empty title="Hostel not found." />

  return (
    <>
      <header className="page__head">
        <h1>{data.name}</h1>
        <Badge tone={data.isVerified ? 'good' : 'warn'}>
          {data.isVerified ? 'Verified' : 'Unverified'}
        </Badge>
        <Link className="btn btn--ghost btn--sm" to="/hostels">
          Back
        </Link>
        <button
          type="button"
          className="btn btn--danger btn--sm"
          disabled={deleting}
          onClick={() => void remove(data.name)}
        >
          {deleting ? 'Deleting…' : 'Delete hostel'}
        </button>
        <p className="page__sub">
          {data.campus} · {humanize(data.propertyType)} · {data.address}
        </p>
      </header>

      {deleteError && <ErrorBox message={deleteError} />}

      <EditForm hostel={data} onSaved={reload} />
      <Photos hostel={data} onChanged={reload} />
      <Rooms hostel={data} onChanged={reload} />
    </>
  )
}

// ------------------------------------------------------------------ details

function EditForm({ hostel, onSaved }: { hostel: Detail; onSaved: () => void }) {
  const [name, setName] = useState(hostel.name)
  const [propertyType, setPropertyType] = useState<PropertyType>(hostel.propertyType)
  const [campus, setCampus] = useState(hostel.campus)
  const [address, setAddress] = useState(hostel.address)
  const [description, setDescription] = useState(hostel.description ?? '')
  const [contactPhone, setContactPhone] = useState(hostel.contactPhone ?? '')
  const [lat, setLat] = useState(String(hostel.lat))
  const [lng, setLng] = useState(String(hostel.lng))
  const [distanceKm, setDistanceKm] = useState(String(hostel.distanceKm))
  const [amenities, setAmenities] = useState<string[]>(hostel.amenities)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Re-sync when a save (or a room change) reloads the hostel.
  useEffect(() => {
    setAmenities(hostel.amenities)
  }, [hostel.amenities])

  const toggle = (key: string) =>
    setAmenities((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await api.updateHostel(hostel.id, {
        name: name.trim(),
        propertyType,
        campus,
        address: address.trim(),
        description: description.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        lat: Number(lat) || 0,
        lng: Number(lng) || 0,
        distanceKm: Number(distanceKm) || 0,
        // Room prices are authoritative — send the current range back unchanged.
        minPrice: hostel.minPrice,
        maxPrice: hostel.maxPrice,
        amenities,
      })
      setSaved(true)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <Card title="Details">
        {error && <ErrorBox message={error} />}
        {saved && !error && <p className="field__hint">Saved.</p>}

        <div className="grid grid--2">
          <Field label="Name">
            <input value={name} required onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Property type">
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value as PropertyType)}
            >
              {PROPERTY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Campus">
            <select value={campus} onChange={(e) => setCampus(e.target.value)}>
              {CAMPUSES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Contact phone">
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </Field>
        </div>

        <Field label="Address">
          <input value={address} required onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="grid grid--3">
          <Field label="Latitude">
            <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} />
          </Field>
          <Field label="Longitude">
            <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} />
          </Field>
          <Field label="Distance to campus (km)">
            <input
              type="number"
              step="any"
              min="0"
              value={distanceKm}
              onChange={(e) => setDistanceKm(e.target.value)}
            />
          </Field>
        </div>

        <Field
          label="Price range"
          hint="Set by the rooms below — add or edit a room to change it."
        >
          <input
            value={`${cedis(hostel.minPrice)} – ${cedis(hostel.maxPrice)}`}
            readOnly
            disabled
          />
        </Field>

        <Field label="Amenities">
          <div className="chips">
            {AMENITIES.map((a) => (
              <button
                key={a.key}
                type="button"
                className={`chip${amenities.includes(a.key) ? ' chip--on' : ''}`}
                onClick={() => toggle(a.key)}
              >
                {a.name}
              </button>
            ))}
          </div>
        </Field>

        <div className="formactions">
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </Card>
    </form>
  )
}

// ------------------------------------------------------------------- photos

function Photos({ hostel, onChanged }: { hostel: Detail; onChanged: () => void }) {
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function upload() {
    if (files.length === 0) return
    setBusy(true)
    setError(null)
    try {
      await api.uploadPhotos(hostel.id, files)
      setFiles([])
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function remove(photoId: string) {
    setRemoving(photoId)
    setError(null)
    try {
      await api.deletePhoto(hostel.id, photoId)
      onChanged()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRemoving(null)
    }
  }

  return (
    <Card title={`Photos (${hostel.photoItems.length})`}>
      {error && <ErrorBox message={error} />}

      {hostel.photoItems.length === 0 ? (
        <Empty title="No photos yet" hint="The first photo uploaded becomes the cover." />
      ) : (
        <div className="thumbs">
          {hostel.photoItems.map((p) => (
            <div key={p.id} className="thumb">
              <img src={photoSrc(p.url)} alt="" loading="lazy" />
              {p.isCover && <span className="thumb__tag">Cover</span>}
              <button
                type="button"
                className="thumb__del"
                title="Delete photo"
                disabled={removing === p.id}
                onClick={() => void remove(p.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="filters">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />
        <button
          type="button"
          className="btn btn--primary btn--sm"
          disabled={busy || files.length === 0}
          onClick={() => void upload()}
        >
          {busy ? 'Uploading…' : `Upload${files.length ? ` ${files.length}` : ''}`}
        </button>
      </div>
    </Card>
  )
}

// -------------------------------------------------------------------- rooms

function Rooms({ hostel, onChanged }: { hostel: Detail; onChanged: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <Card
      title={`Rooms (${hostel.rooms.length})`}
      action={
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setOpen(!open)}>
          {open ? 'Cancel' : 'Add room'}
        </button>
      }
    >
      {open && (
        <AddRoom
          hostelId={hostel.id}
          onAdded={() => {
            setOpen(false)
            onChanged()
          }}
        />
      )}

      {hostel.rooms.length === 0 ? (
        <Empty
          title="No rooms yet"
          hint="Students book a bed in a room — a listing with no rooms can't be booked."
        />
      ) : (
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Type</th>
                <th className="num">Price / semester</th>
                <th className="num">Beds free</th>
                <th>Gender</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {hostel.rooms.map((r) => (
                <tr key={r.id}>
                  <td className="cell__main">{r.label}</td>
                  <td>{humanize(r.type)}</td>
                  <td className="num">{cedis(r.pricePerSemester)}</td>
                  <td className="num">
                    {r.availableBeds} / {r.capacity}
                  </td>
                  <td>{humanize(r.gender)}</td>
                  <td>
                    <Badge tone={r.status === 'available' ? 'good' : 'neutral'}>
                      {humanize(r.status)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function AddRoom({ hostelId, onAdded }: { hostelId: string; onAdded: () => void }) {
  const [label, setLabel] = useState('')
  const [type, setType] = useState<RoomType>('single')
  const [capacity, setCapacity] = useState(1)
  const [pricePerSemester, setPrice] = useState('')
  const [gender, setGender] = useState<Gender>('mixed')
  const [floor, setFloor] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Each layout implies a bed count; keep capacity in step but still editable.
  function pickType(next: RoomType) {
    setType(next)
    setCapacity(ROOM_TYPES.find((t) => t.value === next)?.capacity ?? 1)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.createRoom(hostelId, {
        label: label.trim(),
        type,
        capacity,
        pricePerSemester: Number(pricePerSemester) || 0,
        gender,
        floor: floor.trim() || undefined,
      })
      onAdded()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="addroom" onSubmit={submit}>
      {error && <ErrorBox message={error} />}
      <div className="grid grid--3">
        <Field label="Label">
          <input
            value={label}
            required
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Room A1"
          />
        </Field>
        <Field label="Type">
          <select value={type} onChange={(e) => pickType(e.target.value as RoomType)}>
            {ROOM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Beds" hint="1–4. A bed is created for each.">
          <input
            type="number"
            min={1}
            max={4}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          />
        </Field>
        <Field label="Price per bed / semester (GH₵)">
          <input
            type="number"
            min="0"
            required
            value={pricePerSemester}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="1200"
          />
        </Field>
        <Field label="Gender">
          <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
            {GENDERS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Floor (optional)">
          <input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="e.g. 2nd" />
        </Field>
      </div>
      <div className="formactions">
        <button type="submit" className="btn btn--primary btn--sm" disabled={busy}>
          {busy ? 'Adding…' : 'Add room'}
        </button>
      </div>
    </form>
  )
}
