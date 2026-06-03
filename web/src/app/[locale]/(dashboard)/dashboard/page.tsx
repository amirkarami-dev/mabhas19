import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { getQueryClient } from "@/lib/query-client"
import { queryKeys } from "@/lib/query-keys"
import { serverApiFetch } from "@/lib/api-server"
import type { Project, Subscription } from "@/lib/types"
import DashboardClient from "./dashboard-client"

// Server Component: prefetch the dashboard's data with the request's session token and
// hand a warm cache to the client via HydrationBoundary, so DashboardClient mounts with
// data already present instead of firing its own fetch.
//
// Note: first paint is still gated by the client-side <RequireAuth> in the dashboard
// layout, so this removes the client refetch rather than rendering the table on the
// server. Moving the auth gate server-side (middleware/redirect) would unlock full SSR;
// see deploy/README — left as a deliberate follow-up to avoid reworking the SSO flow.
export default async function DashboardPage() {
  const queryClient = getQueryClient()
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.projects,
      queryFn: () => serverApiFetch<Project[]>("/api/Projects"),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.subscription,
      queryFn: () => serverApiFetch<Subscription>("/api/Subscriptions/me"),
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardClient />
    </HydrationBoundary>
  )
}
