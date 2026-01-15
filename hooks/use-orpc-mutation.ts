// hooks/use-orpc-mutation.ts

'use client'

import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

/**
 * Custom hook that wraps useMutation with oRPC client safety
 * Prevents SSR issues by only initializing mutations after component mounts
 */
export function useORPCMutation<TData, TError, TVariables, TContext>(
  getMutationOptions: () => UseMutationOptions<TData, TError, TVariables, TContext>
) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return useMutation(
    mounted ? getMutationOptions() : {
      mutationFn: () => Promise.reject(new Error('Component not mounted')),
    } as UseMutationOptions<TData, TError, TVariables, TContext>
  )
}