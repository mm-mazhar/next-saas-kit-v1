// app/(dashboard)/_components/topbar.tsx

'use client'

import { SidebarTrigger } from '@/app/(dashboard)/_components/sidebar'
import { Themetoggle } from '@/components/Themetoggle'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CREDIT_REMINDER_THRESHOLD, type PlanId } from '@/lib/constants'
import {
  Bell,
  ChartNoAxesCombined,
  CreditCard,
  Database,
  FileText,
  Home,
  Settings,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

export function TopBar({
  usageInfo,
  subscriptionStatus,
}: {
  usageInfo?: {
    creditsUsed: number
    creditsTotal: number
    renewalDate?: number | null
    currentPlanId?: PlanId | null
    exhausted?: boolean
  }
  subscriptionStatus?: string | null
}) {
  const pathname = usePathname()
  const parts = pathname.split('/').filter(Boolean)
  const startIndex = Math.max(parts.indexOf('dashboard'), 0)
  const trail = parts.slice(startIndex)
  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    data: 'Data',
    documents: 'Documents',
    settings: 'Settings',
    billing: 'Billing',
  }
  const icons: Record<string, React.ElementType> = {
    dashboard: ChartNoAxesCombined,
    data: Database,
    documents: FileText,
    settings: Settings,
    billing: CreditCard,
  }

  let acc = ''
  const crumbElements: React.ReactNode[] = []
  trail.forEach((seg, idx) => {
    acc += `/${seg}`
    const isLast = idx === trail.length - 1
    const label = labels[seg] ?? seg
    const Icon = icons[seg]
    if (idx > 0) {
      crumbElements.push(<BreadcrumbSeparator key={`sep-${idx}`} />)
    }
    crumbElements.push(
      <BreadcrumbItem key={`item-${acc}`}>
        {isLast ? (
          <BreadcrumbPage className='flex items-center gap-1.5'>
            {Icon && <Icon className='size-3.5' />}
            {label}
          </BreadcrumbPage>
        ) : (
          <BreadcrumbLink href={acc} className='flex items-center gap-1.5'>
            {Icon && <Icon className='size-3.5' />}
            {label}
          </BreadcrumbLink>
        )}
      </BreadcrumbItem>
    )
  })

  return (
    <header className='flex h-16 shrink-0 items-center justify-between px-4 md:px-12 border-b'>
      <div className='flex items-center gap-2'>
        <SidebarTrigger className='-ml-1' />
        <Separator
          orientation='vertical'
          className='mr-2 data-[orientation=vertical]:h-4'
        />
        <Breadcrumb>
          <BreadcrumbList className='text-sm h-10 items-center'>
            <BreadcrumbItem>
              <BreadcrumbLink href='/' className='flex items-center gap-1.5'>
                <Home className='size-3.5' />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            {trail.length > 0 && <BreadcrumbSeparator />}
            {crumbElements}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className='flex items-center gap-2'>
        {subscriptionStatus && (
          <Badge className='h-8 px-3 text-sm font-medium leading-none'>
            {subscriptionStatus === 'active' ? 'Pro' : `Pro: ${subscriptionStatus}`}
          </Badge>
        )}
        {usageInfo && (
          <span className='inline-flex items-center h-8 px-1 rounded-md bg-primary text-primary-foreground font-medium text-sm border leading-none'>
            Credits: {usageInfo.creditsUsed ?? 0}
          </span>
        )}
        {usageInfo?.creditsUsed === 0 ? (
          <Link href='/dashboard/billing' className='inline-flex items-center h-8 px-3 rounded-md bg-primary text-primary-foreground font-medium text-sm border border-primary leading-none'>
            Buy Credits or Upgrade to Pro
          </Link>
        ) : null}
        {usageInfo ? (
          <Tooltip>
            <TooltipTrigger asChild>
              {(() => {
                const remaining = usageInfo.creditsUsed ?? 0
                const showNotification = usageInfo.exhausted || (remaining <= CREDIT_REMINDER_THRESHOLD)
                let tooltipText = `Credits: ${remaining}`
                if (usageInfo.exhausted || remaining === 0) {
                  tooltipText = 'Buy Credits'
                } else if (remaining <= CREDIT_REMINDER_THRESHOLD) {
                  tooltipText = 'Low Credits'
                }
                return (
                  <a
                    href='/dashboard/billing'
                    aria-label='Notifications'
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-medium text-sm border border-primary leading-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0${showNotification ? ' relative after:content-[""] after:absolute after:-top-0.5 after:-right-0.5 after:size-2 after:rounded-full after:bg-destructive' : ''}`}
                    data-tooltip-text={tooltipText}
                  >
                    <Bell className='size-4' />
                  </a>
                )
              })()}
            </TooltipTrigger>
            {(() => {
              const remaining = usageInfo.creditsUsed ?? 0
              let tooltipText = `Credits: ${remaining}`
              if (usageInfo.exhausted || remaining === 0) {
                tooltipText = 'Buy Credits'
              } else if (remaining <= CREDIT_REMINDER_THRESHOLD) {
                tooltipText = 'Low Credits'
              }
              return <TooltipContent sideOffset={8}>{tooltipText}</TooltipContent>
            })()}
          </Tooltip>
        ) : null}
        <Themetoggle />
      </div>
    </header>
  )
}
