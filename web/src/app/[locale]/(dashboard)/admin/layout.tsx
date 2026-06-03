import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { auth } from "@/auth"

// Server-side role gate for the /admin subtree. Identity/roles come from the session JWT
// (lifted from the OIDC claims). Non-admins are redirected to the dashboard. This replaces
// the middleware role check (kept out of middleware so next-intl owns the response there).
export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const session = await auth()
  if (!session?.user?.isAdmin) {
    // as-needed locale prefix: fa is unprefixed, en is /en.
    redirect(locale === "en" ? "/en/dashboard" : "/dashboard")
  }
  return <>{children}</>
}
