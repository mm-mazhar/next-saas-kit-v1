// lib/orpc/client.ts

'use client'

import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { RouterClient } from '@orpc/server'
import type { AppRouter } from './root'

/**
 * Lazy initialization to avoid SSR issues
 */
let _client: RouterClient<AppRouter> | null = null
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _orpc: any | null = null
let _initialized = false

function initializeClients() {
  if (_initialized) {
    return { client: _client!, orpc: _orpc! }
  }

  if (typeof window !== 'undefined') {
    // Browser environment - create real clients with proper URL
    try {
      const link = new RPCLink({
        url: `${window.location.origin}/api/rpc`,
      })
      
      // @ts-expect-error - oRPC createORPCClient returns DecoratedProcedure types incompatible with RouterClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _client = createORPCClient<AppRouter>(link) as any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _orpc = createTanstackQueryUtils(_client as any) as any
    } catch (error) {
      console.error('Failed to create oRPC client:', error)
      // Fallback to mock clients if creation fails
      const createDeepProxy = (path: string[] = []): unknown => {
        return new Proxy(() => {}, {
          get(target, prop) {
            if (typeof prop === 'string') {
              return createDeepProxy([...path, prop])
            }
            return undefined
          },
          apply() {
            throw new Error(`oRPC client failed to initialize: ${error}`)
          }
        })
      }

      _client = createDeepProxy(['client']) as RouterClient<AppRouter>
      _orpc = createDeepProxy(['orpc'])
    }
  } else {
    // SSR environment - create deep mock objects
    const createDeepProxy = (path: string[] = []): unknown => {
      return new Proxy(() => {}, {
        get(target, prop) {
          if (typeof prop === 'string') {
            return createDeepProxy([...path, prop])
          }
          return undefined
        },
        apply() {
          throw new Error(`oRPC client method ${path.join('.')} can only be used in browser environment`)
        }
      })
    }

    _client = createDeepProxy(['client']) as RouterClient<AppRouter>
    _orpc = createDeepProxy(['orpc'])
  }

  _initialized = true
  return { client: _client!, orpc: _orpc! }
}

/**
 * Type-safe oRPC client for direct procedure calls
 */
export const client = new Proxy({} as RouterClient<AppRouter>, {
  get(_target, prop) {
    const { client } = initializeClients()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (client as any)[prop as string]
  }
}) as RouterClient<AppRouter>

/**
 * TanStack Query utilities for oRPC
 * Note: Using any type here due to complex oRPC type inference issues
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const orpc = new Proxy({} as any, {
  get(_target, prop) {
    const { orpc } = initializeClients()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (orpc as any)[prop as string]
  }
})

/**
 * Re-export types for convenience
 */
export type { AppRouter }
