import { session } from './session'
import type {
  AdminBooking,
  AdminCreateUserRequest,
  AdminStats,
  AdminUser,
  CampusEvent,
  SaveEventRequest,
  CreateHostelRequest,
  CreateRoomRequest,
  Hostel,
  HostelDetail,
  Me,
  NotificationReach,
  Referral,
  Room,
  SendNotificationRequest,
  SendNotificationResponse,
  StaffAuthResponse,
  UpdateHostelRequest,
  UserRole,
} from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080'

/** An API call that came back non-2xx. `status` lets callers special-case 403/404. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function authHeader(): Record<string, string> {
  const token = session.get()
  if (!token) throw new ApiError('Not signed in.', 401)
  return { Authorization: `Bearer ${token}` }
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text // ASP.NET returns plain-text bodies for some errors
  }
}

function messageFrom(body: unknown, status: number): string {
  if (typeof body === 'string' && body) return body
  if (body && typeof body === 'object') {
    const o = body as Record<string, unknown>
    const m = o.message ?? o.title ?? o.detail
    if (typeof m === 'string') return m
  }
  return `Request failed (${status}).`
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  { auth: needsAuth = true }: { auth?: boolean } = {},
): Promise<T> {
  // Only JSON string bodies get a Content-Type — FormData must keep the
  // browser-generated multipart boundary.
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
    ...(needsAuth ? authHeader() : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  }

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError(`Cannot reach the MeDan API at ${BASE_URL}.`, 0)
  }

  const body = await parse(res)
  if (!res.ok) throw new ApiError(messageFrom(body, res.status), res.status)
  return body as T
}

const qs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') s.set(k, String(v))
  }
  const out = s.toString()
  return out ? `?${out}` : ''
}

export const api = {
  // --- staff identity -----------------------------------------------------
  login: (email: string, password: string) =>
    request<StaffAuthResponse>(
      '/api/admin/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      { auth: false },
    ),

  /**
   * Creates a staff account. Open only while no staff exist — that first account
   * becomes the Admin. Afterwards the API requires an Admin token.
   */
  register: (body: { email: string; password: string; name: string; role?: UserRole }) =>
    request<StaffAuthResponse>(
      '/api/admin/auth/register',
      { method: 'POST', body: JSON.stringify(body) },
      { auth: Boolean(session.get()) },
    ),

  /** Validates a stored token on load. Null when the token is for a user with no profile. */
  async me(): Promise<Me | null> {
    try {
      return await request<Me>('/api/admin/auth/me')
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  },

  // --- dashboard ----------------------------------------------------------
  stats: () => request<AdminStats>('/api/admin/stats'),

  // --- customer service ---------------------------------------------------
  bookings: (params: { status?: string; q?: string } = {}) =>
    request<AdminBooking[]>(`/api/admin/bookings${qs(params)}`),

  booking: (id: string) => request<AdminBooking>(`/api/admin/bookings/${id}`),

  resolveDispute: (id: string, outcome: 'refund' | 'release', note: string) =>
    request<unknown>(`/api/bookings/${id}/resolve-dispute`, {
      method: 'POST',
      body: JSON.stringify({ outcome, note }),
    }),

  // --- people -------------------------------------------------------------
  users: (params: { role?: string; q?: string } = {}) =>
    request<AdminUser[]>(`/api/admin/users${qs(params)}`),

  setRole: (id: string, role: UserRole) =>
    request<AdminUser>(`/api/admin/users/${id}/role`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    }),

  // --- listings -----------------------------------------------------------
  hostels: (params: { campus?: string; q?: string; verified?: string } = {}) =>
    request<Hostel[]>(`/api/hostels${qs(params)}`, {}, { auth: false }),

  hostel: (id: string) => request<HostelDetail>(`/api/hostels/${id}`, {}, { auth: false }),

  createHostel: (body: CreateHostelRequest) =>
    request<Hostel>('/api/hostels', { method: 'POST', body: JSON.stringify(body) }),

  /** multipart/form-data upload; the API stores files under wwwroot/uploads. */
  async uploadPhotos(hostelId: string, files: File[]): Promise<unknown> {
    const form = new FormData()
    for (const f of files) form.append('files', f)
    return request<unknown>(`/api/hostels/${hostelId}/photos`, {
      method: 'POST',
      body: form,
    })
  },

  updateHostel: (id: string, body: UpdateHostelRequest) =>
    request<HostelDetail>(`/api/hostels/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  /** 409 when the hostel has bookings — those can't be destroyed. */
  deleteHostel: (id: string) => request<void>(`/api/hostels/${id}`, { method: 'DELETE' }),

  deletePhoto: (hostelId: string, photoId: string) =>
    request<void>(`/api/hostels/${hostelId}/photos/${photoId}`, { method: 'DELETE' }),

  setVerified: (id: string, verified: boolean) =>
    request<void>(`/api/admin/hostels/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ verified }),
    }),

  rooms: (hostelId: string) =>
    request<Room[]>(`/api/hostels/${hostelId}/rooms`, {}, { auth: false }),

  createRoom: (hostelId: string, body: CreateRoomRequest) =>
    request<Room>(`/api/hostels/${hostelId}/rooms`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // --- referrals ----------------------------------------------------------
  referrals: (params: { status?: string } = {}) =>
    request<Referral[]>(`/api/admin/referrals${qs(params)}`),

  markReferralPaid: (id: string) =>
    request<Referral>(`/api/referrals/${id}/mark-paid`, { method: 'POST' }),

  createUser: (body: AdminCreateUserRequest) =>
    request<AdminUser>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // --- events -------------------------------------------------------------
  events: () => request<CampusEvent[]>('/api/events?all=true', {}, { auth: false }),

  createEvent: (body: SaveEventRequest) =>
    request<CampusEvent>('/api/events', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateEvent: (id: string, body: SaveEventRequest) =>
    request<CampusEvent>(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteEvent: (id: string) =>
    request<void>(`/api/events/${id}`, { method: 'DELETE' }),

  uploadEventImage: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<CampusEvent>(`/api/events/${id}/image`, {
      method: 'POST',
      body: form,
    })
  },

  // --- notifications ------------------------------------------------------
  uploadNotificationImage: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<{ url: string }>('/api/admin/notifications/image', {
      method: 'POST',
      body: form,
    })
  },

  notificationReach: () =>
    request<NotificationReach>('/api/admin/notifications/reach'),

  sendNotification: (body: SendNotificationRequest) =>
    request<SendNotificationResponse>('/api/admin/notifications/send', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
