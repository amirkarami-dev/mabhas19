import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { getQueryClient } from "@/lib/query-client"
import { queryKeys } from "@/lib/query-keys"
import { serverApiFetch } from "@/lib/api-server"
import type { Project, Subscription } from "@/lib/types"
import DashboardClient from "./dashboard-client"

// Server Component: auth is enforced in middleware, so this server-renders the dashboard
// with data prefetched using the request's session token (no client gate, no flicker) and
// hands a warm cache to the client via HydrationBoundary.
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
