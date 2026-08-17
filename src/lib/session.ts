const TOKEN_KEY = 'medan.admin.token'

/**
 * The staff JWT issued by POST /api/admin/auth/login.
 *
 * Kept in localStorage so a refresh doesn't sign you out. That is readable by
 * any script on this origin, which is an accepted trade-off for an internal
 * tool; the token is short-lived (12h) and the API re-checks the role on every
 * request. Move to an httpOnly cookie if this is ever exposed publicly.
 */
export const session = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}
