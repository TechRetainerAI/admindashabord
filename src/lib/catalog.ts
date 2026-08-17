import type { Gender, PropertyType, RoomType } from './types'

// Mirrors the Campus/Amenity seed data in AppDbContext — keep in step with it.
export const CAMPUSES = [
  { code: 'UENR', name: 'UENR — University of Energy and Natural Resources' },
  { code: 'USTED', name: 'USTED — AAMUSTED' },
]

export const AMENITIES = [
  { key: 'wifi', name: 'WiFi' },
  { key: 'ac', name: 'Air conditioning' },
  { key: 'ensuite', name: 'Ensuite bathroom' },
  { key: 'generator', name: 'Standby generator' },
  { key: 'water', name: 'Water' },
  { key: 'security', name: 'Security' },
  { key: 'kitchen', name: 'Kitchen' },
  { key: 'study', name: 'Reading room' },
]

export const PROPERTY_TYPES: { value: PropertyType; label: string }[] = [
  { value: 'hostel', label: 'Hostel' },
  { value: 'hometel', label: 'Hometel' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'selfContained', label: 'Self-contained' },
  { value: 'hall', label: 'Hall' },
]

/** Capacity is fixed per layout — the API creates that many beds and caps it at 4. */
export const ROOM_TYPES: { value: RoomType; label: string; capacity: number }[] = [
  { value: 'single', label: 'Single (1 bed)', capacity: 1 },
  { value: 'doublyShared', label: 'Doubly shared (2 beds)', capacity: 2 },
  { value: 'triplyShared', label: 'Triply shared (3 beds)', capacity: 3 },
  { value: 'quadShared', label: 'Quad shared (4 beds)', capacity: 4 },
  { value: 'ensuite', label: 'Ensuite', capacity: 1 },
  { value: 'apartment', label: 'Apartment', capacity: 4 },
]

export const GENDERS: { value: Gender; label: string }[] = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'

/** Photo URLs come back relative (e.g. /uploads/hostels/x.jpg). */
export const photoSrc = (url: string) => (url.startsWith('http') ? url : `${API_BASE}${url}`)
