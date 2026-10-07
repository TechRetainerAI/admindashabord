import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { api } from '../lib/api'
import { AMENITIES, CAMPUSES, PROPERTY_TYPES } from '../lib/catalog'
import type { PropertyType } from '../lib/types'
import { Card, ErrorBox, Field, cedis, withMarkup } from '../components/ui'

/** Price inputs take the owner's asking price; students see it plus MeDan's 5%. */
const askingHint = (value: string) =>
  Number(value) > 0
    ? `Students will see ${cedis(withMarkup(Number(value)))} (asking price + MeDan's 5%).`
    : "Owner's asking price — students see it plus MeDan's 5%."

/**
 * Creates a listing, then uploads its photos. The API auto-creates the caller's
 * company on their first listing, so no company has to be picked here.
 */
export function NewHostel() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [propertyType, setPropertyType] = useState<PropertyType>('hostel')
  const [campus, setCampus] = useState(CAMPUSES[0].code)
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [distanceKm, setDistanceKm] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [amenities, setAmenities] = useState<string[]>([])
  const [files, setFiles] = useState<File[]>([])

  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'idle' | 'creating' | 'uploading'>('idle')

  const toggleAmenity = (key: string) =>
    setAmenities((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const min = Number(minPrice) || 0
    const max = Number(maxPrice) || 0
    if (max && min && max < min) {
      setError('Maximum price cannot be lower than the minimum price.')
      return
    }

    setStep('creating')
    try {
      const hostel = await api.createHostel({
        name: name.trim(),
        propertyType,
        campus,
        address: address.trim(),
        description: description.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        lat: Number(lat) || 0,
        lng: Number(lng) || 0,
        distanceKm: Number(distanceKm) || 0,
        minPrice: min,
        maxPrice: max,
        amenities,
        photoUrls: [],
      })

      if (files.length > 0) {
        setStep('uploading')
        // The listing already exists — surface an upload failure without
        // pretending the whole create failed.
        try {
          await api.uploadPhotos(hostel.id, files)
        } catch (e) {
          setStep('idle')
          setError(
            `Hostel created, but photo upload failed: ${
              e instanceof Error ? e.message : String(e)
            }. Add photos from the hostels list.`,
          )
          return
        }
      }

      navigate('/hostels')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStep('idle')
    }
  }

  const busy = step !== 'idle'

  return (
    <>
      <header className="page__head">
        <h1>Add hostel</h1>
        <p className="page__sub">Creates the listing under your company.</p>
      </header>

      <form onSubmit={submit}>
        {error && <ErrorBox message={error} />}

        <Card title="Basics">
          <div className="grid grid--2">
            <Field label="Name">
              <input value={name} required onChange={(e) => setName(e.target.value)} placeholder="e.g. Grace Hostel" />
            </Field>
            <Field label="Property type">
              <select value={propertyType} onChange={(e) => setPropertyType(e.target.value as PropertyType)}>
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
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="e.g. 0241234567"
              />
            </Field>
          </div>
          <Field label="Address">
            <input value={address} required onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, city" />
          </Field>
          <Field label="Description">
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes this place worth booking?"
            />
          </Field>
        </Card>

        <Card title="Location & pricing">
          <div className="grid grid--3">
            <Field label="Latitude">
              <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="7.3349" />
            </Field>
            <Field label="Longitude">
              <input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-2.3123" />
            </Field>
            <Field label="Distance to campus (km)">
              <input
                type="number"
                step="any"
                min="0"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                placeholder="1.5"
              />
            </Field>
            <Field label="Min asking price / semester (GH₵)" hint={askingHint(minPrice)}>
              <input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="1200" />
            </Field>
            <Field label="Max asking price / semester (GH₵)" hint={askingHint(maxPrice)}>
              <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="2500" />
            </Field>
          </div>
        </Card>

        <Card title="Amenities">
          <div className="chips">
            {AMENITIES.map((a) => (
              <button
                key={a.key}
                type="button"
                className={`chip${amenities.includes(a.key) ? ' chip--on' : ''}`}
                onClick={() => toggleAmenity(a.key)}
              >
                {a.name}
              </button>
            ))}
          </div>
        </Card>

        <Card title="Photos">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          />
          {files.length > 0 && (
            <p className="field__hint">
              {files.length} file{files.length === 1 ? '' : 's'} selected — the first becomes the cover.
            </p>
          )}
        </Card>

        <div className="formactions">
          <button type="submit" className="btn btn--primary" disabled={busy}>
            {step === 'creating' ? 'Creating…' : step === 'uploading' ? 'Uploading photos…' : 'Create hostel'}
          </button>
        </div>
      </form>
    </>
  )
}
