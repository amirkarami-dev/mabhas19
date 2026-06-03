import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { getQueryClient } from "@/lib/query-client"
import { queryKeys } from "@/lib/query-keys"
import { serverApiFetch } from "@/lib/api-server"
import type { Subscription } from "@/lib/types"
import SubscriptionClient from "./subscription-client"

// Server Component: prefetch the subscription with the request's session token so the
// page server-renders with data (auth enforced in middleware).
export default async function SubscriptionPage() {
  const queryClient = getQueryClient()
  await queryClient.prefetchQuery({
    queryKey: queryKeys.subscription,
    queryFn: () => serverApiFetch<Subscription>("/api/Subscriptions/me"),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SubscriptionClient />
    </HydrationBoundary>
  )
}
