import { redirect } from "@/i18n/navigation"

export default async function LocaleIndex({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  // Authenticated users land on the dashboard; the dashboard layout guards
  // and redirects to /login when no token is present.
  redirect({ href: "/dashboard", locale })
}
