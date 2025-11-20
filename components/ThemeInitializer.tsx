// components/ThemeInitializer.tsx

'use client'

import { DEFAULT_COLOR_SCHEME } from '@/lib/constants'
import { useEffect } from 'react'

type ThemeSettings = {
  colorScheme: string | null
  themePreference: 'light' | 'dark' | 'system' | null
}

export function ThemeInitializer({
  settings,
  forceFromServer,
}: {
  settings: ThemeSettings | null
  forceFromServer?: boolean
}) {
  useEffect(() => {
    // Do not set theme here; let next-themes handle toggling.

    const body = document.body
    const desired = settings?.colorScheme ?? DEFAULT_COLOR_SCHEME
    const existing = Array.from(body.classList).find((c) => c.startsWith('theme-'))
    if (existing !== desired) {
      if (existing) body.classList.remove(existing)
      body.classList.add(desired)
    }
  }, [settings, forceFromServer])

  return null
}
