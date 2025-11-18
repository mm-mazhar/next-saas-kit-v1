// src/components/ui/page-section.tsx

import { cn } from '@/lib/utils'
import React from 'react'

interface PageSectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
  as?: React.ElementType
}

export function PageSection({
  children,
  className,
  as: Component = 'section',
  ...props
}: PageSectionProps) {
  return (
    <Component
      // ✅ THE FIX: Changed py-* to pt-* to prevent doubling the vertical space
      className={cn('w-full pt-16 md:pt-20', className)}
      {...props}
    >
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>{children}</div>
    </Component>
  )
}
