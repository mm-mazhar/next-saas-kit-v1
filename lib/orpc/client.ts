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
let _orpc: ReturnType<typeof createTanstackQueryUtils> | null = null
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
      
      _client = createORPCClient<AppRouter>(link)
      _orpc = createTanstackQueryUtils(_client)
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
      _orpc = createDeepProxy(['orpc']) as ReturnType<typeof createTanstackQueryUtils>
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
    _orpc = createDeepProxy(['orpc']) as ReturnType<typeof createTanstackQueryUtils>
  }

  _initialized = true
  return { client: _client!, orpc: _orpc! }
}

/**
 * Type-safe oRPC client for direct procedure calls
 */
export const client: RouterClient<AppRouter> = new Proxy({} as RouterClient<AppRouter>, {
  get(target, prop) {
    const { client } = initializeClients()
    return client[prop as keyof RouterClient<AppRouter>]
  }
})

/**
 * TanStack Query utilities for oRPC
 */
export const orpc = new Proxy({} as ReturnType<typeof createTanstackQueryUtils>, {
  get(target, prop) {
    const { orpc } = initializeClients()
    return orpc[prop as keyof ReturnType<typeof createTanstackQueryUtils>]
  }
})

/**
 * Re-export types for convenience
 */
export type { AppRouter }
