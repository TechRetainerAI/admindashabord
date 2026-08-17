/** Mirrors the DTOs in MeDan.Api/Dtos. Enums arrive as camelCase strings. */

export type UserRole = 'student' | 'owner' | 'worker' | 'manager' | 'admin'

export type BookingStatus =
  | 'pending'
  | 'paymentHeld'
  | 'checkedIn'
  | 'completed'
  | 'disputed'
  | 'refunded'
  | 'cancelled'

export type ReferralStatus = 'pending' | 'claimed' | 'paid'

export type PropertyType = 'hostel' | 'hometel' | 'apartment' | 'selfContained' | 'hall'

export type RoomType =
  | 'single'
  | 'doublyShared'
  | 'triplyShared'
  | 'quadShared'
  | 'ensuite'
  | 'apartment'

export type Gender = 'male' | 'female' | 'mixed'

export interface AdminStats {
  users: number
  students: number
  staff: number
  companies: number
  hostels: number
  unverifiedHostels: number
  bookings: number
  openDisputes: number
  referralsAwaitingPayout: number
  escrowHeld: number
  /** Paid bookings whose students have not been checked in yet. */
  awaitingCheckIn: number
  /** Released escrow that has not reached the owner (no settlement account, usually). */
  stuckPayouts: number
  upcomingEvents: number
}

export interface AdminBooking {
  id: string
  studentUserId: string
  studentName: string
  studentEmail: string
  studentPhone: string | null
  hostelId: string
  hostelName: string
  roomLabel: string
  bedLabel: string
  companyId: string
  companyName: string
  academicYear: string
  amount: number
  commission: number
  status: BookingStatus
  paystackReference: string | null
  disputeReason: string | null
  disputeResolution: string | null
  createdAt: string
  paidAt: string | null
  checkedInAt: string | null
  completedAt: string | null
  disputedAt: string | null
  resolvedAt: string | null
}

export interface AdminUser {
  id: string
  email: string
  name: string
  phone: string | null
  photoUrl: string | null
  role: UserRole
  isActive: boolean
  createdAt: string
  bookingCount: number
}

export interface Referral {
  id: string
  code: string
  referrerUserId: string
  referrerName: string
  refereeUserId: string | null
  refereeName: string | null
  status: ReferralStatus
  rewardAmount: number
  qualifyingBookingId: string | null
  claimedAt: string | null
  paidAt: string | null
  createdAt: string
}

export interface Hostel {
  id: string
  name: string
  campus: string
  ownerId: string
  address: string
  lat: number
  lng: number
  distanceKm: number
  minPrice: number
  maxPrice: number
  photos: string[]
  amenities: string[]
  isVerified: boolean
  rating: number
  reviewCount: number
  description: string | null
  contactPhone: string | null
  propertyType: PropertyType
  companyId: string
}

export interface Room {
  id: string
  hostelId: string
  label: string
  type: RoomType
  pricePerSemester: number
  status: 'available' | 'occupied' | 'maintenance'
  capacity: number
  availableBeds: number
  gender: Gender
}

export interface HostelDetail extends Hostel {
  rooms: Room[]
  /** Same photos as `photos`, with ids so a specific one can be deleted. */
  photoItems: HostelPhoto[]
}

export interface CreateHostelRequest {
  companyId?: string
  name: string
  propertyType: PropertyType
  description?: string
  campus: string
  address: string
  lat: number
  lng: number
  distanceKm: number
  minPrice: number
  maxPrice: number
  contactPhone?: string
  amenities: string[]
  photoUrls: string[]
}

/** PUT /api/hostels/{id} — a full replace; photos/rooms have their own routes. */
export interface UpdateHostelRequest {
  name: string
  propertyType: PropertyType
  description?: string
  campus: string
  address: string
  lat: number
  lng: number
  distanceKm: number
  minPrice: number
  maxPrice: number
  contactPhone?: string
  amenities: string[]
}

export interface HostelPhoto {
  id: string
  url: string
  isCover: boolean
  sortOrder: number
}

export interface CreateRoomRequest {
  label: string
  type: RoomType
  capacity: number
  pricePerSemester: number
  gender: Gender
  floor?: string
}

/** POST /api/admin/auth/login | /register — a MeDan-signed staff token. */
export interface StaffAuthResponse {
  token: string
  expiresAt: string
  user: Me
}

/** Who a staff-sent push notification targets. */
export type NotificationAudience = 'user' | 'role' | 'everyone'

export interface SendNotificationRequest {
  audience: NotificationAudience
  userId?: string
  role?: UserRole
  title: string
  body: string
  /** In-app route to open on tap, e.g. "/bookings". */
  route?: string
  /** Poster URL from uploadNotificationImage. */
  imageUrl?: string
}

export interface SendNotificationResponse {
  recipients: number
  devices: number
  /** False when the API has no Firebase service account — nothing was sent. */
  delivered: boolean
  message: string
}

/** How many people a broadcast can actually reach right now. */
export interface NotificationReach {
  totalUsers: number
  reachableUsers: number
  devices: number
  androidDevices: number
  iosDevices: number
  pushConfigured: boolean
}

/** The profile the API returns for the signed-in user. */
export interface Me {
  id: string
  email: string
  name: string
  phone: string | null
  photoUrl: string | null
  role: UserRole
}

/** Body for POST /api/admin/users — onboarding a hostel manager. */
export interface AdminCreateUserRequest {
  name: string
  email: string
  phone?: string
  /** Temporary password, handed to the manager in person. Min 8 chars. */
  password: string
  /** owner | worker | manager — never admin. */
  role: UserRole
}

/** A campus event shown on the app's Events tab. */
export interface CampusEvent {
  id: string
  title: string
  description: string | null
  venue: string
  /** Null shows the event on every campus. */
  campus: string | null
  startsAt: string
  endsAt: string | null
  imageUrl: string | null
  createdAt: string
}

export interface SaveEventRequest {
  title: string
  description?: string
  venue: string
  campus?: string | null
  startsAt: string
  endsAt?: string | null
  imageUrl?: string | null
}
