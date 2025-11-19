// components/ThemeInitializer.tsx

'use client'

import { DEFAULT_COLOR_SCHEME } from '@/lib/constants'
import { useTheme } from 'next-themes'
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
  const { setTheme } = useTheme()

  useEffect(() => {
    const storageKey = 'app-theme'
    const stored = (typeof window !== 'undefined'
      ? window.localStorage.getItem(storageKey)
      : null) as 'light' | 'dark' | 'system' | null

    if (settings?.themePreference) {
      if (forceFromServer) {
        setTheme(settings.themePreference)
      } else if (!stored) {
        setTheme(settings.themePreference)
      }
    }

    // 1. Find the body element.
    const body = document.body
    // 2. Remove any existing theme-color-* class to prevent conflicts.
    body.className = body.className.replace(/theme-\w+/g, '')
    // 3. Add the new color scheme class.
    body.classList.add(settings?.colorScheme ?? DEFAULT_COLOR_SCHEME)
  }, [settings, setTheme, forceFromServer])

  return null
}
