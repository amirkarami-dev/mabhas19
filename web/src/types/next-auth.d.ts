import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Extends the built-in Session type to include the IdP access token
   * so that API requests can be made on behalf of the user.
   */
  interface Session extends DefaultSession {
    /** Raw JWT access token issued by the IdP (audience: mabhas19.api). */
    accessToken?: string
  }
}

declare module "@auth/core/jwt" {
  /** Extends the Auth.js JWT with tokens forwarded from the IdP token response. */
  interface JWT {
    /** IdP access token (audience: mabhas19.api). */
    accessToken?: string
    /** IdP refresh token for silent renewal. */
    refreshToken?: string
    /** Absolute expiry of the access token (seconds since epoch). */
    expiresAt?: number
  }
}
