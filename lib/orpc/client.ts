'use client'

import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { RouterClient } from '@orpc/server'
import type { AppRouter } from './root'

/**
 * RPC link configuration for client-side requests
 * Points to the /api/rpc endpoint
 */
const link = new RPCLink({
  url: '/api/rpc',
  // Headers are automatically included by the browser (cookies, etc.)
})

/**
 * Type-safe oRPC client for direct procedure calls
 * Use this for imperative calls outside of React components
 * 
 * @example
 * ```ts
 * const orgs = await client.org.list()
 * ```
 */
export const client: RouterClient<AppRouter> = createORPCClient(link)

/**
 * TanStack Query utilities for oRPC
 * Provides React hooks for queries and mutations with automatic caching
 * 
 * @example
 * ```tsx
 * // Query
 * const { data, isLoading } = useQuery(orpc.org.list.queryOptions())
 * 
 * // Mutation
 * const mutation = useMutation(orpc.org.create.mutationOptions({
 *   onSuccess: () => {
 *     queryClient.invalidateQueries({ queryKey: orpc.org.key() })
 *   }
 * }))
 * mutation.mutate({ name: 'New Org' })
 * ```
 */
export const orpc = createTanstackQueryUtils(client)

/**
 * Re-export types for convenience
 */
export type { AppRouter }
