// app/components/DashboardNav.tsx

'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { navItems } from './SideUserNav'

export function DashboardNav({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname()
  // Show only Dashboard in the left sidebar; keep other items in UserNav
  const sidebarNavItems = navItems.filter((item) => item.href === '/dashboard')

  return (
    <TooltipProvider>
      <nav className='grid items-start gap-2'>
        {sidebarNavItems.map((item, index) => {
          if (!isCollapsed) {
            return (
              <Link
                key={index}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                  pathname === item.href ? 'bg-accent' : 'bg-transparent'
                )}
              >
                <item.icon className='h-4 w-4 text-primary' />
                <span className='text-sm font-medium'>{item.name}</span>
              </Link>
            )
          }

          return (
            <Tooltip key={index} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    // --- CHANGED THIS LINE ---
                    'flex items-center justify-center gap-2 rounded-lg px-1 sm:px-2 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                    pathname === item.href ? 'bg-accent' : 'bg-transparent'
                  )}
                >
                  <item.icon className='h-4 w-4 text-primary' />
                  <span className='sr-only'>{item.name}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side='right'>{item.name}</TooltipContent>
            </Tooltip>
          )
        })}
      </nav>
    </TooltipProvider>
  )
}
