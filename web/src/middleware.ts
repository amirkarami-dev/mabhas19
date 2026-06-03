import createMiddleware from "next-intl/middleware"
import NextAuth from "next-auth"
import { NextResponse } from "next/server"
import { routing } from "./i18n/routing"
import { authConfig } from "./auth.config"

// Auth.js on the Edge runtime (reads the JWT session cookie; no IdP round-trip) composed
// with next-intl locale routing. The auth gate runs first; everything else falls through
// to next-intl so locale detection/rewrites are unchanged.
const { auth } = NextAuth(authConfig)
const intlMiddleware = createMiddleware(routing)

// Protected app areas — both the default-locale paths (fa, unprefixed) and the /en variants.
const PROTECTED = /^\/(?:en\/)?(?:dashboard|projects|import|subscription|admin)(?:\/|$)/
const ADMIN_ONLY = /^\/(?:en\/)?admin(?:\/|$)/

export default auth((req) => {
  const { pathname } = req.nextUrl
  const isEn = pathname === "/en" || pathname.startsWith("/en/")

  if (PROTECTED.test(pathname) && !req.auth) {
    return NextResponse.redirect(new URL(isEn ? "/en/login" : "/login", req.nextUrl))
  }

  // Admin area: role comes straight from the session JWT (lifted from the OIDC claims).
  if (ADMIN_ONLY.test(pathname) && !req.auth?.user?.isAdmin) {
    return NextResponse.redirect(new URL(isEn ? "/en/dashboard" : "/dashboard", req.nextUrl))
  }

  return intlMiddleware(req)
})

export const config = {
  // Match all paths except api, static files, and Next internals.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
