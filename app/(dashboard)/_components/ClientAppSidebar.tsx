'use client'

import { AppSidebar } from '@/app/(dashboard)/_components/app-sidebar'
import * as React from 'react'

export function ClientAppSidebar(
  props: React.ComponentProps<typeof AppSidebar>
) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  if (!mounted) return null
  return <AppSidebar {...props} />
}

